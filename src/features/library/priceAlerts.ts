import { useEffect, useRef } from "react";
import { fetchOrders } from "../../api/warframeMarket";
import { sortOrders } from "../../domain/market";
import type { FavoriteSnapshot, MarketOrder } from "../../domain/models";
import { config } from "../../lib/config";
import { formatPlatinum } from "../../lib/format";
import { sendDesktopNotification } from "../../lib/notifications";
import { useLicenseStore } from "../license/store";
import { useLibraryStore } from "./store";
import { usePriceHistoryStore } from "../market/historyStore";
import { currentLanguage } from "../../lib/i18n";

const PRICE_ALERT_ACTION_TYPE = "price-alert-actions";
const MAX_ALERTS_PER_FAVORITE_CHECK = 5;

type PriceAlertNotification = {
  title: string;
  body: string;
  command: string;
  key: string;
};

type PriceAlertResult = {
  notifications: PriceAlertNotification[];
  activeKeys: string[];
};

export function ingameSellOrders(orders: MarketOrder[]): MarketOrder[] {
  return sortOrders(orders.filter((order) => order.visible && order.type === "sell" && order.user?.status === "ingame"));
}

export function lowestIngameSellOrder(orders: MarketOrder[]): MarketOrder | null {
  return ingameSellOrders(orders)[0] ?? null;
}

export function whisperCommand(itemName: string, sellerName: string, price: number): string {
  return `/w ${sellerName} Hi! I want to buy: "${itemName}" for ${price} platinum. (warframe.market)`;
}

export function lowestIngameSellPrice(orders: MarketOrder[]): number | null {
  return lowestIngameSellOrder(orders)?.platinum ?? null;
}

function sellerKey(order: MarketOrder): string {
  return order.user?.id || order.user?.name || order.id;
}

function priceAlertKey(favorite: FavoriteSnapshot, direction: "drop" | "rise", order: MarketOrder): string {
  return `${favorite.slug}:${direction}:${sellerKey(order)}:${order.platinum}`;
}

function shouldSendDropAlertForOrder(favorite: FavoriteSnapshot, order: MarketOrder): boolean {
  if (favorite.alertDropPrice === null || order.platinum > favorite.alertDropPrice) return false;
  if (favorite.lastPrice === null) return true;
  return favorite.lastPrice > favorite.alertDropPrice || order.platinum < favorite.lastPrice;
}

function shouldSendRiseAlertForOrder(favorite: FavoriteSnapshot, order: MarketOrder): boolean {
  if (favorite.alertRisePrice === null || order.platinum < favorite.alertRisePrice) return false;
  if (favorite.lastPrice === null) return true;
  return favorite.lastPrice < favorite.alertRisePrice || order.platinum > favorite.lastPrice;
}

export function alertsForFavorite(
  favorite: FavoriteSnapshot,
  orders: MarketOrder[]
): PriceAlertResult {
  const russian = currentLanguage() === "ru";
  const alreadyAlerted = new Set(favorite.alertedOrderKeys ?? []);
  const currentlyMatching = new Set<string>();
  const notifications: PriceAlertNotification[] = [];

  for (const order of ingameSellOrders(orders)) {
    if (!order.user) continue;

    if (favorite.alertDropPrice !== null && order.platinum <= favorite.alertDropPrice) {
      currentlyMatching.add(priceAlertKey(favorite, "drop", order));
    }

    if (favorite.alertRisePrice !== null && order.platinum >= favorite.alertRisePrice) {
      currentlyMatching.add(priceAlertKey(favorite, "rise", order));
    }

    if (shouldSendDropAlertForOrder(favorite, order)) {
      const key = priceAlertKey(favorite, "drop", order);
      if (!alreadyAlerted.has(key)) {
        notifications.push({
          title: russian ? `Цена ${favorite.name} снизилась` : `${favorite.name} price dropped`,
          body: russian ? `${order.user.name} продаёт за ${formatPlatinum(order.platinum)}. Нажмите, чтобы скопировать сообщение.` : `${order.user.name} sells for ${formatPlatinum(order.platinum)}. Click to copy whisper.`,
          command: whisperCommand(favorite.name, order.user.name, order.platinum),
          key
        });
        alreadyAlerted.add(key);
      }
    }

    if (shouldSendRiseAlertForOrder(favorite, order)) {
      const key = priceAlertKey(favorite, "rise", order);
      if (!alreadyAlerted.has(key)) {
        notifications.push({
          title: russian ? `Цена ${favorite.name} повысилась` : `${favorite.name} price increased`,
          body: russian ? `${order.user.name} продаёт за ${formatPlatinum(order.platinum)}. Нажмите, чтобы скопировать сообщение.` : `${order.user.name} sells for ${formatPlatinum(order.platinum)}. Click to copy whisper.`,
          command: whisperCommand(favorite.name, order.user.name, order.platinum),
          key
        });
        alreadyAlerted.add(key);
      }
    }

    if (notifications.length >= MAX_ALERTS_PER_FAVORITE_CHECK) break;
  }

  return {
    notifications,
    activeKeys: [
      ...new Set([
        ...(favorite.alertedOrderKeys ?? []).filter((key) => currentlyMatching.has(key)),
        ...notifications.map((notification) => notification.key)
      ])
    ].slice(-120)
  };
}

export function useFavoritePriceAlerts(favorites: FavoriteSnapshot[], online: boolean, notificationsEnabled: boolean) {
  const favoritesRef = useRef(favorites);
  const cursorRef = useRef(0);
  const busyRef = useRef(false);
  const updateFavoritePrice = useLibraryStore((state) => state.updateFavoritePrice);
  const recordPrice = usePriceHistoryStore((state) => state.record);

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
        recordPrice(favorite.slug, config.platform, nextPrice, null);
        const alertResult = alertsForFavorite(favorite, orders);
        const notifications = alertResult.notifications;
        if (notificationsEnabled) {
          for (const notification of notifications) {
            if (cancelled || useLicenseStore.getState().status !== "valid") return;
            await sendDesktopNotification({
              title: notification.title,
              body: notification.body,
              actionTypeId: PRICE_ALERT_ACTION_TYPE,
              extra: { whisperCommand: notification.command }
            });
          }
        }
        updateFavoritePrice(
          favorite.slug,
          nextPrice,
          notificationsEnabled && notifications.length > 0,
          alertResult.activeKeys
        );
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
  }, [notificationsEnabled, online, recordPrice, updateFavoritePrice]);
}
