use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use base64::{engine::general_purpose, Engine as _};
use chrono::{DateTime, TimeDelta, Utc};
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use notify_rust::NotificationResponse;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconEvent},
    AppHandle, Manager, WindowEvent,
};

const WARFRAME_MARKET_API_BASE: &str = "https://api.warframe.market/v2";
const REQUEST_TIMEOUT_SECS: u64 = 15;
const LICENSE_PREFIX: &str = "WFM1";
const LICENSE_PUBLIC_KEY: &str = include_str!("../license-public-key.txt");

struct AppState {
    close_to_tray: AtomicBool,
}

#[derive(Clone, Debug, Deserialize)]
struct LicensePayload {
    version: u8,
    license_id: String,
    customer: String,
    issued_at: String,
    expires_at: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct LicenseDetails {
    license_id: String,
    customer: String,
    issued_at: String,
    expires_at: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct LicenseVerification {
    status: &'static str,
    details: LicenseDetails,
}

#[tauri::command]
fn verify_license(license_key: String) -> Result<LicenseVerification, String> {
    let public_key = decode_license_public_key()?;
    verify_license_at(&license_key, &public_key, Utc::now())
}

fn decode_license_public_key() -> Result<VerifyingKey, String> {
    let bytes = general_purpose::STANDARD
        .decode(LICENSE_PUBLIC_KEY.trim())
        .map_err(|_| "License configuration is invalid".to_string())?;
    let bytes: [u8; 32] = bytes
        .try_into()
        .map_err(|_| "License configuration is invalid".to_string())?;
    VerifyingKey::from_bytes(&bytes).map_err(|_| "License configuration is invalid".to_string())
}

fn verify_license_at(
    license_key: &str,
    public_key: &VerifyingKey,
    now: DateTime<Utc>,
) -> Result<LicenseVerification, String> {
    let parts: Vec<&str> = license_key.trim().split('.').collect();
    if parts.len() != 3 || parts[0] != LICENSE_PREFIX {
        return Err("Invalid license key format".to_string());
    }

    let payload_bytes = general_purpose::URL_SAFE_NO_PAD
        .decode(parts[1])
        .map_err(|_| "Invalid license key format".to_string())?;
    let signature_bytes = general_purpose::URL_SAFE_NO_PAD
        .decode(parts[2])
        .map_err(|_| "Invalid license key format".to_string())?;
    let signature = Signature::from_slice(&signature_bytes)
        .map_err(|_| "Invalid license signature".to_string())?;
    let signed_message = format!("{LICENSE_PREFIX}.{}", parts[1]);

    public_key
        .verify(signed_message.as_bytes(), &signature)
        .map_err(|_| "This license key is not valid".to_string())?;

    let payload: LicensePayload =
        serde_json::from_slice(&payload_bytes).map_err(|_| "Invalid license data".to_string())?;
    if payload.version != 1
        || payload.license_id.trim().is_empty()
        || payload.customer.trim().is_empty()
    {
        return Err("Invalid license data".to_string());
    }

    let issued_at = DateTime::parse_from_rfc3339(&payload.issued_at)
        .map_err(|_| "Invalid license issue date".to_string())?
        .with_timezone(&Utc);
    if issued_at > now + TimeDelta::minutes(5) {
        return Err("License issue date is in the future".to_string());
    }

    let expired = match payload.expires_at.as_deref() {
        Some(expires_at) => {
            let expires_at = DateTime::parse_from_rfc3339(expires_at)
                .map_err(|_| "Invalid license expiration date".to_string())?
                .with_timezone(&Utc);
            now >= expires_at
        }
        None => false,
    };

    Ok(LicenseVerification {
        status: if expired { "expired" } else { "valid" },
        details: LicenseDetails {
            license_id: payload.license_id,
            customer: payload.customer,
            issued_at: payload.issued_at,
            expires_at: payload.expires_at,
        },
    })
}

#[tauri::command]
async fn fetch_warframe_market(path: String, proxy_url: Option<String>) -> Result<Value, String> {
    if !path.starts_with('/') || path.contains("..") || path.contains('\\') {
        return Err("Invalid API path".to_string());
    }

    let url = format!("{WARFRAME_MARKET_API_BASE}{path}");
    let client = build_http_client(proxy_url.as_deref())?;
    let response = client
        .get(url)
        .header("Accept", "application/json")
        .header("language", "en")
        .header("platform", "pc")
        .header("crossplay", "true")
        .send()
        .await
        .map_err(|error| format!("Network error: {error}"))?;

    let status = response.status();
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(format!("HTTP {}: {}", status.as_u16(), body));
    }

    response
        .json::<Value>()
        .await
        .map_err(|error| format!("Invalid JSON: {error}"))
}

#[tauri::command]
async fn test_proxy(proxy_url: String) -> Result<(), String> {
    let proxy_url = proxy_url.trim();
    if proxy_url.is_empty() {
        return Err("Enter an HTTP/HTTPS proxy URL first".to_string());
    }

    let client = build_http_client(Some(proxy_url))?;
    let response = client
        .get(format!("{WARFRAME_MARKET_API_BASE}/items"))
        .header("Accept", "application/json")
        .header("language", "en")
        .header("platform", "pc")
        .header("crossplay", "true")
        .send()
        .await
        .map_err(|error| format!("Proxy test failed: {error}"))?;

    if response.status().is_success() {
        Ok(())
    } else {
        Err(format!(
            "Proxy test failed with HTTP {}",
            response.status().as_u16()
        ))
    }
}

fn build_http_client(proxy_url: Option<&str>) -> Result<reqwest::Client, String> {
    let mut builder = reqwest::Client::builder().timeout(Duration::from_secs(REQUEST_TIMEOUT_SECS));

    if let Some(proxy_url) = proxy_url.map(str::trim).filter(|value| !value.is_empty()) {
        let proxy_url = normalize_proxy_url(proxy_url)?;
        validate_proxy_url(&proxy_url)?;
        let proxy =
            reqwest::Proxy::all(&proxy_url).map_err(|error| format!("Invalid proxy: {error}"))?;
        builder = builder.proxy(proxy);
    }

    builder
        .build()
        .map_err(|error| format!("HTTP client failed: {error}"))
}

fn normalize_proxy_url(proxy_url: &str) -> Result<String, String> {
    let proxy_url = proxy_url.trim();
    if proxy_url.starts_with("http://") || proxy_url.starts_with("https://") {
        return Ok(proxy_url.to_string());
    }

    let parts: Vec<&str> = proxy_url.split(':').collect();
    if parts.len() == 2 {
        return Ok(format!("http://{}:{}", parts[0], parts[1]));
    }

    if parts.len() == 4 {
        let host = parts[0].trim();
        let port = parts[1].trim();
        let username = parts[2].trim();
        let password = parts[3].trim();
        if host.is_empty() || port.is_empty() || username.is_empty() || password.is_empty() {
            return Err("Proxy shorthand must be host:port:user:password".to_string());
        }
        return Ok(format!("http://{username}:{password}@{host}:{port}"));
    }

    Err("Use http://user:password@host:port or host:port:user:password".to_string())
}

fn validate_proxy_url(proxy_url: &str) -> Result<(), String> {
    let parsed =
        url::Url::parse(proxy_url).map_err(|error| format!("Invalid proxy URL: {error}"))?;
    match parsed.scheme() {
        "http" | "https" => {}
        _ => return Err("Only HTTP/HTTPS proxies are supported".to_string()),
    }

    if parsed.host_str().is_none() {
        return Err("Proxy URL must include host".to_string());
    }

    Ok(())
}

#[tauri::command]
fn write_clipboard_text(text: String) -> Result<(), String> {
    write_text_to_clipboard(&text)
}

#[tauri::command]
fn set_close_to_tray_enabled(state: tauri::State<AppState>, enabled: bool) {
    state.close_to_tray.store(enabled, Ordering::Relaxed);
}

#[tauri::command]
fn send_price_alert_notification(
    app: AppHandle,
    title: String,
    body: String,
    whisper_command: String,
) -> Result<(), String> {
    let identifier = app.config().identifier.clone();
    let product_name = app
        .config()
        .product_name
        .clone()
        .unwrap_or_else(|| "WFMarketTracker".to_string());

    #[cfg(target_os = "macos")]
    {
        let _ = notify_rust::set_application(if tauri::is_dev() {
            "com.apple.Terminal"
        } else {
            &identifier
        });
    }

    let mut notification = notify_rust::Notification::new();
    notification
        .appname(&product_name)
        .summary(&title)
        .body(&body)
        .action("copy-whisper", "Copy whisper");

    #[cfg(target_os = "windows")]
    {
        notification.app_id(&identifier);
    }

    let handle = notification
        .show()
        .map_err(|error| format!("Notification failed: {error}"))?;

    tauri::async_runtime::spawn_blocking(move || {
        let command = whisper_command;
        let app_handle = app.clone();
        let _ = handle.wait_for_response(|response: &NotificationResponse| {
            let should_copy = matches!(
                response,
                NotificationResponse::Default
                    | NotificationResponse::Action(_)
                    | NotificationResponse::Reply(_)
            );

            if should_copy {
                let _ = write_text_to_clipboard(&command);
                show_main_window(&app_handle);
            }
        });
    });

    Ok(())
}

fn write_text_to_clipboard(text: &str) -> Result<(), String> {
    let mut clipboard =
        arboard::Clipboard::new().map_err(|error| format!("Clipboard unavailable: {error}"))?;
    clipboard
        .set_text(text.to_string())
        .map_err(|error| format!("Clipboard write failed: {error}"))
}

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            close_to_tray: AtomicBool::new(true),
        })
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let state = window.state::<AppState>();
                if state.close_to_tray.load(Ordering::Relaxed) {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .setup(|app| {
            let handle = app.handle().clone();
            handle.on_tray_icon_event(move |app, event| match event {
                TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                }
                | TrayIconEvent::DoubleClick {
                    button: MouseButton::Left,
                    ..
                } => {
                    show_main_window(app);
                }
                _ => {}
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            verify_license,
            fetch_warframe_market,
            test_proxy,
            write_clipboard_text,
            set_close_to_tray_enabled,
            send_price_alert_notification
        ])
        .run(tauri::generate_context!())
        .expect("error while running WFMarketTracker");
}

#[cfg(test)]
mod tests {
    use super::{normalize_proxy_url, verify_license_at, LICENSE_PREFIX};
    use base64::{engine::general_purpose, Engine as _};
    use chrono::{TimeDelta, Utc};
    use ed25519_dalek::{Signer, SigningKey};

    fn signed_license(expires_at: Option<String>) -> (String, ed25519_dalek::VerifyingKey) {
        let signing_key = SigningKey::from_bytes(&[7_u8; 32]);
        let payload = serde_json::json!({
            "version": 1,
            "license_id": "WFM-TEST",
            "customer": "test@example.com",
            "issued_at": "2026-01-01T00:00:00.000Z",
            "expires_at": expires_at
        });
        let payload = general_purpose::URL_SAFE_NO_PAD.encode(payload.to_string());
        let message = format!("{LICENSE_PREFIX}.{payload}");
        let signature = signing_key.sign(message.as_bytes());
        let signature = general_purpose::URL_SAFE_NO_PAD.encode(signature.to_bytes());
        (
            format!("{message}.{signature}"),
            signing_key.verifying_key(),
        )
    }

    #[test]
    fn accepts_a_valid_lifetime_license() {
        let (license, public_key) = signed_license(None);
        let result = verify_license_at(&license, &public_key, Utc::now()).unwrap();
        assert_eq!(result.status, "valid");
        assert_eq!(result.details.license_id, "WFM-TEST");
    }

    #[test]
    fn reports_an_expired_license() {
        let (license, public_key) =
            signed_license(Some((Utc::now() - TimeDelta::days(1)).to_rfc3339()));
        let result = verify_license_at(&license, &public_key, Utc::now()).unwrap();
        assert_eq!(result.status, "expired");
    }

    #[test]
    fn rejects_a_modified_license() {
        let (mut license, public_key) = signed_license(None);
        license.push('x');
        assert!(verify_license_at(&license, &public_key, Utc::now()).is_err());
    }

    #[test]
    fn keeps_full_http_proxy_url() {
        assert_eq!(
            normalize_proxy_url("http://user:password@host:1234").unwrap(),
            "http://user:password@host:1234"
        );
    }

    #[test]
    fn converts_host_port_user_password_proxy_shorthand() {
        assert_eq!(
            normalize_proxy_url("45.11.124.145:9649:pC28RK:rBJQxL").unwrap(),
            "http://pC28RK:rBJQxL@45.11.124.145:9649"
        );
    }

    #[test]
    fn converts_host_port_proxy_shorthand() {
        assert_eq!(
            normalize_proxy_url("45.11.124.145:9649").unwrap(),
            "http://45.11.124.145:9649"
        );
    }
}
