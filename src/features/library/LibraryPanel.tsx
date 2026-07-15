import { Star, Trash2, X } from "lucide-react";
import type { MarketItem } from "../../domain/models";
import { formatPlatinum } from "../../lib/format";
import { SettingsPanel } from "../settings/SettingsPanel";
import { useLibraryStore } from "./store";

type Props = {
  onOpen: (slug: string) => void;
  selected: MarketItem | null;
};

export function LibraryPanel({ onOpen }: Props) {
  const favorites = useLibraryStore((state) => state.favorites);
  const recents = useLibraryStore((state) => state.recents);
  const removeFavorite = useLibraryStore((state) => state.removeFavorite);
  const updateFavoriteAlert = useLibraryStore((state) => state.updateFavoriteAlert);
  const removeRecent = useLibraryStore((state) => state.removeRecent);
  const clearRecents = useLibraryStore((state) => state.clearRecents);

  return (
    <aside className="library-panel">
      <section>
        <h2>
          <Star size={18} aria-hidden="true" /> Favorites
        </h2>
        {favorites.length === 0 && <p className="empty-copy">Saved items will appear here.</p>}
        {favorites.map((favorite) => {
          const delta =
            favorite.lastPrice !== null && favorite.previousPrice !== null ? favorite.lastPrice - favorite.previousPrice : null;
          return (
            <div className="library-item" key={favorite.slug}>
              <div className="favorite-content">
                <button type="button" onClick={() => onOpen(favorite.slug)}>
                  {favorite.thumbUrl && <img src={favorite.thumbUrl} alt="" />}
                  <span>
                    <strong>{favorite.name}</strong>
                    <small>
                      {formatPlatinum(favorite.lastPrice)}
                      {delta !== null ? ` (${delta >= 0 ? "+" : ""}${delta})` : ""}
                    </small>
                  </span>
                </button>
                <div className="alert-inputs">
                  <label>
                    {"Drop <="}
                    <input
                      type="number"
                      min="1"
                      max="999999"
                      step="1"
                      inputMode="numeric"
                      placeholder="7"
                      value={favorite.alertDropPrice ?? ""}
                      aria-label={`${favorite.name} drop alert price`}
                      onChange={(event) => updateFavoriteAlert(favorite.slug, "drop", parseAlertPrice(event.target.value))}
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
                      placeholder="15"
                      value={favorite.alertRisePrice ?? ""}
                      aria-label={`${favorite.name} rise alert price`}
                      onChange={(event) => updateFavoriteAlert(favorite.slug, "rise", parseAlertPrice(event.target.value))}
                    />
                  </label>
                </div>
              </div>
              <button className="icon-button" type="button" aria-label={`Remove ${favorite.name}`} onClick={() => removeFavorite(favorite.slug)}>
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          );
        })}
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
      <SettingsPanel />
    </aside>
  );
}

function parseAlertPrice(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.min(Math.round(parsed), 999999);
}
