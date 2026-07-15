import { invoke } from "@tauri-apps/api/core";

export async function writeClipboardText(text: string): Promise<void> {
  if ("__TAURI_INTERNALS__" in window) {
    await invoke("write_clipboard_text", { text });
    return;
  }

  await navigator.clipboard.writeText(text);
}
