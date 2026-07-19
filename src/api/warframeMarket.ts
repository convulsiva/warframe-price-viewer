import { useQuery } from "@tanstack/react-query";
import { normalizeItem, normalizeOrders } from "../domain/transforms";
import { config } from "../lib/config";
import { requestJson } from "./client";
import {
  itemDetailResponseSchema,
  itemsResponseSchema,
  ordersResponseSchema,
  topOrdersResponseSchema
} from "./schemas";

export const queryKeys = {
  items: ["items"] as const,
  item: (slug: string) => ["item", slug] as const,
  topOrders: (slug: string) => ["orders", slug, "top"] as const,
  orders: (slug: string) => ["orders", slug, "all"] as const
};

export async function fetchItemDetail(slug: string, signal?: AbortSignal) {
  const response = await requestJson(`/items/${slug}`, itemDetailResponseSchema, { signal });
  return normalizeItem(response.data);
}

export async function fetchTopOrders(slug: string, signal?: AbortSignal) {
  const response = await requestJson(`/orders/item/${slug}/top`, topOrdersResponseSchema, { signal });
  return {
    sell: normalizeOrders(response.data.sell),
    buy: normalizeOrders(response.data.buy)
  };
}

export async function fetchOrders(slug: string, signal?: AbortSignal) {
  const response = await requestJson(`/orders/item/${slug}`, ordersResponseSchema, { signal });
  return normalizeOrders(response.data);
}

export function useItemsQuery() {
  return useQuery({
    queryKey: queryKeys.items,
    queryFn: async ({ signal }) => {
      const response = await requestJson("/items", itemsResponseSchema, { signal });
      return response.data.map(normalizeItem);
    },
    staleTime: config.itemStaleMs,
    gcTime: config.itemGcMs,
    refetchInterval: (query) => query.state.status === "error" ? 10_000 : false,
    refetchIntervalInBackground: true
  });
}

export function useItemDetailQuery(slug: string | null) {
  return useQuery({
    queryKey: slug ? queryKeys.item(slug) : ["item", "none"],
    queryFn: async ({ signal }) => {
      if (!slug) throw new Error("Missing item slug");
      return fetchItemDetail(slug, signal);
    },
    enabled: Boolean(slug),
    staleTime: config.itemStaleMs,
    gcTime: config.itemGcMs
  });
}

export function useTopOrdersQuery(slug: string | null, online: boolean) {
  return useQuery({
    queryKey: slug ? queryKeys.topOrders(slug) : ["orders", "none", "top"],
    queryFn: async ({ signal }) => {
      if (!slug) throw new Error("Missing item slug");
      return fetchTopOrders(slug, signal);
    },
    enabled: Boolean(slug) && online,
    staleTime: config.orderStaleMs,
    gcTime: config.itemGcMs
  });
}

export function useOrdersQuery(slug: string | null, online: boolean) {
  return useQuery({
    queryKey: slug ? queryKeys.orders(slug) : ["orders", "none", "all"],
    queryFn: async ({ signal }) => {
      if (!slug) throw new Error("Missing item slug");
      return fetchOrders(slug, signal);
    },
    enabled: Boolean(slug) && online,
    staleTime: config.orderStaleMs,
    gcTime: config.itemGcMs,
    refetchInterval: online && slug ? config.orderRefreshMs : false,
    refetchIntervalInBackground: true
  });
}
