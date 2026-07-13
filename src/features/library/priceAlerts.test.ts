import { describe, expect, it } from "vitest";
import type { MarketOrder } from "../../domain/models";
import { lowestIngameSellPrice } from "./priceAlerts";

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
});
