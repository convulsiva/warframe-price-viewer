import { invoke } from "@tauri-apps/api/core";
import { Download, Minimize2, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSettingsStore } from "./store";
import type { AppUpdater } from "./useAppUpdater";

type ProxyTestState = "idle" | "testing" | "success" | "error";

export function SettingsPanel() {
  const notificationsEnabled = useSettingsStore((state) => state.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((state) => state.setNotificationsEnabled);
  const closeToTray = useSettingsStore((state) => state.closeToTray);
  const setCloseToTray = useSettingsStore((state) => state.setCloseToTray);
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const proxySettings = useProxySettings();

  return (
    <section className="settings-panel">
      <h2>
        <Minimize2 size={18} aria-hidden="true" /> Settings
      </h2>
      <NotificationsToggle enabled={notificationsEnabled} onChange={setNotificationsEnabled} />
      <label className="toggle-row">
        <span>
          <strong>Close to tray</strong>
          <small>Keep alerts running after closing the window.</small>
        </span>
        <input type="checkbox" checked={closeToTray} onChange={(event) => setCloseToTray(event.target.checked)} />
      </label>
      <ThemeToggle enabled={theme === "light"} onChange={(enabled) => setTheme(enabled ? "light" : "dark")} />
      <ProxySettings settings={proxySettings} />
    </section>
  );
}

export function SettingsMenu({ updater }: { updater: AppUpdater }) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const notificationsEnabled = useSettingsStore((state) => state.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((state) => state.setNotificationsEnabled);
  const closeToTray = useSettingsStore((state) => state.closeToTray);
  const setCloseToTray = useSettingsStore((state) => state.setCloseToTray);
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const proxySettings = useProxySettings();

  useEffect(() => {
    function closeWhenClickingOutside(event: PointerEvent) {
      const menu = menuRef.current;
      if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) {
        menu.removeAttribute("open");
      }
    }

    document.addEventListener("pointerdown", closeWhenClickingOutside);
    return () => document.removeEventListener("pointerdown", closeWhenClickingOutside);
  }, []);

  return (
    <details className="settings-menu" ref={menuRef}>
      <summary>
        <Minimize2 size={16} aria-hidden="true" />
        Settings
      </summary>
      <div className="settings-menu-panel">
        <NotificationsToggle enabled={notificationsEnabled} onChange={setNotificationsEnabled} />
        <label className="toggle-row">
          <span>
            <strong>Close to tray</strong>
            <small>Keep alerts running after closing the window.</small>
          </span>
          <input type="checkbox" checked={closeToTray} onChange={(event) => setCloseToTray(event.target.checked)} />
        </label>
        <ThemeToggle enabled={theme === "light"} onChange={(enabled) => setTheme(enabled ? "light" : "dark")} />
        <ProxySettings settings={proxySettings} />
        <UpdaterSettings updater={updater} />
      </div>
    </details>
  );
}

function NotificationsToggle({ enabled, onChange }: { enabled: boolean; onChange: (enabled: boolean) => void }) {
  return (
    <label className="toggle-row">
      <span>
        <strong>Notifications</strong>
        <small>Allow desktop price alert notifications.</small>
      </span>
      <input
        type="checkbox"
        checked={enabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

function UpdaterSettings({ updater }: { updater: AppUpdater }) {
  const checking = updater.status === "checking";
  const available = updater.status === "available" || updater.status === "downloading" || updater.status === "installing";
  const message = available
    ? `Version ${updater.updateVersion} is ready.`
    : updater.status === "current"
      ? "No updates available."
      : updater.status === "error"
        ? updater.errorMessage
        : "Updates are checked automatically.";

  return (
    <div className="updater-settings">
      <div className="updater-settings-copy">
        <span>
          <strong>Updates</strong>
          <small>Current version: {updater.currentVersion || "Checking..."}</small>
        </span>
        <span className={updater.status === "error" ? "update-check-status error" : "update-check-status"}>{message}</span>
      </div>
      <button
        className={available ? "primary-button" : "secondary-button"}
        type="button"
        disabled={checking}
        onClick={() => available ? updater.openDialog() : void updater.checkForUpdates()}
      >
        {checking ? <RefreshCw className="spin" size={16} aria-hidden="true" /> : available ? <Download size={16} aria-hidden="true" /> : <RefreshCw size={16} aria-hidden="true" />}
        {checking ? "Checking..." : available ? "View update" : "Check for updates"}
      </button>
    </div>
  );
}

function ThemeToggle({ enabled, onChange }: { enabled: boolean; onChange: (enabled: boolean) => void }) {
  return (
    <label className="toggle-row">
      <span>
        <strong>Light theme</strong>
        <small>Use a softer bright theme for daytime trading.</small>
      </span>
      <input
        type="checkbox"
        checked={enabled}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
      />
    </label>
  );
}

function useProxySettings() {
  const useProxy = useSettingsStore((state) => state.useProxy);
  const proxyUrl = useSettingsStore((state) => state.proxyUrl);
  const setUseProxy = useSettingsStore((state) => state.setUseProxy);
  const setProxyUrl = useSettingsStore((state) => state.setProxyUrl);
  const [testState, setTestState] = useState<ProxyTestState>("idle");
  const [testMessage, setTestMessage] = useState("");

  async function testProxy() {
    const normalizedProxyUrl = proxyUrl.trim();
    if (!normalizedProxyUrl) {
      setTestState("error");
      setTestMessage("Enter proxy URL first.");
      return;
    }

    if (!isTauriRuntime()) {
      setTestState("error");
      setTestMessage("Proxy test works only in the desktop app.");
      return;
    }

    setTestState("testing");
    setTestMessage("Checking proxy...");

    try {
      await invoke("test_proxy", { proxyUrl: normalizedProxyUrl });
      setTestState("success");
      setTestMessage("Proxy works.");
    } catch (error) {
      setTestState("error");
      setTestMessage(String(error));
    }
  }

  return {
    proxyUrl,
    setProxyUrl,
    setUseProxy,
    testMessage,
    testProxy,
    testState,
    useProxy
  };
}

type ProxySettingsState = ReturnType<typeof useProxySettings>;

function ProxySettings({ settings }: { settings: ProxySettingsState }) {
  return (
    <div className="proxy-settings">
      <label className="toggle-row">
        <span>
          <strong>Use proxy</strong>
          <small>Route all market requests through HTTP/HTTPS proxy.</small>
        </span>
        <input
          type="checkbox"
          checked={settings.useProxy}
          onChange={(event) => settings.setUseProxy(event.target.checked)}
        />
      </label>
      <label className="proxy-field">
        <span>Proxy URL</span>
        <input
          type="text"
          spellCheck={false}
          placeholder="host:port:user:password"
          value={settings.proxyUrl}
          onChange={(event) => settings.setProxyUrl(event.target.value)}
        />
      </label>
      <p className="proxy-hint">
        HTTP/HTTPS proxy only. Supports http://user:password@host:port and host:port:user:password.
      </p>
      <div className="proxy-test-row">
        <button
          className="secondary-button"
          type="button"
          disabled={settings.testState === "testing"}
          onClick={() => {
            void settings.testProxy();
          }}
        >
          {settings.testState === "testing" ? "Checking..." : "Test proxy"}
        </button>
        {settings.testMessage && (
          <span className={`proxy-test-status ${settings.testState}`}>{settings.testMessage}</span>
        )}
      </div>
    </div>
  );
}

function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}
