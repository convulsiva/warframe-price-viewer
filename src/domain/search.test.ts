import { describe, expect, it } from "vitest";
import type { MarketItem } from "./models";
import { searchItems } from "./search";

const lexPrime: MarketItem = {
  id: "lex-prime",
  slug: "lex_prime_set",
  names: { en: "Lex Prime Set", ru: "Лекс Прайм: Комплект" },
  searchNames: ["Lex Prime Set", "Лекс Прайм: Комплект"],
  name: "Lex Prime Set",
  englishName: "Lex Prime Set",
  description: null,
  tags: ["weapon", "prime", "set"],
  type: "Weapon",
  iconUrl: null,
  thumbUrl: null,
  tradable: true,
  ducats: 55,
  masteryRank: null,
  tradingTax: null
};

describe("item search localization", () => {
  it("finds an English item by its Russian name", () => {
    expect(searchItems([lexPrime], "Лекс Прайм", 10)).toEqual([lexPrime]);
  });

  it("finds the same item by its English name", () => {
    expect(searchItems([lexPrime], "Lex Prime", 10)).toEqual([lexPrime]);
  });
});
