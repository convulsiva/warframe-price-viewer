import { describe, expect, it } from "vitest";
import { itemCategoryFromTags } from "./itemCategory";

describe("item categories", () => {
  it("uses the primary market category instead of secondary tags", () => {
    expect(itemCategoryFromTags(["weapon", "prime", "set", "primary"])).toBe("weapon");
    expect(itemCategoryFromTags(["mod", "rare", "rifle"])).toBe("mod");
    expect(itemCategoryFromTags(["relic", "axi", "rare"])).toBe("relic");
  });

  it("groups related market tags into useful categories", () => {
    expect(itemCategoryFromTags(["arcane_enhancement", "legendary"])).toBe("arcane");
    expect(itemCategoryFromTags(["sentinel", "component"])).toBe("companion");
    expect(itemCategoryFromTags(["scene", "misc"])).toBe("cosmetic");
    expect(itemCategoryFromTags(["fish", "rare"])).toBe("resource");
  });
});
