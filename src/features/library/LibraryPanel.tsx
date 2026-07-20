import { ChevronDown, SlidersHorizontal, Star, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { FavoriteSnapshot, MarketItem } from "../../domain/models";
import { formatPlatinum } from "../../lib/format";
import { useLibraryStore } from "./store";
import { useI18n } from "../../lib/i18n";

type Props = {
  onOpen: (slug: string) => void;
  selected: MarketItem | null;
  view: "favorites" | "recent";
};

type FavoriteSort = "added" | "name" | "price";

export function FavoritesPanel({ onOpen }: { onOpen: (slug: string) => void }) {
  const { language, t } = useI18n();
  const favorites = useLibraryStore((state) => state.favorites);
  const removeFavorite = useLibraryStore((state) => state.removeFavorite);
  const updateFavoriteAlert = useLibraryStore((state) => state.updateFavoriteAlert);
  const [sort, setSort] = useState<FavoriteSort>("added");
  const sortedFavorites = useMemo(() => {
    return [...favorites].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, language === "ru" ? "ru" : "en");
      if (sort === "price") return (a.lastPrice ?? Number.MAX_SAFE_INTEGER) - (b.lastPrice ?? Number.MAX_SAFE_INTEGER);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [favorites, language, sort]);

  return (
    <section className="favorites-page full-page-panel">
      <header className="full-page-header favorites-page-header">
        <div>
          <span className="section-kicker">{t("savedItems")}</span>
          <h2><Star size={20} aria-hidden="true" /> {t("favorites")}</h2>
          <p>{t("manageSaved")}</p>
        </div>
        <label className="favorites-sort-control">
          <span>{t("sort")}</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as FavoriteSort)}>
            <option value="added">{t("timeAdded")}</option>
            <option value="name">{t("name")}</option>
            <option value="price">{t("sortPrice")}</option>
          </select>
        </label>
      </header>
      <div className="favorites-page-list">
        {sortedFavorites.length === 0 && <p className="empty-copy">{t("savedItemsEmpty")}</p>}
        {sortedFavorites.map((favorite) => (
          <article className="favorite-page-row" key={favorite.slug}>
            <button className="favorite-page-item" type="button" onClick={() => onOpen(favorite.slug)}>
              {favorite.thumbUrl && <img src={favorite.thumbUrl} alt="" />}
              <span>
                <strong>{favorite.name}</strong>
                <small>{formatPlatinum(favorite.lastPrice)} · {t("target")} {favoriteTargetPrice(favorite)} pt</small>
              </span>
            </button>
            <AlertInputs favorite={favorite} onUpdateAlert={updateFavoriteAlert} />
            <button className="icon-button" type="button" aria-label={t("removeItem", { name: favorite.name })} onClick={() => removeFavorite(favorite.slug)}>
              <X size={16} aria-hidden="true" />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
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
