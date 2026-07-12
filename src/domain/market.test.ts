import { describe, expect, it } from "vitest";
import type { MarketOrder } from "./models";
import { defaultFilters, filterOrders, median, sortOrders, summarizeOrders } from "./market";

const baseOrder: MarketOrder = {
  id: "1",
  type: "sell",
  platinum: 10,
  quantity: 1,
  perTrade: 1,
  visible: true,
  createdAt: null,
  updatedAt: "2026-07-12T10:00:00Z",
  itemId: "item",
  rank: null,
  subtype: null,
  user: {
    id: "u",
    name: "Tenno",
    reputation: 1,
    platform: "pc",
    crossplay: true,
    locale: "en",
    status: "ingame",
    lastSeen: null
  }
};

describe("market calculations", () => {
  it("computes minimum sell, maximum buy, spread, and median", () => {
    const orders: MarketOrder[] = [
      { ...baseOrder, id: "sell-10", type: "sell", platinum: 10 },
      { ...baseOrder, id: "sell-12", type: "sell", platinum: 12 },
      { ...baseOrder, id: "buy-8", type: "buy", platinum: 8 },
      { ...baseOrder, id: "buy-9", type: "buy", platinum: 9 }
    ];

    expect(summarizeOrders(orders)).toMatchObject({
      minSell: 10,
      maxBuy: 9,
      spread: 1,
      medianSell: 11,
      sellCount: 2,
      buyCount: 2
    });
  });

  it("handles empty responses", () => {
    expect(summarizeOrders([])).toMatchObject({
      minSell: null,
      maxBuy: null,
      totalVisible: 0
    });
  });

  it("filters by status and price", () => {
    const user = baseOrder.user;
    if (!user) throw new Error("Expected test user");
    const orders = [baseOrder, { ...baseOrder, id: "offline", platinum: 50, user: { ...user, status: "offline" as const } }];
    expect(filterOrders(orders, { ...defaultFilters, status: "ingame", maxPrice: 20 })).toHaveLength(1);
  });

  it("sorts sells ascending and buys descending", () => {
    const orders = [
      { ...baseOrder, id: "sell-20", type: "sell" as const, platinum: 20 },
      { ...baseOrder, id: "sell-10", type: "sell" as const, platinum: 10 },
      { ...baseOrder, id: "buy-5", type: "buy" as const, platinum: 5 },
      { ...baseOrder, id: "buy-8", type: "buy" as const, platinum: 8 }
    ];
    expect(sortOrders(orders).map((order) => order.id)).toEqual(["sell-10", "sell-20", "buy-8", "buy-5"]);
  });

  it("calculates median values", () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 3])).toBe(2);
    expect(median([])).toBeNull();
  });
});
