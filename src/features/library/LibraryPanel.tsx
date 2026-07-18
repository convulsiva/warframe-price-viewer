import { ChevronDown, Search, SlidersHorizontal, Star, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { FavoriteSnapshot, MarketItem } from "../../domain/models";
import { formatPlatinum } from "../../lib/format";
import { useLibraryStore } from "./store";

type Props = {
  onOpen: (slug: string) => void;
  selected: MarketItem | null;
};

type FavoriteSort = "added" | "name" | "price";
type FavoriteFilter = "all" | "alerts-enabled" | "alerts-disabled";

const FAVORITE_PREVIEW_LIMIT = 5;

export function LibraryPanel({ onOpen }: Props) {
  const favorites = useLibraryStore((state) => state.favorites);
  const recents = useLibraryStore((state) => state.recents);
  const removeFavorite = useLibraryStore((state) => state.removeFavorite);
  const updateFavoriteAlert = useLibraryStore((state) => state.updateFavoriteAlert);
  const removeRecent = useLibraryStore((state) => state.removeRecent);
  const clearRecents = useLibraryStore((state) => state.clearRecents);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [expandedFavorite, setExpandedFavorite] = useState<string | null>(null);
  const previewFavorites = favorites.slice(0, FAVORITE_PREVIEW_LIMIT);

  return (
    <>
      <aside className="library-panel">
        <section>
          <div className="section-title-row">
            <h2>
              <Star size={18} aria-hidden="true" /> Favorites
            </h2>
            {favorites.length > FAVORITE_PREVIEW_LIMIT && <span className="section-count">{favorites.length}</span>}
          </div>
          {favorites.length === 0 && <p className="empty-copy">Saved items will appear here.</p>}
          {previewFavorites.map((favorite) => (
            <FavoriteCard
              favorite={favorite}
              key={favorite.slug}
              onOpen={onOpen}
              onRemove={removeFavorite}
              onUpdateAlert={updateFavoriteAlert}
            />
          ))}
          {favorites.length > FAVORITE_PREVIEW_LIMIT && (
            <button className="view-all-button" type="button" onClick={() => setIsFavoritesOpen(true)}>
              View all
              <span>{favorites.length - FAVORITE_PREVIEW_LIMIT} more</span>
            </button>
          )}
        </section>
        <section>
          <div className="section-title-row">
            <h2>Recent</h2>
            {recents.length > 0 && (
              <button className="icon-button" type="button" aria-label="Clear recent items" onClick={clearRecents}>
                <Trash2 size={16} aria-hidden="true" />
              </button>
            )}
          </div>
          {recents.length === 0 && <p className="empty-copy">Viewed items will appear here.</p>}
          {recents.map((recent) => (
            <div className="library-item" key={recent.slug}>
              <button type="button" onClick={() => onOpen(recent.slug)}>
                {recent.thumbUrl && <img src={recent.thumbUrl} alt="" />}
                <span>
                  <strong>{recent.name}</strong>
                  <small>{new Date(recent.viewedAt).toLocaleString()}</small>
                </span>
              </button>
              <button className="icon-button" type="button" aria-label={`Remove ${recent.name}`} onClick={() => removeRecent(recent.slug)}>
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
        </section>
      </aside>
      {isFavoritesOpen &&
        createPortal(
          <FavoritesDialog
            favorites={favorites}
            expandedFavorite={expandedFavorite}
            onClose={() => setIsFavoritesOpen(false)}
            onOpenItem={(slug) => {
              onOpen(slug);
              setIsFavoritesOpen(false);
            }}
            onRemove={removeFavorite}
            onToggleExpanded={(slug) => setExpandedFavorite((current) => (current === slug ? null : slug))}
            onUpdateAlert={updateFavoriteAlert}
          />,
          document.body
        )}
    </>
  );
}

function FavoritesDialog({
  favorites,
  expandedFavorite,
  onClose,
  onOpenItem,
  onRemove,
  onToggleExpanded,
  onUpdateAlert
}: {
  favorites: FavoriteSnapshot[];
  expandedFavorite: string | null;
  onClose: () => void;
  onOpenItem: (slug: string) => void;
  onRemove: (slug: string) => void;
  onToggleExpanded: (slug: string) => void;
  onUpdateAlert: (slug: string, direction: "drop" | "rise", price: number | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<FavoriteSort>("added");
  const [filter, setFilter] = useState<FavoriteFilter>("all");

  const visibleFavorites = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const filtered = favorites.filter((favorite) => {
      const hasAlerts = favorite.alertDropPrice !== null || favorite.alertRisePrice !== null;
      if (filter === "alerts-enabled" && !hasAlerts) return false;
      if (filter === "alerts-disabled" && hasAlerts) return false;
      if (normalizedQuery && !favorite.name.toLocaleLowerCase().includes(normalizedQuery)) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "price") return priceForSort(a) - priceForSort(b);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [favorites, filter, query, sort]);

  return (
    <div className="favorites-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="favorites-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="favorites-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="favorites-modal-header">
          <div>
            <p className="eyebrow">Saved items</p>
            <h2 id="favorites-dialog-title">Favorites library</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close favorites library" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="favorites-toolbar">
          <label className="favorites-search">
            <Search size={16} aria-hidden="true" />
            <input value={query} placeholder="Search saved items" onChange={(event) => setQuery(event.target.value)} />
          </label>
          <div className="favorites-toolbar-controls">
            <label>
              <span>Sort</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as FavoriteSort)}>
                <option value="added">Time added</option>
                <option value="name">Name</option>
                <option value="price">Price</option>
              </select>
            </label>
            <label>
              <span>Filter</span>
              <select value={filter} onChange={(event) => setFilter(event.target.value as FavoriteFilter)}>
                <option value="all">All</option>
                <option value="alerts-enabled">Alerts enabled</option>
                <option value="alerts-disabled">Alerts disabled</option>
              </select>
            </label>
          </div>
        </div>

        <div className="favorites-list" aria-live="polite">
          {visibleFavorites.length === 0 && <p className="empty-copy">No saved items match this view.</p>}
          {visibleFavorites.map((favorite) => (
            <FavoriteRow
              favorite={favorite}
              expanded={expandedFavorite === favorite.slug}
              key={favorite.slug}
              onOpen={onOpenItem}
              onRemove={onRemove}
              onToggleExpanded={onToggleExpanded}
              onUpdateAlert={onUpdateAlert}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function FavoriteCard({
  favorite,
  onOpen,
  onRemove,
  onUpdateAlert
}: {
  favorite: FavoriteSnapshot;
  onOpen: (slug: string) => void;
  onRemove: (slug: string) => void;
  onUpdateAlert: (slug: string, direction: "drop" | "rise", price: number | null) => void;
}) {
  const targetPrice = favoriteTargetPrice(favorite);

  return (
    <div className="library-item" key={favorite.slug}>
      <div className="favorite-content">
        <button type="button" onClick={() => onOpen(favorite.slug)}>
          {favorite.thumbUrl && <img src={favorite.thumbUrl} alt="" />}
          <span>
            <strong>{favorite.name}</strong>
            <small>
              {formatPlatinum(favorite.lastPrice)} ({targetPrice})
            </small>
          </span>
        </button>
        <AlertInputs favorite={favorite} onUpdateAlert={onUpdateAlert} />
      </div>
      <button className="icon-button" type="button" aria-label={`Remove ${favorite.name}`} onClick={() => onRemove(favorite.slug)}>
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

function FavoriteRow({
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
  const alertsEnabled = favorite.alertDropPrice !== null || favorite.alertRisePrice !== null;
  const targetPrice = favoriteTargetPrice(favorite);

  return (
    <article className={expanded ? "favorite-row is-expanded" : "favorite-row"}>
      <button className="favorite-row-main" type="button" onClick={() => onOpen(favorite.slug)}>
        {favorite.thumbUrl && <img src={favorite.thumbUrl} alt="" />}
        <span className="favorite-row-name">{favorite.name}</span>
      </button>
      <div className="favorite-row-details">
        <span className="favorite-row-price">
          {formatPlatinum(favorite.lastPrice)} <small>({targetPrice})</small>
        </span>
        <span className={alertsEnabled ? "alert-status is-on" : "alert-status"}>{alertsEnabled ? "Alerts enabled" : "Alerts disabled"}</span>
        <div className="favorite-row-actions">
          <button className="row-settings-button" type="button" onClick={() => onToggleExpanded(favorite.slug)}>
            <SlidersHorizontal size={14} aria-hidden="true" />
            Alerts
            <ChevronDown size={14} aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" aria-label={`Remove ${favorite.name}`} onClick={() => onRemove(favorite.slug)}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="favorite-row-alerts">
          <AlertInputs favorite={favorite} onUpdateAlert={onUpdateAlert} />
        </div>
      )}
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
  return (
    <div className="alert-inputs">
      <label>
        {"Drop <="}
        <input
          type="number"
          min="1"
          max="999999"
          step="1"
          inputMode="numeric"
          placeholder="Target price"
          value={favorite.alertDropPrice ?? ""}
          aria-label={`${favorite.name} drop alert price`}
          onChange={(event) => onUpdateAlert(favorite.slug, "drop", parseAlertPrice(event.target.value))}
        />
      </label>
      <label>
        {"Rise >="}
        <input
          type="number"
          min="1"
          max="999999"
          step="1"
          inputMode="numeric"
          placeholder="Target price"
          value={favorite.alertRisePrice ?? ""}
          aria-label={`${favorite.name} rise alert price`}
          onChange={(event) => onUpdateAlert(favorite.slug, "rise", parseAlertPrice(event.target.value))}
        />
      </label>
    </div>
  );
}

function favoriteTargetPrice(favorite: FavoriteSnapshot): number {
  return favorite.alertDropPrice ?? favorite.alertRisePrice ?? 0;
}

function priceForSort(favorite: FavoriteSnapshot): number {
  return favorite.lastPrice ?? Number.MAX_SAFE_INTEGER;
}

function parseAlertPrice(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.min(Math.round(parsed), 999999);
}
