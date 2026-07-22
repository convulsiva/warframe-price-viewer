import { Coins, ExternalLink, RefreshCw, Search, Star } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppSidebar, type NavigationView } from "./components/AppSidebar";
import { AboutPanel } from "./features/about/AboutPanel";
import { isApiError, messageForError } from "./api/errors";
import { useItemDetailQuery, useItemsQuery, useOrdersQuery, useTopOrdersQuery } from "./api/warframeMarket";
import type { MarketItem } from "./domain/models";
import { defaultFilters, filterOrders, sortOrders, summarizeOrders } from "./domain/market";
import { FavoritesPanel, LibraryPanel } from "./features/library/LibraryPanel";
import { useFavoritePriceAlerts } from "./features/library/priceAlerts";
import { useLibraryStore } from "./features/library/store";
import { MetricCard } from "./features/market/MetricCard";
import { PriceHistoryChart } from "./features/market/PriceHistoryChart";
import { usePriceHistoryStore } from "./features/market/historyStore";
import { OrderFilters } from "./features/market/OrderFilters";
import { OrderList } from "./features/market/OrderList";
import { ItemSearch } from "./features/search/ItemSearch";
import { LicensePanel, SettingsPanel } from "./features/settings/SettingsPanel";
import { UpdateDialog } from "./features/settings/UpdateDialog";
import { useAppUpdater } from "./features/settings/useAppUpdater";
import { useCloseToTray } from "./features/settings/useCloseToTray";
import { useTheme } from "./features/settings/useTheme";
import { useSettingsStore } from "./features/settings/store";
import { formatPercent, formatPlatinum, formatRelative } from "./lib/format";
import { useOnlineStatus } from "./lib/hooks";
import { openExternalUrl } from "./lib/openExternal";
import { config } from "./lib/config";
import { useI18n } from "./lib/i18n";

export function App() {
  const queryClient = useQueryClient();
  const online = useOnlineStatus();
  const updater = useAppUpdater();
  const { language, t } = useI18n();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [filters, setFilters] = useState(defaultFilters);
  const [navigationView, setNavigationView] = useState<NavigationView>("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const itemsQuery = useItemsQuery();
  const selectedFromManifest = itemsQuery.data?.find((item) => item.slug === selectedSlug) ?? null;
  const itemQuery = useItemDetailQuery(selectedSlug);
  const item = itemQuery.data ?? selectedFromManifest;
  const topOrdersQuery = useTopOrdersQuery(selectedSlug, online);
  const ordersQuery = useOrdersQuery(selectedSlug, online);
  const addRecent = useLibraryStore((state) => state.addRecent);
  const addFavorite = useLibraryStore((state) => state.addFavorite);
  const syncFavoriteMetadata = useLibraryStore((state) => state.syncFavoriteMetadata);
  const removeFavorite = useLibraryStore((state) => state.removeFavorite);
  const favorites = useLibraryStore((state) => state.favorites);
  const recents = useLibraryStore((state) => state.recents);
  const notificationsEnabled = useSettingsStore((state) => state.notificationsEnabled);
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const useProxy = useSettingsStore((state) => state.useProxy);
  const proxyUrl = useSettingsStore((state) => state.proxyUrl);
  const previousProxy = useRef(`${useProxy}:${proxyUrl.trim()}`);
  const recordPrice = usePriceHistoryStore((state) => state.record);
  const isFavorite = useLibraryStore((state) => (selectedSlug ? state.isFavorite(selectedSlug) : false));
  useCloseToTray();
  useTheme();
  useFavoritePriceAlerts(favorites, online, notificationsEnabled);

  useEffect(() => {
    if (!itemsQuery.data) return;
    syncFavoriteMetadata(itemsQuery.data);
  }, [itemsQuery.data, syncFavoriteMetadata]);

  useEffect(() => {
    document.documentElement.lang = language;
    void queryClient.invalidateQueries({ queryKey: ["items"] });
    if (selectedSlug) void queryClient.invalidateQueries({ queryKey: ["item", selectedSlug] });
  }, [language, queryClient, selectedSlug]);

  useEffect(() => {
    const proxy = `${useProxy}:${proxyUrl.trim()}`;
    if (proxy === previousProxy.current) return;
    previousProxy.current = proxy;
    const timer = window.setTimeout(() => {
      void queryClient.refetchQueries({ type: "active" });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [proxyUrl, queryClient, useProxy]);

  const orders = useMemo(() => {
    if (ordersQuery.data) return ordersQuery.data;
    return [...(topOrdersQuery.data?.sell ?? []), ...(topOrdersQuery.data?.buy ?? [])];
  }, [ordersQuery.data, topOrdersQuery.data]);

  const summary = useMemo(() => summarizeOrders(orders), [orders]);
  const filtered = useMemo(() => sortOrders(filterOrders(orders, filters)), [orders, filters]);
  const sells = filtered.filter((order) => order.type === "sell");
  const buys = filtered.filter((order) => order.type === "buy");
  const lowestIngameSellPrice = useMemo(
    () => sortOrders(orders.filter((order) => order.visible && order.type === "sell" && order.user?.status === "ingame"))[0]?.platinum ?? null,
    [orders]
  );
  const favoriteSummary = useMemo(
    () => ({
      ...summary,
      minSell: lowestIngameSellPrice ?? summary.minSell
    }),
    [lowestIngameSellPrice, summary]
  );
  const isLoadingOrders = topOrdersQuery.isLoading || ordersQuery.isLoading;
  const isRefetching = topOrdersQuery.isRefetching || ordersQuery.isRefetching;
  const hasCachedOrders = orders.length > 0 && (topOrdersQuery.isError || ordersQuery.isError);
  const orderError = topOrdersQuery.error ?? ordersQuery.error;

  useEffect(() => {
    if (!selectedSlug || isLoadingOrders) return;
    recordPrice(selectedSlug, config.platform, lowestIngameSellPrice ?? summary.minSell, summary.medianSell);
  }, [isLoadingOrders, lowestIngameSellPrice, recordPrice, selectedSlug, summary.medianSell, summary.minSell]);

  function selectItem(itemToSelect: MarketItem) {
    setSelectedSlug(itemToSelect.slug);
    setFilters(defaultFilters);
    addRecent(itemToSelect);
    setNavigationView("home");
  }

  function openSlug(slug: string) {
    const manifestItem = itemsQuery.data?.find((entry) => entry.slug === slug);
    setSelectedSlug(slug);
    setFilters(defaultFilters);
    if (manifestItem) addRecent(manifestItem);
    setNavigationView("home");
  }

  function goHome() {
    setSelectedSlug(null);
    setFilters(defaultFilters);
    setNavigationView("home");
  }

  function navigate(view: NavigationView) {
    if (view === "home") {
      goHome();
      return;
    }
    setNavigationView((current) => (current === view ? "home" : view));
  }

  return (
    <main className={sidebarCollapsed ? "app-shell sidebar-collapsed" : "app-shell"}>
      <AppSidebar
        active={navigationView}
        collapsed={sidebarCollapsed}
        favoriteCount={favorites.length}
        isLightTheme={theme === "light"}
        language={language}
        onNavigate={navigate}
        onLanguageChange={setLanguage}
        onThemeChange={(light) => setTheme(light ? "light" : "dark")}
        onToggle={() => setSidebarCollapsed((value) => !value)}
        online={online}
      />
      <div className="app-main">
        <header className="top-band">
          <div>
            <p className="eyebrow">{t("marketIntelligence")}</p>
            <h1>{t("priceConsole")}</h1>
          </div>
          <div className={online ? "connection online" : "connection offline"}>
            <i />{online ? t("liveMarket") : t("offline")}
          </div>
        </header>
        {navigationView === "favorites" ? (
          <div className="full-page-layout"><FavoritesPanel onOpen={openSlug} /></div>
        ) : navigationView === "settings" ? (
          <div className="full-page-layout"><SettingsPanel updater={updater} /></div>
        ) : navigationView === "license" ? (
          <div className="full-page-layout"><LicensePanel /></div>
        ) : navigationView === "about" ? (
          <div className="full-page-layout"><AboutPanel /></div>
        ) : (
        <div className="layout persistent-library-layout">
        <section className="workspace">
          <ItemSearch items={itemsQuery.data ?? []} loading={itemsQuery.isLoading} onSelect={selectItem} />
          {itemsQuery.isError && <StateBanner tone="danger" text={messageForError(itemsQuery.error)} />}
          {!selectedSlug && <MainMenu favoriteCount={favorites.length} recentCount={recents.length} watchedCount={favorites.filter((favorite) => favorite.alertDropPrice !== null || favorite.alertRisePrice !== null).length} />}
          {selectedSlug && item && (
            <section className="market-view" aria-live="polite">
              <div className="item-header">
                <div className="item-identity">
                  {item.iconUrl && <img className="item-art" src={item.iconUrl} alt="" />}
                  <div>
                    <p className="eyebrow">{item.type}</p>
                    <h2>{item.name}</h2>
                    <p>{item.description ?? t("tradableItem")}</p>
                    <div className="tag-row">
                      {item.tags.slice(0, 6).map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="item-header-tools">
                  {/\bprime\b/i.test(item.englishName) && item.ducats !== null && (
                    <div className="ducats-value" aria-label={`${item.ducats} Ducats`}>
                      <Coins size={18} aria-hidden="true" />
                      <strong>{item.ducats}</strong>
                      <span>{t("ducats")}</span>
                    </div>
                  )}
                  <div className="actions">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => (isFavorite ? removeFavorite(item.slug) : addFavorite(item, favoriteSummary))}
                      aria-pressed={isFavorite}
                    >
                      <Star size={17} aria-hidden="true" />
                      {isFavorite ? t("saved") : t("save")}
                    </button>
                    <button
                      type="button"
                      className={isRefetching ? "icon-button is-refetching" : "icon-button"}
                      aria-label={isRefetching ? t("refreshingOrders") : t("refreshOrders")}
                      onClick={() => {
                        void topOrdersQuery.refetch();
                        void ordersQuery.refetch();
                      }}
                    >
                      <RefreshCw size={18} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={t("openMarket")}
                      onClick={() => {
                        void openExternalUrl(`https://warframe.market/items/${item.slug}`);
                      }}
                    >
                      <ExternalLink size={18} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="metrics">
                <MetricCard label={t("lowestOnlineSeller")} value={formatPlatinum(sells[0]?.platinum ?? summary.minSell)} tone="cyan" />
                <MetricCard label={t("maxBuy")} value={formatPlatinum(summary.maxBuy)} tone="gold" />
                <MetricCard label={t("spread")} value={formatPlatinum(summary.spread)} tone="muted" />
                <MetricCard label={t("spreadPercent")} value={formatPercent(summary.spreadPercent)} tone="muted" />
                <MetricCard label={t("medianSell")} value={formatPlatinum(summary.medianSell)} tone="cyan" />
                <MetricCard label={t("filteredOffers")} value={String(filtered.length)} tone="gold" />
              </div>

              <div className="status-line">
                <span>{t("lastUpdate", { value: formatRelative(summary.lastUpdatedAt) })}</span>
                <span>{t("autoRefresh")}</span>
                <span>{t("defaultSort")}</span>
                <span>{t("crossPlayHint")}</span>
                {hasCachedOrders && <span>{t("usingCachedData")}</span>}
              </div>

              {isLoadingOrders && <Skeleton />}
              {orderError && !hasCachedOrders && (
                <StateBanner tone={isApiError(orderError) && orderError.kind === "rate-limit" ? "warning" : "danger"} text={messageForError(orderError)} />
              )}
              {!online && <StateBanner tone="warning" text={t("internetOffline")} />}
              {!isLoadingOrders && orders.length === 0 && <StateBanner tone="muted" text={t("noActiveOrders")} />}

              <OrderFilters orders={orders} filters={filters} onChange={setFilters} />
              <div className="orders-grid">
                {filters.type !== "buy" && <OrderList title={t("bestSellers", { count: sells.length })} orders={sells} itemName={item.englishName} />}
                {filters.type !== "sell" && <OrderList title={t("bestBuyers", { count: buys.length })} orders={buys} itemName={item.englishName} />}
              </div>
              <PriceHistoryChart slug={item.slug} />
            </section>
          )}
        </section>
        <LibraryPanel onOpen={openSlug} selected={item ?? null} view="recent" />
        </div>
        )}
      </div>
      <UpdateDialog updater={updater} />
    </main>
  );
}

function MainMenu({ favoriteCount, recentCount, watchedCount }: { favoriteCount: number; recentCount: number; watchedCount: number }) {
  const { t } = useI18n();
  return (
    <section className="initial-state">
      <div className="welcome-copy">
        <p className="eyebrow">{t("mainMenu")}</p>
        <h2>{t("welcomeTitle")}</h2>
        <p>{t("welcomeText")}</p>
      </div>
      <Search className="welcome-icon" size={64} aria-hidden="true" />
      <div className="menu-grid">
        <div>
          <strong>{favoriteCount}</strong>
          <span>{t("favorites").toLowerCase()}</span>
        </div>
        <div>
          <strong>{watchedCount}</strong>
          <span>{t("watchedAlerts")}</span>
        </div>
        <div>
          <strong>{recentCount}</strong>
          <span>{t("recentItems")}</span>
        </div>
      </div>
    </section>
  );
}

function Skeleton() {
  const { t } = useI18n();
  return (
    <div className="skeleton-grid" aria-label={t("loadingOrders")}>
      {Array.from({ length: 6 }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

function StateBanner({ text, tone }: { text: string; tone: "danger" | "warning" | "muted" }) {
  return <div className={`state-banner ${tone}`}>{text}</div>;
}
