import { useEffect, useRef } from "react";
import { fetchOrders } from "../../api/warframeMarket";
import { sortOrders } from "../../domain/market";
import type { FavoriteSnapshot, MarketOrder } from "../../domain/models";
import { writeClipboardText } from "../../lib/clipboard";
import { config } from "../../lib/config";
import { formatPlatinum } from "../../lib/format";
import { listenForNotificationActions, sendDesktopNotification } from "../../lib/notifications";
import { useLibraryStore } from "./store";

const PRICE_ALERT_ACTION_TYPE = "price-alert-actions";

export function lowestIngameSellOrder(orders: MarketOrder[]): MarketOrder | null {
  const sellers = sortOrders(
    orders.filter((order) => order.visible && order.type === "sell" && order.user?.status === "ingame")
  );
  return sellers[0] ?? null;
}

export function lowestIngameSellPrice(orders: MarketOrder[]): number | null {
  return lowestIngameSellOrder(orders)?.platinum ?? null;
}

export function whisperCommand(itemName: string, sellerName: string, price: number): string {
  return `/w ${sellerName} Hi! I want to buy: "${itemName}" for ${price} platinum. (warframe.market)`;
}

function shouldSendDropAlert(favorite: FavoriteSnapshot, nextPrice: number): boolean {
  if (favorite.alertDropPrice === null || nextPrice > favorite.alertDropPrice) return false;
  if (favorite.lastPrice === null) return true;
  return favorite.lastPrice > favorite.alertDropPrice || nextPrice < favorite.lastPrice;
}

function shouldSendRiseAlert(favorite: FavoriteSnapshot, nextPrice: number): boolean {
  if (favorite.alertRisePrice === null || nextPrice < favorite.alertRisePrice) return false;
  if (favorite.lastPrice === null) return true;
  return favorite.lastPrice < favorite.alertRisePrice || nextPrice > favorite.lastPrice;
}

function alertForFavorite(
  favorite: FavoriteSnapshot,
  order: MarketOrder | null
): { title: string; body: string; command: string } | null {
  if (!order || !order.user) return null;

  const nextPrice = order.platinum;
  const seller = order.user.name;

  if (shouldSendDropAlert(favorite, nextPrice)) {
    return {
      title: `${favorite.name} price dropped`,
      body: `${seller} sells for ${formatPlatinum(nextPrice)}. Click to copy whisper.`,
      command: whisperCommand(favorite.name, seller, nextPrice)
    };
  }

  if (shouldSendRiseAlert(favorite, nextPrice)) {
    return {
      title: `${favorite.name} price increased`,
      body: `Lowest ingame seller is now ${formatPlatinum(nextPrice)}. Click to copy whisper.`,
      command: whisperCommand(favorite.name, seller, nextPrice)
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
    let cleanup: (() => void) | undefined;

    async function setup() {
      cleanup = await listenForNotificationActions(async (command) => {
        await writeClipboardText(command);
      });
    }

    void setup();

    return () => {
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    favoritesRef.current = favorites;
  }, [favorites]);

  useEffect(() => {
    if (!online) return undefined;

    let cancelled = false;

    async function checkNextFavorite() {
      if (busyRef.current || cancelled) return;
      const watchedFavorites = favoritesRef.current.filter(
        (favorite) => favorite.alertDropPrice !== null || favorite.alertRisePrice !== null
      );
      if (watchedFavorites.length === 0) return;

      busyRef.current = true;
      const favorite = watchedFavorites[cursorRef.current % watchedFavorites.length];
      cursorRef.current += 1;

      try {
        const orders = await fetchOrders(favorite.slug);
        if (cancelled) return;
        const order = lowestIngameSellOrder(orders);
        const nextPrice = order?.platinum ?? null;
        const notification = alertForFavorite(favorite, order);
        if (notification) {
          await sendDesktopNotification({
            title: notification.title,
            body: notification.body,
            actionTypeId: PRICE_ALERT_ACTION_TYPE,
            extra: { whisperCommand: notification.command }
          });
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
