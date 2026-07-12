import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { MarketItem } from "../../domain/models";
import { searchItems } from "../../domain/search";
import { config } from "../../lib/config";
import { useDebouncedValue } from "../../lib/hooks";

type ItemSearchProps = {
  items: MarketItem[];
  loading: boolean;
  onSelect: (item: MarketItem) => void;
};

export function ItemSearch({ items, loading, onSelect }: ItemSearchProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const debouncedQuery = useDebouncedValue(query, config.searchDebounceMs);
  const results = useMemo(
    () => searchItems(items, debouncedQuery, config.maxSearchResults),
    [items, debouncedQuery]
  );

  function choose(item: MarketItem) {
    onSelect(item);
    setQuery(item.name);
    setActiveIndex(0);
  }

  return (
    <div className="search-shell">
      <label className="search-label" htmlFor="item-search">
        Item search
      </label>
      <div className="search-input-wrap">
        <Search aria-hidden="true" size={20} />
        <input
          id="item-search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((index) => Math.min(index + 1, results.length - 1));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            }
            if (event.key === "Enter" && results[activeIndex]) {
              choose(results[activeIndex]);
            }
          }}
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls="item-results"
          aria-activedescendant={results[activeIndex] ? `item-result-${results[activeIndex].slug}` : undefined}
          placeholder="Search by English or localized item name"
          autoComplete="off"
        />
      </div>
      <div id="item-results" className="search-results" role="listbox" aria-label="Search results">
        {loading && <div className="search-empty">Loading item manifest...</div>}
        {!loading && debouncedQuery && results.length === 0 && <div className="search-empty">No matching items found</div>}
        {results.slice(0, 10).map((item, index) => (
          <button
            id={`item-result-${item.slug}`}
            className={index === activeIndex ? "search-result active" : "search-result"}
            key={item.slug}
            type="button"
            role="option"
            aria-selected={index === activeIndex}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => choose(item)}
          >
            {item.thumbUrl && <img src={item.thumbUrl} alt="" />}
            <span>
              <strong>{item.name}</strong>
              <small>{item.englishName !== item.name ? item.englishName : item.type}</small>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
