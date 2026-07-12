import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FavoriteSnapshot, MarketItem, MarketSummary, RecentItem } from "../../domain/models";

type LibraryState = {
  favorites: FavoriteSnapshot[];
  recents: RecentItem[];
  addFavorite: (item: MarketItem, summary: MarketSummary) => void;
  removeFavorite: (slug: string) => void;
  isFavorite: (slug: string) => boolean;
  addRecent: (item: MarketItem) => void;
  removeRecent: (slug: string) => void;
  clearRecents: () => void;
};

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      favorites: [],
      recents: [],
      addFavorite: (item, summary) => {
        const existing = get().favorites.find((favorite) => favorite.slug === item.slug);
        const lastPrice = summary.minSell;
        const snapshot: FavoriteSnapshot = {
          slug: item.slug,
          name: item.name,
          thumbUrl: item.thumbUrl,
          lastPrice,
          previousPrice: existing?.lastPrice ?? null,
          updatedAt: new Date().toISOString()
        };
        set((state) => ({
          favorites: [snapshot, ...state.favorites.filter((favorite) => favorite.slug !== item.slug)].slice(0, 40)
        }));
      },
      removeFavorite: (slug) =>
        set((state) => ({ favorites: state.favorites.filter((favorite) => favorite.slug !== slug) })),
      isFavorite: (slug) => get().favorites.some((favorite) => favorite.slug === slug),
      addRecent: (item) => {
        const recent: RecentItem = {
          slug: item.slug,
          name: item.name,
          thumbUrl: item.thumbUrl,
          viewedAt: new Date().toISOString()
        };
        set((state) => ({
          recents: [recent, ...state.recents.filter((entry) => entry.slug !== item.slug)].slice(0, 12)
        }));
      },
      removeRecent: (slug) => set((state) => ({ recents: state.recents.filter((entry) => entry.slug !== slug) })),
      clearRecents: () => set({ recents: [] })
    }),
    { name: "warframe-price-viewer-library" }
  )
);
