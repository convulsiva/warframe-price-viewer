import Fuse from "fuse.js";
import type { MarketItem } from "./models";

export function createItemSearch(items: MarketItem[]): Fuse<MarketItem> {
  return new Fuse(items, {
    keys: [
      { name: "name", weight: 0.4 },
      { name: "searchNames", weight: 0.5 },
      { name: "englishName", weight: 0.35 },
      { name: "slug", weight: 0.1 },
      { name: "tags", weight: 0.05 }
    ],
    threshold: 0.34,
    ignoreLocation: true,
    includeScore: true,
    minMatchCharLength: 2
  });
}

export function searchItems(items: MarketItem[], query: string, limit: number): MarketItem[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const fuse = createItemSearch(items);
  return fuse
    .search(trimmed, { limit })
    .map((result) => result.item)
    .filter((item) => item.tradable);
}
