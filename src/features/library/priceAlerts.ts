import { useEffect, useRef } from "react";
import { fetchOrders } from "../../api/warframeMarket";
import { defaultFilters, filterOrders, sortOrders } from "../../domain/market";
import type { FavoriteSnapshot, MarketOrder } from "../../domain/models";
import { config } from "../../lib/config";
import { formatPlatinum } from "../../lib/format";
import { sendDesktopNotification } from "../../lib/notifications";
import { useLibraryStore } from "./store";

function lowestOnlineSellPrice(orders: MarketOrder[]): number | null {
  const sellers = sortOrders(filterOrders(orders, defaultFilters)).filter((order) => order.type === "sell");
  return sellers[0]?.platinum ?? null;
}

function percentChange(previous: number, next: number): number {
  return ((next - previous) / previous) * 100;
}

function alertForFavorite(favorite: FavoriteSnapshot, nextPrice: number | null): { title: string; body: string } | null {
  if (favorite.lastPrice === null || favorite.lastPrice <= 0 || nextPrice === null) return null;
  const change = percentChange(favorite.lastPrice, nextPrice);
  const absoluteChange = Math.abs(change);

  if (change < 0 && favorite.alertDropPercent !== null && absoluteChange >= favorite.alertDropPercent) {
    return {
      title: `${favorite.name} price dropped`,
      body: `${formatPlatinum(favorite.lastPrice)} -> ${formatPlatinum(nextPrice)} (${absoluteChange.toFixed(1)}% down)`
    };
  }

  if (change > 0 && favorite.alertRisePercent !== null && absoluteChange >= favorite.alertRisePercent) {
    return {
      title: `${favorite.name} price increased`,
      body: `${formatPlatinum(favorite.lastPrice)} -> ${formatPlatinum(nextPrice)} (${absoluteChange.toFixed(1)}% up)`
    };
  }

  return null;
}

export function useFavoritePriceAlerts(favorites: FavoriteSnapshot[], online: boolean) {
  const favoritesRef = useRef(favorites);
  const cursorRef = useRef(0);
  const busyRef = useRef(false);
  const updateFavoritePrice = useLibraryStore((state) => state.updateFavoritePrice);

  useEffect(() => {
    favoritesRef.current = favorites;
  }, [favorites]);

  useEffect(() => {
    if (!online) return undefined;

    let cancelled = false;

    async function checkNextFavorite() {
      if (busyRef.current || cancelled) return;
      const watchedFavorites = favoritesRef.current.filter(
        (favorite) => favorite.alertDropPercent !== null || favorite.alertRisePercent !== null
      );
      if (watchedFavorites.length === 0) return;

      busyRef.current = true;
      const favorite = watchedFavorites[cursorRef.current % watchedFavorites.length];
      cursorRef.current += 1;

      try {
        const orders = await fetchOrders(favorite.slug);
        if (cancelled) return;
        const nextPrice = lowestOnlineSellPrice(orders);
        const notification = alertForFavorite(favorite, nextPrice);
        if (notification) {
          await sendDesktopNotification(notification);
        }
        updateFavoritePrice(favorite.slug, nextPrice, Boolean(notification));
      } catch {
        // Background checks should stay quiet; the active item panel shows API errors.
      } finally {
        busyRef.current = false;
      }
    }

    void checkNextFavorite();
    const timer = window.setInterval(() => {
      void checkNextFavorite();
    }, config.favoriteAlertRefreshMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [online, updateFavoritePrice]);
}
