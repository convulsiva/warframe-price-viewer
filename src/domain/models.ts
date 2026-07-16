export type OrderType = "buy" | "sell";
export type UserStatus = "offline" | "online" | "ingame";

export type MarketItem = {
  id: string;
  slug: string;
  names: Record<string, string>;
  name: string;
  englishName: string;
  description: string | null;
  tags: string[];
  type: string;
  iconUrl: string | null;
  thumbUrl: string | null;
  tradable: boolean;
  masteryRank: number | null;
  tradingTax: number | null;
};

export type MarketUser = {
  id: string;
  name: string;
  reputation: number;
  platform: string;
  crossplay: boolean;
  locale: string | null;
  status: UserStatus;
  lastSeen: string | null;
};

export type MarketOrder = {
  id: string;
  type: OrderType;
  platinum: number;
  quantity: number;
  perTrade: number | null;
  visible: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  itemId: string;
  rank: number | null;
  subtype: string | null;
  user: MarketUser | null;
};

export type OrderFilters = {
  type: "all" | OrderType;
  status: "all" | "active" | UserStatus;
  rank: "all" | number;
  minQuantity: number | null;
  platform: "all" | string;
  crossplay: "all" | "enabled" | "disabled";
  minPrice: number | null;
  maxPrice: number | null;
};

export type MarketSummary = {
  minSell: number | null;
  maxBuy: number | null;
  spread: number | null;
  spreadPercent: number | null;
  medianSell: number | null;
  sellCount: number;
  buyCount: number;
  totalVisible: number;
  lastUpdatedAt: string | null;
};

export type FavoriteSnapshot = {
  slug: string;
  name: string;
  thumbUrl: string | null;
  lastPrice: number | null;
  previousPrice: number | null;
  alertDropPrice: number | null;
  alertRisePrice: number | null;
  alertedOrderKeys: string[];
  lastAlertAt: string | null;
  updatedAt: string;
};

export type RecentItem = {
  slug: string;
  name: string;
  thumbUrl: string | null;
  viewedAt: string;
};
