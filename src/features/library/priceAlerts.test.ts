import { describe, expect, it } from "vitest";
import type { FavoriteSnapshot, MarketOrder } from "../../domain/models";
import { alertsForFavorite, lowestIngameSellPrice, whisperCommand } from "./priceAlerts";

const baseUser = {
  id: "user",
  name: "Seller",
  reputation: 0,
  platform: "pc",
  crossplay: true,
  locale: null,
  status: "ingame" as const,
  lastSeen: null
};

function order(overrides: Partial<MarketOrder>): MarketOrder {
  return {
    id: "order",
    type: "sell",
    platinum: 10,
    quantity: 1,
    perTrade: null,
    visible: true,
    createdAt: null,
    updatedAt: null,
    itemId: "item",
    rank: null,
    subtype: null,
    user: baseUser,
    ...overrides
  };
}

function favorite(overrides: Partial<FavoriteSnapshot> = {}): FavoriteSnapshot {
  return {
    slug: "lex_prime_set",
    name: "Lex Prime Set",
    thumbUrl: null,
    lastPrice: 10,
    previousPrice: 12,
    alertDropPrice: 7,
    alertRisePrice: null,
    alertedOrderKeys: [],
    lastAlertAt: null,
    updatedAt: "2026-07-16T00:00:00.000Z",
    ...overrides
  };
}

describe("price alerts", () => {
  it("uses only visible ingame sell orders for alert pricing", () => {
    expect(
      lowestIngameSellPrice([
        order({ id: "offline-cheap", platinum: 1, user: { ...baseUser, status: "offline" } }),
        order({ id: "online-cheap", platinum: 2, user: { ...baseUser, status: "online" } }),
        order({ id: "buy", type: "buy", platinum: 99 }),
        order({ id: "hidden", platinum: 3, visible: false }),
        order({ id: "ingame", platinum: 5 })
      ])
    ).toBe(5);
  });

  it("builds the in-game whisper command for the seller and exact price", () => {
    expect(whisperCommand("Lex Prime Set", "Seller", 5)).toBe(
      '/w Seller Hi! I want to buy: "Lex Prime Set" for 5 platinum. (warframe.market)'
    );
  });

  it("creates separate drop alerts for multiple new matching ingame sellers", () => {
    const result = alertsForFavorite(favorite(), [
      order({ id: "seller-a", platinum: 5, user: { ...baseUser, id: "a", name: "SellerA" } }),
      order({ id: "seller-b", platinum: 6, user: { ...baseUser, id: "b", name: "SellerB" } }),
      order({ id: "seller-c", platinum: 8, user: { ...baseUser, id: "c", name: "SellerC" } })
    ]);

    expect(result.notifications.map((alert) => alert.command)).toEqual([
      '/w SellerA Hi! I want to buy: "Lex Prime Set" for 5 platinum. (warframe.market)',
      '/w SellerB Hi! I want to buy: "Lex Prime Set" for 6 platinum. (warframe.market)'
    ]);
    expect(result.activeKeys).toEqual(["lex_prime_set:drop:a:5", "lex_prime_set:drop:b:6"]);
  });

  it("does not repeat an alert for the same seller, direction, and price", () => {
    const result = alertsForFavorite(
      favorite({ alertedOrderKeys: ["lex_prime_set:drop:a:5"] }),
      [
        order({ id: "seller-a", platinum: 5, user: { ...baseUser, id: "a", name: "SellerA" } }),
        order({ id: "seller-b", platinum: 6, user: { ...baseUser, id: "b", name: "SellerB" } })
      ]
    );

    expect(result.notifications.map((alert) => alert.command)).toEqual([
      '/w SellerB Hi! I want to buy: "Lex Prime Set" for 6 platinum. (warframe.market)'
    ]);
    expect(result.activeKeys).toEqual(["lex_prime_set:drop:a:5", "lex_prime_set:drop:b:6"]);
  });

  it("drops inactive alert keys so the same seller can alert again after leaving the target", () => {
    const result = alertsForFavorite(favorite({ alertedOrderKeys: ["lex_prime_set:drop:a:5"] }), [
      order({ id: "seller-a", platinum: 8, user: { ...baseUser, id: "a", name: "SellerA" } })
    ]);

    expect(result.notifications).toEqual([]);
    expect(result.activeKeys).toEqual([]);
  });
});
