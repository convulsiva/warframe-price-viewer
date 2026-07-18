use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use notify_rust::NotificationResponse;
use serde_json::Value;
use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconEvent},
    AppHandle, Manager, WindowEvent,
};

const WARFRAME_MARKET_API_BASE: &str = "https://api.warframe.market/v2";
const REQUEST_TIMEOUT_SECS: u64 = 15;

struct AppState {
    close_to_tray: AtomicBool,
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
        Err(format!("Proxy test failed with HTTP {}", response.status().as_u16()))
    }
}

fn build_http_client(proxy_url: Option<&str>) -> Result<reqwest::Client, String> {
    let mut builder = reqwest::Client::builder().timeout(Duration::from_secs(REQUEST_TIMEOUT_SECS));

    if let Some(proxy_url) = proxy_url.map(str::trim).filter(|value| !value.is_empty()) {
        let proxy_url = normalize_proxy_url(proxy_url)?;
        validate_proxy_url(&proxy_url)?;
        let proxy = reqwest::Proxy::all(&proxy_url).map_err(|error| format!("Invalid proxy: {error}"))?;
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
    let parsed = url::Url::parse(proxy_url).map_err(|error| format!("Invalid proxy URL: {error}"))?;
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
        .unwrap_or_else(|| "Warframe Price Viewer".to_string());

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
            fetch_warframe_market,
            test_proxy,
            write_clipboard_text,
            set_close_to_tray_enabled,
            send_price_alert_notification
        ])
        .run(tauri::generate_context!())
        .expect("error while running Warframe Price Viewer");
}

#[cfg(test)]
mod tests {
    use super::normalize_proxy_url;

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
