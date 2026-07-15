import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";
import { useSettingsStore } from "./store";

function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

export function useCloseToTray() {
  const closeToTray = useSettingsStore((state) => state.closeToTray);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    void invoke("set_close_to_tray_enabled", { enabled: closeToTray });
  }, [closeToTray]);
}
