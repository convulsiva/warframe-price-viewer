import { invoke } from "@tauri-apps/api/core";
import { Minimize2 } from "lucide-react";
import { useState } from "react";
import { useSettingsStore } from "./store";

type ProxyTestState = "idle" | "testing" | "success" | "error";

export function SettingsPanel() {
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

export function SettingsMenu() {
  const closeToTray = useSettingsStore((state) => state.closeToTray);
  const setCloseToTray = useSettingsStore((state) => state.setCloseToTray);
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const proxySettings = useProxySettings();

  return (
    <details className="settings-menu">
      <summary>
        <Minimize2 size={16} aria-hidden="true" />
        Settings
      </summary>
      <div className="settings-menu-panel">
        <label className="toggle-row">
          <span>
            <strong>Close to tray</strong>
            <small>Keep alerts running after closing the window.</small>
          </span>
          <input type="checkbox" checked={closeToTray} onChange={(event) => setCloseToTray(event.target.checked)} />
        </label>
        <ThemeToggle enabled={theme === "light"} onChange={(enabled) => setTheme(enabled ? "light" : "dark")} />
        <ProxySettings settings={proxySettings} />
      </div>
    </details>
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
