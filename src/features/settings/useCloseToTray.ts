import { useEffect, useRef } from "react";
import { useSettingsStore } from "./store";

function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

export function useCloseToTray() {
  const closeToTray = useSettingsStore((state) => state.closeToTray);
  const closeToTrayRef = useRef(closeToTray);

  useEffect(() => {
    closeToTrayRef.current = closeToTray;
  }, [closeToTray]);

  useEffect(() => {
    if (!isTauriRuntime()) return undefined;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    async function setup() {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      if (disposed) return;

      const appWindow = getCurrentWindow();
      const unlisten = await appWindow.onCloseRequested((event) => {
        if (!closeToTrayRef.current) return;
        event.preventDefault();
        void appWindow.hide();
      });

      cleanup = unlisten;
    }

    void setup();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);
}
