use std::sync::atomic::{AtomicBool, Ordering};

use notify_rust::NotificationResponse;
use serde_json::Value;
use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconEvent},
    AppHandle, Manager, WindowEvent,
};

const WARFRAME_MARKET_API_BASE: &str = "https://api.warframe.market/v2";

struct AppState {
    close_to_tray: AtomicBool,
}

#[tauri::command]
async fn fetch_warframe_market(path: String) -> Result<Value, String> {
    if !path.starts_with('/') || path.contains("..") || path.contains('\\') {
        return Err("Invalid API path".to_string());
    }

    let url = format!("{WARFRAME_MARKET_API_BASE}{path}");
    let client = reqwest::Client::new();
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
            write_clipboard_text,
            set_close_to_tray_enabled,
            send_price_alert_notification
        ])
        .run(tauri::generate_context!())
        .expect("error while running Warframe Price Viewer");
}
