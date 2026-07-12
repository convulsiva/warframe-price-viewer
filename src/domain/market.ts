import type { MarketOrder, MarketSummary, OrderFilters } from "./models";

export const defaultFilters: OrderFilters = {
  type: "all",
  status: "all",
  rank: "all",
  minQuantity: null,
  platform: "all",
  crossplay: "all",
  minPrice: null,
  maxPrice: null
};

export function visibleOrders(orders: MarketOrder[]): MarketOrder[] {
  return orders.filter((order) => order.visible);
}

export function sortOrders(orders: MarketOrder[]): MarketOrder[] {
  return [...orders].sort((a, b) => {
    if (a.type !== b.type) return a.type === "sell" ? -1 : 1;
    const priceDelta = a.type === "sell" ? a.platinum - b.platinum : b.platinum - a.platinum;
    if (priceDelta !== 0) return priceDelta;
    const statusScore = (order: MarketOrder) => (order.user?.status === "ingame" ? 0 : order.user?.status === "online" ? 1 : 2);
    return statusScore(a) - statusScore(b);
  });
}

export function filterOrders(orders: MarketOrder[], filters: OrderFilters): MarketOrder[] {
  return orders.filter((order) => {
    if (!order.visible) return false;
    if (filters.type !== "all" && order.type !== filters.type) return false;
    if (filters.status !== "all" && order.user?.status !== filters.status) return false;
    if (filters.rank !== "all" && order.rank !== filters.rank) return false;
    if (filters.minQuantity !== null && order.quantity < filters.minQuantity) return false;
    if (filters.platform !== "all" && order.user?.platform !== filters.platform && order.user?.platform !== undefined) return false;
    if (filters.crossplay === "enabled" && order.user?.crossplay !== true) return false;
    if (filters.crossplay === "disabled" && order.user?.crossplay !== false) return false;
    if (filters.minPrice !== null && order.platinum < filters.minPrice) return false;
    if (filters.maxPrice !== null && order.platinum > filters.maxPrice) return false;
    return true;
  });
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? null;
  const left = sorted[middle - 1];
  const right = sorted[middle];
  return left === undefined || right === undefined ? null : (left + right) / 2;
}

export function summarizeOrders(orders: MarketOrder[]): MarketSummary {
  const visible = visibleOrders(orders);
  const sells = visible.filter((order) => order.type === "sell");
  const buys = visible.filter((order) => order.type === "buy");
  const minSell = sells.length > 0 ? Math.min(...sells.map((order) => order.platinum)) : null;
  const maxBuy = buys.length > 0 ? Math.max(...buys.map((order) => order.platinum)) : null;
  const spread = minSell !== null && maxBuy !== null ? minSell - maxBuy : null;
  const spreadPercent = spread !== null && maxBuy !== null && maxBuy > 0 ? (spread / maxBuy) * 100 : null;
  const lastUpdatedAt =
    visible
      .map((order) => order.updatedAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;

  return {
    minSell,
    maxBuy,
    spread,
    spreadPercent,
    medianSell: median(sells.map((order) => order.platinum)),
    sellCount: sells.length,
    buyCount: buys.length,
    totalVisible: visible.length,
    lastUpdatedAt
  };
}

export function uniquePlatforms(orders: MarketOrder[]): string[] {
  return [...new Set(orders.map((order) => order.user?.platform).filter((value): value is string => Boolean(value)))].sort();
}

export function uniqueRanks(orders: MarketOrder[]): number[] {
  return [...new Set(orders.map((order) => order.rank).filter((value): value is number => value !== null))].sort((a, b) => a - b);
}
