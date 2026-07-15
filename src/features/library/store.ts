import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FavoriteSnapshot, MarketItem, MarketSummary, RecentItem } from "../../domain/models";

type LibraryState = {
  favorites: FavoriteSnapshot[];
  recents: RecentItem[];
  addFavorite: (item: MarketItem, summary: MarketSummary) => void;
  removeFavorite: (slug: string) => void;
  isFavorite: (slug: string) => boolean;
  updateFavoriteAlert: (slug: string, direction: "drop" | "rise", price: number | null) => void;
  updateFavoritePrice: (slug: string, price: number | null, alerted?: boolean) => void;
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
          alertDropPrice: existing?.alertDropPrice ?? null,
          alertRisePrice: existing?.alertRisePrice ?? null,
          lastAlertAt: existing?.lastAlertAt ?? null,
          updatedAt: new Date().toISOString()
        };
        set((state) => ({
          favorites: [snapshot, ...state.favorites.filter((favorite) => favorite.slug !== item.slug)].slice(0, 40)
        }));
      },
      removeFavorite: (slug) =>
        set((state) => ({ favorites: state.favorites.filter((favorite) => favorite.slug !== slug) })),
      isFavorite: (slug) => get().favorites.some((favorite) => favorite.slug === slug),
      updateFavoriteAlert: (slug, direction, price) =>
        set((state) => ({
          favorites: state.favorites.map((favorite) =>
            favorite.slug === slug
              ? {
                  ...favorite,
                  alertDropPrice: direction === "drop" ? price : favorite.alertDropPrice,
                  alertRisePrice: direction === "rise" ? price : favorite.alertRisePrice
                }
              : favorite
          )
        })),
      updateFavoritePrice: (slug, price, alerted = false) =>
        set((state) => ({
          favorites: state.favorites.map((favorite) =>
            favorite.slug === slug
              ? {
                  ...favorite,
                  previousPrice: favorite.lastPrice,
                  lastPrice: price,
                  lastAlertAt: alerted ? new Date().toISOString() : favorite.lastAlertAt,
                  updatedAt: new Date().toISOString()
                }
              : favorite
          )
        })),
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
    {
      name: "warframe-price-viewer-library",
      version: 3,
      migrate: (persisted) => {
        const state = persisted as Partial<LibraryState> & {
          favorites?: Array<Partial<FavoriteSnapshot> & { alertDropPercent?: number | null; alertRisePercent?: number | null }>;
        };
        return {
          ...state,
          favorites:
            state.favorites?.map((favorite) => ({
              ...favorite,
              alertDropPrice: favorite.alertDropPrice ?? null,
              alertRisePrice: favorite.alertRisePrice ?? null,
              lastAlertAt: favorite.lastAlertAt ?? null
            })) ?? []
        };
      }
    }
  )
);
