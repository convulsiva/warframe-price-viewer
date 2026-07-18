import { Coins, ExternalLink, Home, RefreshCw, Star, WifiOff } from "lucide-react";
import { useMemo, useState } from "react";
import { isApiError, messageForError } from "./api/errors";
import { useItemDetailQuery, useItemsQuery, useOrdersQuery, useTopOrdersQuery } from "./api/warframeMarket";
import type { MarketItem } from "./domain/models";
import { defaultFilters, filterOrders, sortOrders, summarizeOrders } from "./domain/market";
import { LibraryPanel } from "./features/library/LibraryPanel";
import { useFavoritePriceAlerts } from "./features/library/priceAlerts";
import { useLibraryStore } from "./features/library/store";
import { MetricCard } from "./features/market/MetricCard";
import { OrderFilters } from "./features/market/OrderFilters";
import { OrderList } from "./features/market/OrderList";
import { ItemSearch } from "./features/search/ItemSearch";
import { SettingsMenu } from "./features/settings/SettingsPanel";
import { UpdateDialog } from "./features/settings/UpdateDialog";
import { useAppUpdater } from "./features/settings/useAppUpdater";
import { useCloseToTray } from "./features/settings/useCloseToTray";
import { useTheme } from "./features/settings/useTheme";
import { useSettingsStore } from "./features/settings/store";
import { formatPercent, formatPlatinum, formatRelative } from "./lib/format";
import { useOnlineStatus } from "./lib/hooks";
import { openExternalUrl } from "./lib/openExternal";

export function App() {
  const online = useOnlineStatus();
  const updater = useAppUpdater();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [filters, setFilters] = useState(defaultFilters);
  const itemsQuery = useItemsQuery();
  const selectedFromManifest = itemsQuery.data?.find((item) => item.slug === selectedSlug) ?? null;
  const itemQuery = useItemDetailQuery(selectedSlug);
  const item = itemQuery.data ?? selectedFromManifest;
  const topOrdersQuery = useTopOrdersQuery(selectedSlug, online);
  const ordersQuery = useOrdersQuery(selectedSlug, online);
  const addRecent = useLibraryStore((state) => state.addRecent);
  const addFavorite = useLibraryStore((state) => state.addFavorite);
  const removeFavorite = useLibraryStore((state) => state.removeFavorite);
  const favorites = useLibraryStore((state) => state.favorites);
  const recents = useLibraryStore((state) => state.recents);
  const notificationsEnabled = useSettingsStore((state) => state.notificationsEnabled);
  const isFavorite = useLibraryStore((state) => (selectedSlug ? state.isFavorite(selectedSlug) : false));
  useCloseToTray();
  useTheme();
  useFavoritePriceAlerts(favorites, online, notificationsEnabled);

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

  function selectItem(itemToSelect: MarketItem) {
    setSelectedSlug(itemToSelect.slug);
    setFilters(defaultFilters);
    addRecent(itemToSelect);
  }

  function openSlug(slug: string) {
    const manifestItem = itemsQuery.data?.find((entry) => entry.slug === slug);
    setSelectedSlug(slug);
    setFilters(defaultFilters);
    if (manifestItem) addRecent(manifestItem);
  }

  function goHome() {
    setSelectedSlug(null);
    setFilters(defaultFilters);
  }

  return (
    <main className="app-shell">
      <section className="top-band">
        <div>
          <p className="eyebrow">WFMarketTracker</p>
          <h1>Price console</h1>
        </div>
        <div className="top-actions">
          <SettingsMenu updater={updater} />
          <button type="button" className="ghost-button" onClick={goHome}>
            <Home size={17} aria-hidden="true" />
            Home
          </button>
          <div className={online ? "connection online" : "connection offline"}>
            {!online && <WifiOff size={16} aria-hidden="true" />}
            {online ? "Online" : "Offline"}
          </div>
        </div>
      </section>

      <div className="layout">
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
                    <p>{item.description ?? "Tradable item"}</p>
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
                      <span>Ducats</span>
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
                      {isFavorite ? "Saved" : "Save"}
                    </button>
                    <button
                      type="button"
                      className={isRefetching ? "icon-button is-refetching" : "icon-button"}
                      aria-label={isRefetching ? "Refreshing orders" : "Refresh orders"}
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
                      aria-label="Open on warframe.market"
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
                <MetricCard label="Lowest online seller" value={formatPlatinum(sells[0]?.platinum ?? summary.minSell)} tone="cyan" />
                <MetricCard label="Max buy" value={formatPlatinum(summary.maxBuy)} tone="gold" />
                <MetricCard label="Spread" value={formatPlatinum(summary.spread)} tone="muted" />
                <MetricCard label="Spread %" value={formatPercent(summary.spreadPercent)} tone="muted" />
                <MetricCard label="Median sell" value={formatPlatinum(summary.medianSell)} tone="cyan" />
                <MetricCard label="Filtered offers" value={String(filtered.length)} tone="gold" />
              </div>

              <div className="status-line">
                <span>Last update: {formatRelative(summary.lastUpdatedAt)}</span>
                <span>Auto-refresh: every 5s</span>
                <span>Default: online sellers, lowest price first</span>
                <span>Cross Play and platform are filterable when present</span>
                {hasCachedOrders && <span>Using cached data</span>}
              </div>

              {isLoadingOrders && <Skeleton />}
              {orderError && !hasCachedOrders && (
                <StateBanner tone={isApiError(orderError) && orderError.kind === "rate-limit" ? "warning" : "danger"} text={messageForError(orderError)} />
              )}
              {!online && <StateBanner tone="warning" text="Internet connection is offline. Cached data remains visible." />}
              {!isLoadingOrders && orders.length === 0 && <StateBanner tone="muted" text="No active orders are available for this item." />}

              <OrderFilters orders={orders} filters={filters} onChange={setFilters} />
              <div className="orders-grid">
                {filters.type !== "buy" && <OrderList title={`Best sellers (${sells.length})`} orders={sells} itemName={item.name} />}
                {filters.type !== "sell" && <OrderList title={`Best buyers (${buys.length})`} orders={buys} itemName={item.name} />}
              </div>
            </section>
          )}
        </section>
        <LibraryPanel onOpen={openSlug} selected={item ?? null} />
      </div>
      <p className="creator-mark">created by convulsiva &lt;3</p>
      <UpdateDialog updater={updater} />
    </main>
  );
}

function MainMenu({ favoriteCount, recentCount, watchedCount }: { favoriteCount: number; recentCount: number; watchedCount: number }) {
  return (
    <section className="initial-state">
      <div>
        <p className="eyebrow">Main menu</p>
        <h2>Search an item or continue from your library.</h2>
        <p>Favorites with price targets keep monitoring in the background while the app is running.</p>
      </div>
      <div className="menu-grid">
        <div>
          <strong>{favoriteCount}</strong>
          <span>favorites</span>
        </div>
        <div>
          <strong>{watchedCount}</strong>
          <span>watched alerts</span>
        </div>
        <div>
          <strong>{recentCount}</strong>
          <span>recent items</span>
        </div>
      </div>
    </section>
  );
}

function Skeleton() {
  return (
    <div className="skeleton-grid" aria-label="Loading orders">
      {Array.from({ length: 6 }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

function StateBanner({ text, tone }: { text: string; tone: "danger" | "warning" | "muted" }) {
  return <div className={`state-banner ${tone}`}>{text}</div>;
}
