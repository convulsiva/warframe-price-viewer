import { z } from "zod";

export const i18nEntrySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  wikiLink: z.string().optional(),
  icon: z.string().optional(),
  thumb: z.string().optional()
});

export const apiItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  gameRef: z.string().optional(),
  tags: z.array(z.string()).default([]),
  i18n: z.record(z.string(), i18nEntrySchema),
  setRoot: z.boolean().optional(),
  setParts: z.array(z.string()).optional(),
  ducats: z.number().optional(),
  reqMasteryRank: z.number().optional(),
  tradingTax: z.number().optional(),
  tradable: z.boolean().optional()
});

export const itemsResponseSchema = z.object({
  apiVersion: z.string(),
  data: z.array(apiItemSchema)
});

export const itemDetailResponseSchema = z.object({
  apiVersion: z.string(),
  data: apiItemSchema
});

export const apiUserSchema = z.object({
  id: z.string(),
  ingameName: z.string(),
  slug: z.string().optional(),
  avatar: z.string().optional(),
  reputation: z.number().default(0),
  platform: z.string(),
  crossplay: z.boolean().optional(),
  locale: z.string().optional(),
  status: z.enum(["offline", "online", "ingame"]).catch("offline"),
  activity: z
    .object({
      type: z.string().optional(),
      details: z.string().optional(),
      startedAt: z.string().optional()
    })
    .optional(),
  lastSeen: z.string().optional()
});

export const apiOrderSchema = z.object({
  id: z.string(),
  type: z.enum(["buy", "sell"]),
  platinum: z.number(),
  quantity: z.number().default(1),
  perTrade: z.number().optional(),
  visible: z.boolean().default(true),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  itemId: z.string(),
  user: apiUserSchema.optional(),
  rank: z.number().optional(),
  subtype: z.string().optional()
});

export const topOrdersResponseSchema = z.object({
  apiVersion: z.string(),
  data: z.object({
    sell: z.array(apiOrderSchema).default([]),
    buy: z.array(apiOrderSchema).default([])
  })
});

export const ordersResponseSchema = z.object({
  apiVersion: z.string(),
  data: z.array(apiOrderSchema)
});

export type ApiItem = z.infer<typeof apiItemSchema>;
export type ApiOrder = z.infer<typeof apiOrderSchema>;
