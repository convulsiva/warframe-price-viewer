import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PriceHistoryPoint } from "../../domain/models";

const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 90;
const MAX_POINTS_PER_ITEM = 3_000;
const REPEAT_INTERVAL_MS = 1000 * 60 * 15;

type HistoryState = {
  series: Record<string, PriceHistoryPoint[]>;
  record: (slug: string, platform: string, lowestSell: number | null, medianSell: number | null) => void;
};

export function historyKey(slug: string, platform: string): string {
  return `${platform}:${slug}`;
}

export const usePriceHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      series: {},
      record: (slug, platform, lowestSell, medianSell) => {
        if (lowestSell === null || !Number.isFinite(lowestSell)) return;
        const key = historyKey(slug, platform);
        const now = Date.now();
        set((state) => {
          const current = state.series[key] ?? [];
          const last = current.at(-1);
          if (
            last &&
            last.lowestSell === lowestSell &&
            last.medianSell === medianSell &&
            now - new Date(last.timestamp).getTime() < REPEAT_INTERVAL_MS
          ) {
            return state;
          }

          const cutoff = now - MAX_AGE_MS;
          const next = [
            ...current.filter((point) => new Date(point.timestamp).getTime() >= cutoff),
            { timestamp: new Date(now).toISOString(), lowestSell, medianSell }
          ].slice(-MAX_POINTS_PER_ITEM);

          return { series: { ...state.series, [key]: next } };
        });
      }
    }),
    { name: "wfmarkettracker-price-history", version: 1 }
  )
);
