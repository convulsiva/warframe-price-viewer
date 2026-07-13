import { z } from "zod";

const envSchema = z.object({
  VITE_WARFRAME_MARKET_API_BASE_URL: z
    .string()
    .default("/api/wfm")
    .refine((value) => value.startsWith("/") || URL.canParse(value), {
      message: "API base URL must be an absolute URL or an app-relative path"
    }),
  VITE_WARFRAME_MARKET_ASSET_BASE_URL: z.string().url().default("https://warframe.market/static/assets"),
  VITE_WARFRAME_MARKET_LANGUAGE: z.string().default("en"),
  VITE_WARFRAME_MARKET_PLATFORM: z.string().default("pc"),
  VITE_WARFRAME_MARKET_CROSSPLAY: z
    .string()
    .default("true")
    .transform((value) => value === "true")
});

const parsed = envSchema.parse(import.meta.env);

export const config = {
  apiBaseUrl: parsed.VITE_WARFRAME_MARKET_API_BASE_URL.replace(/\/$/, ""),
  assetBaseUrl: parsed.VITE_WARFRAME_MARKET_ASSET_BASE_URL.replace(/\/$/, ""),
  language: parsed.VITE_WARFRAME_MARKET_LANGUAGE,
  platform: parsed.VITE_WARFRAME_MARKET_PLATFORM,
  crossplay: parsed.VITE_WARFRAME_MARKET_CROSSPLAY,
  requestTimeoutMs: 15000,
  itemStaleMs: 1000 * 60 * 60 * 12,
  itemGcMs: 1000 * 60 * 60 * 24 * 7,
  orderStaleMs: 1000 * 5,
  orderRefreshMs: 1000 * 5,
  favoriteAlertRefreshMs: 1000 * 12,
  searchDebounceMs: 180,
  maxSearchResults: 60
} as const;
