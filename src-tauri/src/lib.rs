use serde_json::Value;
use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconEvent},
    Manager,
};

const WARFRAME_MARKET_API_BASE: &str = "https://api.warframe.market/v2";

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
    let mut clipboard = arboard::Clipboard::new().map_err(|error| format!("Clipboard unavailable: {error}"))?;
    clipboard
        .set_text(text)
        .map_err(|error| format!("Clipboard write failed: {error}"))
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
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
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                _ => {}
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![fetch_warframe_market, write_clipboard_text])
        .run(tauri::generate_context!())
        .expect("error while running Warframe Price Viewer");
}
