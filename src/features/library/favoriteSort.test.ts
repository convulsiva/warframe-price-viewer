import { describe, expect, it } from "vitest";
import type { FavoriteSnapshot } from "../../domain/models";
import { sortFavorites } from "./favoriteSort";

function favorite(name: string, lastPrice: number | null): FavoriteSnapshot {
  return {
    slug: name.toLowerCase().replaceAll(" ", "_"),
    name,
    thumbUrl: null,
    lastPrice,
    previousPrice: null,
    alertDropPrice: null,
    alertRisePrice: null,
    alertedOrderKeys: [],
    lastAlertAt: null,
    updatedAt: "2026-07-20T00:00:00.000Z"
  };
}

const favorites = [favorite("Zakti Prime", 12), favorite("Aklex Prime", null), favorite("Lex Prime", 5)];

describe("favorite sorting", () => {
  it("keeps the store insertion order for newest and reverses it for oldest", () => {
    expect(sortFavorites(favorites, "added-newest", "en").map((item) => item.name)).toEqual([
      "Zakti Prime",
      "Aklex Prime",
      "Lex Prime"
    ]);
    expect(sortFavorites(favorites, "added-oldest", "en").map((item) => item.name)).toEqual([
      "Lex Prime",
      "Aklex Prime",
      "Zakti Prime"
    ]);
  });

  it("sorts names in both directions", () => {
    expect(sortFavorites(favorites, "name-ascending", "en").map((item) => item.name)).toEqual([
      "Aklex Prime",
      "Lex Prime",
      "Zakti Prime"
    ]);
    expect(sortFavorites(favorites, "name-descending", "en").map((item) => item.name)).toEqual([
      "Zakti Prime",
      "Lex Prime",
      "Aklex Prime"
    ]);
  });

  it("sorts prices in both directions and always puts unavailable prices last", () => {
    expect(sortFavorites(favorites, "price-ascending", "en").map((item) => item.lastPrice)).toEqual([5, 12, null]);
    expect(sortFavorites(favorites, "price-descending", "en").map((item) => item.lastPrice)).toEqual([12, 5, null]);
  });
});
