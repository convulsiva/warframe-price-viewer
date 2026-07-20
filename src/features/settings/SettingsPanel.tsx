import { invoke } from "@tauri-apps/api/core";
import { Download, KeyRound, Minimize2, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLicenseStore } from "../license/store";
import { useSettingsStore } from "./store";
import type { AppUpdater } from "./useAppUpdater";
import { useI18n } from "../../lib/i18n";

type ProxyTestState = "idle" | "testing" | "success" | "error";

export function SettingsPanel({ updater }: { updater: AppUpdater }) {
  const { t } = useI18n();
  const notificationsEnabled = useSettingsStore((state) => state.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((state) => state.setNotificationsEnabled);
  const closeToTray = useSettingsStore((state) => state.closeToTray);
  const setCloseToTray = useSettingsStore((state) => state.setCloseToTray);
  const proxySettings = useProxySettings();

  return (
    <section className="settings-panel full-page-panel">
      <header className="full-page-header">
        <div><span className="section-kicker">{t("application")}</span><h2><Minimize2 size={20} aria-hidden="true" /> {t("settings")}</h2><p>{t("configureApp")}</p></div>
      </header>
      <NotificationsToggle enabled={notificationsEnabled} onChange={setNotificationsEnabled} />
      <label className="toggle-row">
        <span>
          <strong>{t("closeToTray")}</strong>
          <small>{t("closeToTrayHint")}</small>
        </span>
        <input type="checkbox" checked={closeToTray} onChange={(event) => setCloseToTray(event.target.checked)} />
      </label>
      <ProxySettings settings={proxySettings} />
      <UpdaterSettings updater={updater} />
    </section>
  );
}

export function LicensePanel() {
  const { language, t } = useI18n();
  const details = useLicenseStore((state) => state.details);
  const clearLicense = useLicenseStore((state) => state.clearLicense);

  return (
    <section className="license-page full-page-panel">
      <header className="full-page-header">
        <div><span className="section-kicker">{t("access")}</span><h2><KeyRound size={20} aria-hidden="true" /> {t("license")}</h2><p>{t("licensePageHint")}</p></div>
      </header>
      <div className="license-page-card">
        <KeyRound size={26} aria-hidden="true" />
        <div>
          <span>{t("currentLicense")}</span>
          <strong>{details?.expiresAt ? t("validUntil", { date: formatLicenseDate(details.expiresAt, language) }) : t("lifetimeAccess")}</strong>
          <small>{t("licenseStored")}</small>
        </div>
        <button className="secondary-button" type="button" onClick={clearLicense}>{t("replaceLicense")}</button>
      </div>
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
        <LicenseSettings />
        <ProxySettings settings={proxySettings} />
        <UpdaterSettings updater={updater} />
      </div>
    </details>
  );
}

function LicenseSettings() {
  const details = useLicenseStore((state) => state.details);
  const clearLicense = useLicenseStore((state) => state.clearLicense);
  if (!details) return null;

  return (
    <div className="license-settings">
      <div className="license-settings-copy">
        <KeyRound size={17} aria-hidden="true" />
        <span>
          <strong>License</strong>
          <small>{details.expiresAt ? `Valid until ${formatLicenseDate(details.expiresAt)}` : "Lifetime access"}</small>
        </span>
      </div>
      <button className="secondary-button" type="button" onClick={clearLicense}>
        Replace
      </button>
    </div>
  );
}

function formatLicenseDate(value: string, language: "en" | "ru" = "en"): string {
  return new Intl.DateTimeFormat(language === "ru" ? "ru-RU" : "en-US", { dateStyle: "medium" }).format(new Date(value));
}

function NotificationsToggle({ enabled, onChange }: { enabled: boolean; onChange: (enabled: boolean) => void }) {
  const { t } = useI18n();
  return (
    <label className="toggle-row">
      <span>
        <strong>{t("notifications")}</strong>
        <small>{t("notificationsHint")}</small>
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
  const { t } = useI18n();
  const checking = updater.status === "checking";
  const available = updater.status === "available" || updater.status === "downloading" || updater.status === "installing";
  const message = available
    ? t("versionReady", { version: updater.updateVersion })
    : updater.status === "current"
      ? t("noUpdates")
      : updater.status === "error"
        ? updater.errorMessage
        : t("updatesAutomatic");

  return (
    <div className="updater-settings">
      <div className="updater-settings-copy">
        <span>
          <strong>{t("updates")}</strong>
          <small>{t("currentVersion", { version: updater.currentVersion || t("checking") })}</small>
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
        {checking ? t("checking") : available ? t("viewUpdate") : t("checkUpdates")}
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
  const { t } = useI18n();
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
      setTestMessage(t("enterProxyFirst"));
      return;
    }

    if (!isTauriRuntime()) {
      setTestState("error");
      setTestMessage(t("proxyDesktopOnly"));
      return;
    }

    setTestState("testing");
    setTestMessage(t("checkingProxy"));

    try {
      await invoke("test_proxy", { proxyUrl: normalizedProxyUrl });
      setTestState("success");
      setTestMessage(t("proxyWorks"));
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
  const { t } = useI18n();
  return (
    <div className="proxy-settings">
      <label className="toggle-row">
        <span>
          <strong>{t("useProxy")}</strong>
          <small>{t("useProxyHint")}</small>
        </span>
        <input
          type="checkbox"
          checked={settings.useProxy}
          onChange={(event) => settings.setUseProxy(event.target.checked)}
        />
      </label>
      <label className="proxy-field">
        <span>{t("proxyUrl")}</span>
        <input
          type="text"
          spellCheck={false}
          placeholder="host:port:user:password"
          value={settings.proxyUrl}
          onChange={(event) => settings.setProxyUrl(event.target.value)}
        />
      </label>
      <p className="proxy-hint">
        {t("proxyHint")}
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
          {settings.testState === "testing" ? t("checking") : t("testProxy")}
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
