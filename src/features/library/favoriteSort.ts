import type { FavoriteSnapshot } from "../../domain/models";

export type FavoriteSort =
  | "added-newest"
  | "added-oldest"
  | "name-ascending"
  | "name-descending"
  | "price-ascending"
  | "price-descending";

export function filterFavorites(favorites: FavoriteSnapshot[], query: string): FavoriteSnapshot[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return favorites;

  return favorites.filter((favorite) =>
    [favorite.name, favorite.englishName, favorite.slug.replaceAll("_", " ")]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLocaleLowerCase().includes(normalizedQuery))
  );
}

export function sortFavorites(
  favorites: FavoriteSnapshot[],
  sort: FavoriteSort,
  language: "en" | "ru"
): FavoriteSnapshot[] {
  if (sort === "added-newest") return [...favorites];
  if (sort === "added-oldest") return [...favorites].reverse();

  const collator = new Intl.Collator(language, { numeric: true, sensitivity: "base" });
  const direction = sort.endsWith("descending") ? -1 : 1;

  return favorites
    .map((favorite, index) => ({ favorite, index }))
    .sort((a, b) => {
      let comparison: number;

      if (sort.startsWith("name")) {
        comparison = collator.compare(a.favorite.name, b.favorite.name);
      } else {
        const aPrice = a.favorite.lastPrice;
        const bPrice = b.favorite.lastPrice;
        if (aPrice === null && bPrice === null) comparison = 0;
        else if (aPrice === null) return 1;
        else if (bPrice === null) return -1;
        else comparison = aPrice - bPrice;
      }

      if (comparison !== 0) return comparison * direction;
      const nameComparison = collator.compare(a.favorite.name, b.favorite.name);
      return nameComparison !== 0 ? nameComparison : a.index - b.index;
    })
    .map(({ favorite }) => favorite);
}
