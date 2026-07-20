import { config } from "../lib/config";
import type { ApiItem, ApiOrder } from "../api/schemas";
import type { MarketItem, MarketOrder, MarketUser, UserStatus } from "./models";
import { currentLanguage } from "../lib/i18n";

function assetUrl(path: string | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${config.assetBaseUrl}/${path.replace(/^\//, "")}`;
}

function itemType(tags: string[]): string {
  const russian = currentLanguage() === "ru";
  if (tags.includes("mod")) return russian ? "Мод" : "Mod";
  if (tags.includes("riven")) return russian ? "Мод разлома" : "Riven";
  if (tags.includes("relic")) return russian ? "Реликвия" : "Relic";
  if (tags.includes("weapon")) return russian ? "Оружие" : "Weapon";
  if (tags.includes("warframe")) return "Warframe";
  if (tags.includes("arcane")) return russian ? "Мистификатор" : "Arcane";
  if (tags.includes("set")) return russian ? "Набор" : "Set";
  return tags[0] ? tags[0].replaceAll("_", " ") : russian ? "Предмет" : "Item";
}

export function normalizeItem(item: ApiItem): MarketItem {
  const preferred = item.i18n[currentLanguage()] ?? item.i18n[config.language] ?? item.i18n.en ?? Object.values(item.i18n)[0];
  const english = item.i18n.en ?? preferred;
  const names = Object.fromEntries(Object.entries(item.i18n).map(([lang, value]) => [lang, value.name]));
  const searchNames = [...new Set(Object.values(names))];

  return {
    id: item.id,
    slug: item.slug,
    names,
    searchNames,
    name: preferred.name,
    englishName: english.name,
    description: preferred.description ?? english.description ?? null,
    tags: item.tags,
    type: itemType(item.tags),
    iconUrl: assetUrl(preferred.icon ?? english.icon),
    thumbUrl: assetUrl(preferred.thumb ?? english.thumb),
    tradable: item.tradable ?? true,
    ducats: item.ducats ?? null,
    masteryRank: item.reqMasteryRank ?? null,
    tradingTax: item.tradingTax ?? null
  };
}

function normalizeStatus(status: string | undefined): UserStatus {
  return status === "online" || status === "ingame" ? status : "offline";
}

function normalizeUser(user: ApiOrder["user"]): MarketUser | null {
  if (!user) return null;
  return {
    id: user.id,
    name: user.ingameName,
    reputation: user.reputation,
    platform: user.platform,
    crossplay: user.crossplay ?? false,
    locale: user.locale ?? null,
    status: normalizeStatus(user.status),
    lastSeen: user.lastSeen ?? null
  };
}

export function normalizeOrder(order: ApiOrder): MarketOrder {
  return {
    id: order.id,
    type: order.type,
    platinum: order.platinum,
    quantity: order.quantity,
    perTrade: order.perTrade ?? null,
    visible: order.visible,
    createdAt: order.createdAt ?? null,
    updatedAt: order.updatedAt ?? null,
    itemId: order.itemId,
    rank: order.rank ?? null,
    subtype: order.subtype ?? null,
    user: normalizeUser(order.user)
  };
}

export function normalizeOrders(orders: ApiOrder[]): MarketOrder[] {
  return orders.map(normalizeOrder);
}
