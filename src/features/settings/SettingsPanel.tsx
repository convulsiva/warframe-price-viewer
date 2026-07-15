import { Minimize2 } from "lucide-react";
import { useSettingsStore } from "./store";

export function SettingsPanel() {
  const closeToTray = useSettingsStore((state) => state.closeToTray);
  const setCloseToTray = useSettingsStore((state) => state.setCloseToTray);

  return (
    <section className="settings-panel">
      <h2>
        <Minimize2 size={18} aria-hidden="true" /> Settings
      </h2>
      <label className="toggle-row">
        <span>
          <strong>Close to tray</strong>
          <small>Keep alerts running after closing the window.</small>
        </span>
        <input type="checkbox" checked={closeToTray} onChange={(event) => setCloseToTray(event.target.checked)} />
      </label>
    </section>
  );
}
