import { Bot, Boxes, ChevronDown, Disc3, Gem, Package, Palette, ScrollText, Search, Shield, SlidersHorizontal, Sparkles, Star, Sword, Trash2, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import type { FavoriteSnapshot, MarketItem } from "../../domain/models";
import { itemCategoryOrder, type ItemCategory } from "../../domain/itemCategory";
import { formatPlatinum } from "../../lib/format";
import { useLibraryStore } from "./store";
import { useI18n } from "../../lib/i18n";
import { filterFavorites, sortFavorites, type FavoriteSort } from "./favoriteSort";

type Props = {
  onOpen: (slug: string) => void;
  selected: MarketItem | null;
  view: "favorites" | "recent";
};

export function FavoritesPanel({ onOpen }: { onOpen: (slug: string) => void }) {
  const { t } = useI18n();
  const favorites = useLibraryStore((state) => state.favorites);
  const removeFavorite = useLibraryStore((state) => state.removeFavorite);
  const updateFavoriteAlert = useLibraryStore((state) => state.updateFavoriteAlert);
  const [searchQuery, setSearchQuery] = useState("");
  const filteredFavorites = useMemo(() => filterFavorites(favorites, searchQuery), [favorites, searchQuery]);
  const groups = useMemo(
    () => itemCategoryOrder
      .map((category) => ({ category, favorites: filteredFavorites.filter((favorite) => (favorite.category ?? "other") === category) }))
      .filter((group) => group.favorites.length > 0),
    [filteredFavorites]
  );
  const searchActive = searchQuery.trim().length > 0;

  return (
    <section className="favorites-page full-page-panel">
      <header className="full-page-header favorites-page-header">
        <div>
          <span className="section-kicker">{t("savedItems")}</span>
          <h2><Star size={20} aria-hidden="true" /> {t("favorites")}</h2>
          <p>{t("manageSaved")}</p>
        </div>
      </header>
      {favorites.length > 0 && (
        <label className="favorites-saved-search">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t("searchSavedItems")}
            aria-label={t("searchSavedItems")}
          />
        </label>
      )}
      <div className="favorites-page-list">
        {favorites.length === 0 && <p className="empty-copy">{t("savedItemsEmpty")}</p>}
        {favorites.length > 0 && groups.length === 0 && <p className="empty-copy">{t("noSavedItemsFound")}</p>}
        {groups.map((group) => (
          <FavoriteCategoryGroup
            category={group.category}
            favorites={group.favorites}
            key={group.category}
            expandForSearch={searchActive}
            onOpen={onOpen}
            onRemove={removeFavorite}
            onUpdateAlert={updateFavoriteAlert}
          />
        ))}
      </div>
    </section>
  );
}

const categoryIcons: Record<ItemCategory, LucideIcon> = {
  weapon: Sword,
  warframe: Shield,
  mod: ScrollText,
  relic: Disc3,
  arcane: Sparkles,
  companion: Bot,
  cosmetic: Palette,
  resource: Gem,
  set: Boxes,
  other: Package
};

function FavoriteCategoryGroup({
  category,
  favorites,
  expandForSearch,
  onOpen,
  onRemove,
  onUpdateAlert
}: {
  category: ItemCategory;
  favorites: FavoriteSnapshot[];
  expandForSearch: boolean;
  onOpen: (slug: string) => void;
  onRemove: (slug: string) => void;
  onUpdateAlert: (slug: string, direction: "drop" | "rise", price: number | null) => void;
}) {
  const { language, t } = useI18n();
  const [manuallyExpanded, setManuallyExpanded] = useState(false);
  const [sort, setSort] = useState<FavoriteSort>("added-newest");
  const sortedFavorites = useMemo(() => sortFavorites(favorites, sort, language), [favorites, language, sort]);
  const CategoryIcon = categoryIcons[category];
  const label = t(categoryTranslationKey(category));
  const expanded = expandForSearch || manuallyExpanded;

  return (
    <section className={expanded ? "favorite-category is-expanded" : "favorite-category"}>
      <header className="favorite-category-header">
        <button
          className="favorite-category-toggle"
          type="button"
          onClick={() => setManuallyExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          <span className="favorite-category-icon"><CategoryIcon size={18} aria-hidden="true" /></span>
          <span className="favorite-category-title">
            <strong>{label}</strong>
            <small>{t("itemsCount", { count: favorites.length })}</small>
          </span>
          <ChevronDown size={18} aria-hidden="true" />
        </button>
        {expanded && (
          <label className="favorites-sort-control">
            <span>{t("sort")}</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as FavoriteSort)} aria-label={`${t("sort")} · ${label}`}>
              <option value="added-newest">{t("newestAdded")}</option>
              <option value="added-oldest">{t("oldestAdded")}</option>
              <option value="name-ascending">{t("nameAscending")}</option>
              <option value="name-descending">{t("nameDescending")}</option>
              <option value="price-ascending">{t("priceAscending")}</option>
              <option value="price-descending">{t("priceDescending")}</option>
            </select>
          </label>
        )}
      </header>
      {expanded && (
        <div className="favorite-category-content">
          {sortedFavorites.map((favorite) => (
            <article className="favorite-page-row" key={favorite.slug}>
              <button className="favorite-page-item" type="button" onClick={() => onOpen(favorite.slug)}>
                {favorite.thumbUrl && <img src={favorite.thumbUrl} alt="" />}
                <span>
                  <strong>{favorite.name}</strong>
                  <small>{formatPlatinum(favorite.lastPrice)} · {t("target")} {favoriteTargetPrice(favorite)} pt</small>
                </span>
              </button>
              <AlertInputs favorite={favorite} onUpdateAlert={onUpdateAlert} />
              <button className="icon-button" type="button" aria-label={t("removeItem", { name: favorite.name })} onClick={() => onRemove(favorite.slug)}>
                <X size={16} aria-hidden="true" />
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function categoryTranslationKey(category: ItemCategory) {
  return {
    weapon: "categoryWeapon",
    warframe: "categoryWarframe",
    mod: "categoryMod",
    relic: "categoryRelic",
    arcane: "categoryArcane",
    companion: "categoryCompanion",
    cosmetic: "categoryCosmetic",
    resource: "categoryResource",
    set: "categorySet",
    other: "categoryOther"
  }[category] as
    | "categoryWeapon"
    | "categoryWarframe"
    | "categoryMod"
    | "categoryRelic"
    | "categoryArcane"
    | "categoryCompanion"
    | "categoryCosmetic"
    | "categoryResource"
    | "categorySet"
    | "categoryOther";
}

export function LibraryPanel({ onOpen, view }: Props) {
  const { language, t } = useI18n();
  const favorites = useLibraryStore((state) => state.favorites);
  const recents = useLibraryStore((state) => state.recents);
  const removeFavorite = useLibraryStore((state) => state.removeFavorite);
  const updateFavoriteAlert = useLibraryStore((state) => state.updateFavoriteAlert);
  const removeRecent = useLibraryStore((state) => state.removeRecent);
  const clearRecents = useLibraryStore((state) => state.clearRecents);
  const [expandedFavorite, setExpandedFavorite] = useState<string | null>(null);

  return (
    <aside className="library-panel context-panel">
      <header className="context-panel-header">
        <div>
          <span className="section-kicker">{t("library")}</span>
          <h2>{view === "favorites" ? t("favorites") : t("recentItemsHeading")}</h2>
        </div>
        {view === "recent" && recents.length > 0 && (
          <button className="icon-button" type="button" aria-label={t("clearRecent")} onClick={clearRecents}>
            <Trash2 size={16} aria-hidden="true" />
          </button>
        )}
      </header>

      {view === "favorites" ? (
        <section className="library-list-section">
          {favorites.length === 0 && <p className="empty-copy">{t("savedItemsEmpty")}</p>}
          {favorites.map((favorite) => (
            <FavoriteCard
              favorite={favorite}
              expanded={expandedFavorite === favorite.slug}
              key={favorite.slug}
              onOpen={onOpen}
              onRemove={removeFavorite}
              onToggleExpanded={(slug) => setExpandedFavorite((current) => (current === slug ? null : slug))}
              onUpdateAlert={updateFavoriteAlert}
            />
          ))}
        </section>
      ) : (
        <section className="library-list-section">
          {recents.length === 0 && <p className="empty-copy">{t("viewedItemsEmpty")}</p>}
          {recents.map((recent) => (
            <div className="library-item recent-row" key={recent.slug}>
              <button type="button" onClick={() => onOpen(recent.slug)}>
                {recent.thumbUrl && <img src={recent.thumbUrl} alt="" />}
                <span>
                  <strong>{recent.name}</strong>
                  <small>{new Date(recent.viewedAt).toLocaleString(language === "ru" ? "ru-RU" : "en-US")}</small>
                </span>
              </button>
              <button className="icon-button" type="button" aria-label={t("removeItem", { name: recent.name })} onClick={() => removeRecent(recent.slug)}>
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
        </section>
      )}
    </aside>
  );
}

function FavoriteCard({
  favorite,
  expanded,
  onOpen,
  onRemove,
  onToggleExpanded,
  onUpdateAlert
}: {
  favorite: FavoriteSnapshot;
  expanded: boolean;
  onOpen: (slug: string) => void;
  onRemove: (slug: string) => void;
  onToggleExpanded: (slug: string) => void;
  onUpdateAlert: (slug: string, direction: "drop" | "rise", price: number | null) => void;
}) {
  const { t } = useI18n();
  const alertsEnabled = favorite.alertDropPrice !== null || favorite.alertRisePrice !== null;

  return (
    <article className={expanded ? "favorite-library-row is-expanded" : "favorite-library-row"}>
      <div className="favorite-library-main">
        <button type="button" onClick={() => onOpen(favorite.slug)}>
          {favorite.thumbUrl && <img src={favorite.thumbUrl} alt="" />}
          <span>
            <strong>{favorite.name}</strong>
            <small>{formatPlatinum(favorite.lastPrice)} · {t("target")} {favoriteTargetPrice(favorite)} pt</small>
          </span>
        </button>
        <button className="icon-button" type="button" aria-label={t("removeItem", { name: favorite.name })} onClick={() => onRemove(favorite.slug)}>
          <X size={15} aria-hidden="true" />
        </button>
      </div>
      <button className="favorite-alert-toggle" type="button" onClick={() => onToggleExpanded(favorite.slug)} aria-expanded={expanded}>
        <span><SlidersHorizontal size={13} aria-hidden="true" /> {alertsEnabled ? t("alertsEnabled") : t("setPriceAlerts")}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {expanded && <AlertInputs favorite={favorite} onUpdateAlert={onUpdateAlert} />}
    </article>
  );
}

function AlertInputs({
  favorite,
  onUpdateAlert
}: {
  favorite: FavoriteSnapshot;
  onUpdateAlert: (slug: string, direction: "drop" | "rise", price: number | null) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="alert-inputs favorite-alert-inputs">
      <label>
        {t("dropAt")}
        <input
          type="number"
          min="1"
          max="999999"
          step="1"
          inputMode="numeric"
          placeholder={t("targetPrice")}
          value={favorite.alertDropPrice ?? ""}
          aria-label={t("dropAlertPrice", { name: favorite.name })}
          onChange={(event) => onUpdateAlert(favorite.slug, "drop", parseAlertPrice(event.target.value))}
        />
      </label>
      <label>
        {t("riseAt")}
        <input
          type="number"
          min="1"
          max="999999"
          step="1"
          inputMode="numeric"
          placeholder={t("targetPrice")}
          value={favorite.alertRisePrice ?? ""}
          aria-label={t("riseAlertPrice", { name: favorite.name })}
          onChange={(event) => onUpdateAlert(favorite.slug, "rise", parseAlertPrice(event.target.value))}
        />
      </label>
    </div>
  );
}

function favoriteTargetPrice(favorite: FavoriteSnapshot): number {
  return favorite.alertDropPrice ?? favorite.alertRisePrice ?? 0;
}

function parseAlertPrice(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.min(Math.round(parsed), 999999);
}
