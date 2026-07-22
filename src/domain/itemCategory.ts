export type ItemCategory =
  | "weapon"
  | "warframe"
  | "mod"
  | "relic"
  | "arcane"
  | "companion"
  | "cosmetic"
  | "resource"
  | "set"
  | "other";

export const itemCategoryOrder: ItemCategory[] = [
  "weapon",
  "warframe",
  "mod",
  "relic",
  "arcane",
  "companion",
  "cosmetic",
  "resource",
  "set",
  "other"
];

const companionTags = new Set(["companion", "sentinel", "kubrow", "kavat", "hound", "moa", "pet", "beast", "robotic"]);
const cosmeticTags = new Set(["scene", "skin", "emote", "operator"]);
const resourceTags = new Set(["fish", "gem", "ayatan_sculpture"]);

export function itemCategoryFromTags(tags: string[]): ItemCategory {
  if (tags.includes("mod") || tags.includes("riven_mod") || tags.includes("veiled_riven")) return "mod";
  if (tags.includes("relic")) return "relic";
  if (tags.includes("weapon")) return "weapon";
  if (tags.includes("warframe")) return "warframe";
  if (tags.some((tag) => tag.startsWith("arcane"))) return "arcane";
  if (tags.some((tag) => companionTags.has(tag))) return "companion";
  if (tags.some((tag) => cosmeticTags.has(tag))) return "cosmetic";
  if (tags.some((tag) => resourceTags.has(tag))) return "resource";
  if (tags.includes("set")) return "set";
  return "other";
}
