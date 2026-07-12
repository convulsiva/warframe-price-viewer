import { ExternalLink, RefreshCw, Star, WifiOff } from "lucide-react";
import { useMemo, useState } from "react";
import { isApiError, messageForError } from "./api/errors";
import { useItemDetailQuery, useItemsQuery, useOrdersQuery, useTopOrdersQuery } from "./api/warframeMarket";
import type { MarketItem } from "./domain/models";
import { defaultFilters, filterOrders, sortOrders, summarizeOrders } from "./domain/market";
import { LibraryPanel } from "./features/library/LibraryPanel";
import { useLibraryStore } from "./features/library/store";
import { MetricCard } from "./features/market/MetricCard";
import { OrderFilters } from "./features/market/OrderFilters";
import { OrderList } from "./features/market/OrderList";
import { ItemSearch } from "./features/search/ItemSearch";
import { formatPercent, formatPlatinum, formatRelative } from "./lib/format";
import { useOnlineStatus } from "./lib/hooks";

export function App() {
  const online = useOnlineStatus();
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
  const isFavorite = useLibraryStore((state) => (selectedSlug ? state.isFavorite(selectedSlug) : false));

  const orders = useMemo(() => {
    if (ordersQuery.data) return ordersQuery.data;
    return [...(topOrdersQuery.data?.sell ?? []), ...(topOrdersQuery.data?.buy ?? [])];
  }, [ordersQuery.data, topOrdersQuery.data]);

  const summary = useMemo(() => summarizeOrders(orders), [orders]);
  const filtered = useMemo(() => sortOrders(filterOrders(orders, filters)), [orders, filters]);
  const sells = filtered.filter((order) => order.type === "sell");
  const buys = filtered.filter((order) => order.type === "buy");
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

  return (
    <main className="app-shell">
      <section className="top-band">
        <div>
          <p className="eyebrow">Warframe market scanner</p>
          <h1>Price console</h1>
        </div>
        <div className={online ? "connection online" : "connection offline"}>
          {!online && <WifiOff size={16} aria-hidden="true" />}
          {online ? "Online" : "Offline"}
        </div>
      </section>

      <div className="layout">
        <section className="workspace">
          <ItemSearch items={itemsQuery.data ?? []} loading={itemsQuery.isLoading} onSelect={selectItem} />
          {itemsQuery.isError && <StateBanner tone="danger" text={messageForError(itemsQuery.error)} />}
          {!selectedSlug && <InitialState />}
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
                <div className="actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => (isFavorite ? removeFavorite(item.slug) : addFavorite(item, summary))}
                    aria-pressed={isFavorite}
                  >
                    <Star size={17} aria-hidden="true" />
                    {isFavorite ? "Saved" : "Save"}
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Refresh orders"
                    onClick={() => {
                      void topOrdersQuery.refetch();
                      void ordersQuery.refetch();
                    }}
                  >
                    <RefreshCw size={18} aria-hidden="true" />
                  </button>
                  <a
                    className="icon-button"
                    href={`https://warframe.market/items/${item.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Open on warframe.market"
                  >
                    <ExternalLink size={18} aria-hidden="true" />
                  </a>
                </div>
              </div>

              <div className="metrics">
                <MetricCard label="Min sell" value={formatPlatinum(summary.minSell)} tone="cyan" />
                <MetricCard label="Max buy" value={formatPlatinum(summary.maxBuy)} tone="gold" />
                <MetricCard label="Spread" value={formatPlatinum(summary.spread)} tone="muted" />
                <MetricCard label="Spread %" value={formatPercent(summary.spreadPercent)} tone="muted" />
                <MetricCard label="Median sell" value={formatPlatinum(summary.medianSell)} tone="cyan" />
                <MetricCard label="Active offers" value={String(summary.totalVisible)} tone="gold" />
              </div>

              <div className="status-line">
                <span>Last update: {formatRelative(summary.lastUpdatedAt)}</span>
                <span>Platform: mixed from API data</span>
                <span>Cross Play: filterable when present</span>
                {isRefetching && <span>Refreshing...</span>}
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
                <OrderList title={`Best sellers (${sells.length})`} orders={sells} />
                <OrderList title={`Best buyers (${buys.length})`} orders={buys} />
              </div>
            </section>
          )}
        </section>
        <LibraryPanel onOpen={openSlug} selected={item ?? null} />
      </div>
    </main>
  );
}

function InitialState() {
  return (
    <section className="initial-state">
      <h2>Search a tradable item to open the market console.</h2>
      <p>Suggestions use the locally cached item manifest, so typing does not hammer the API.</p>
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
