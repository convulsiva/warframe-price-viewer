import { CircleHelp, Home, KeyRound, Languages, Moon, PanelLeftClose, PanelLeftOpen, Settings, Star, Sun } from "lucide-react";
import type { AppLanguage } from "../lib/i18n";
import { useI18n } from "../lib/i18n";
import { BrandLogo } from "./BrandLogo";

export type NavigationView = "home" | "favorites" | "settings" | "license" | "about";

export function AppSidebar({
  active,
  collapsed,
  favoriteCount,
  isLightTheme,
  language,
  onNavigate,
  onLanguageChange,
  onThemeChange,
  onToggle,
  online
}: {
  active: NavigationView;
  collapsed: boolean;
  favoriteCount: number;
  isLightTheme: boolean;
  language: AppLanguage;
  onNavigate: (view: NavigationView) => void;
  onLanguageChange: (language: AppLanguage) => void;
  onThemeChange: (light: boolean) => void;
  onToggle: () => void;
  online: boolean;
}) {
  const { t } = useI18n();
  const items = [
    { id: "home" as const, label: t("home"), icon: Home },
    { id: "favorites" as const, label: t("favorites"), icon: Star, count: favoriteCount },
    { id: "settings" as const, label: t("settings"), icon: Settings },
    { id: "license" as const, label: t("license"), icon: KeyRound },
    { id: "about" as const, label: t("about"), icon: CircleHelp }
  ];

  return (
    <aside className={collapsed ? "app-sidebar is-collapsed" : "app-sidebar"}>
      <div className="sidebar-brand">
        <span className="brand-mark"><BrandLogo /></span>
        <span className="brand-copy">
          <strong>WFMarket</strong>
          <small>Tracker</small>
        </span>
      </div>
      <nav className="sidebar-nav" aria-label={t("mainNavigation")}>
        {items.map(({ id, label, icon: Icon, count }) => (
          <button
            type="button"
            className={active === id ? "sidebar-link is-active" : "sidebar-link"}
            aria-current={active === id ? "page" : undefined}
            aria-label={label}
            title={collapsed ? label : undefined}
            key={id}
            onClick={() => onNavigate(id)}
          >
            <Icon size={19} aria-hidden="true" />
            <span>{label}</span>
            {count !== undefined && count > 0 && <small>{count}</small>}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-status" title={online ? t("marketConnectionOnline") : t("marketConnectionOffline")}>
          <i className={online ? "is-online" : ""} />
          <span>{online ? t("marketOnline") : t("offline")}</span>
        </div>
        <label className="sidebar-theme" title={isLightTheme ? t("useDarkTheme") : t("useLightTheme")}>
          {isLightTheme ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
          <span>{isLightTheme ? t("lightTheme") : t("darkTheme")}</span>
          <input type="checkbox" aria-label={t("lightTheme")} checked={isLightTheme} onChange={(event) => onThemeChange(event.target.checked)} />
        </label>
        <div className="sidebar-language" title={t("language")}>
          <Languages size={17} aria-hidden="true" />
          <span>{t("language")}</span>
          <div className="language-segmented" role="group" aria-label={t("language")}>
            <button type="button" className={language === "en" ? "is-active" : ""} aria-pressed={language === "en"} onClick={() => onLanguageChange("en")}>{t("english")}</button>
            <button type="button" className={language === "ru" ? "is-active" : ""} aria-pressed={language === "ru"} onClick={() => onLanguageChange("ru")}>{t("russian")}</button>
          </div>
        </div>
        <button className="sidebar-collapse" type="button" aria-label={collapsed ? t("expandNavigation") : t("collapseNavigation")} onClick={onToggle}>
          {collapsed ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}
          <span>{t("collapse")}</span>
        </button>
        <p className="sidebar-credit">{t("createdBy")} <strong>convulsiva &lt;3</strong></p>
      </div>
    </aside>
  );
}
