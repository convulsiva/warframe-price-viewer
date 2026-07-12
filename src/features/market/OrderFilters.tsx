import type { MarketOrder, OrderFilters as OrderFiltersType } from "../../domain/models";
import { uniquePlatforms, uniqueRanks } from "../../domain/market";

type Props = {
  orders: MarketOrder[];
  filters: OrderFiltersType;
  onChange: (filters: OrderFiltersType) => void;
};

export function OrderFilters({ orders, filters, onChange }: Props) {
  const platforms = uniquePlatforms(orders);
  const ranks = uniqueRanks(orders);

  return (
    <form className="filters" aria-label="Order filters">
      <label>
        Type
        <select value={filters.type} onChange={(event) => onChange({ ...filters, type: event.target.value as OrderFiltersType["type"] })}>
          <option value="all">All</option>
          <option value="sell">Sell</option>
          <option value="buy">Buy</option>
        </select>
      </label>
      <label>
        Status
        <select value={filters.status} onChange={(event) => onChange({ ...filters, status: event.target.value as OrderFiltersType["status"] })}>
          <option value="all">All</option>
          <option value="ingame">In game</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>
      </label>
      <label>
        Platform
        <select value={filters.platform} onChange={(event) => onChange({ ...filters, platform: event.target.value })}>
          <option value="all">All</option>
          {platforms.map((platform) => (
            <option key={platform} value={platform}>
              {platform}
            </option>
          ))}
        </select>
      </label>
      <label>
        Cross Play
        <select value={filters.crossplay} onChange={(event) => onChange({ ...filters, crossplay: event.target.value as OrderFiltersType["crossplay"] })}>
          <option value="all">All</option>
          <option value="enabled">Enabled</option>
          <option value="disabled">Disabled</option>
        </select>
      </label>
      <label>
        Rank
        <select
          value={filters.rank}
          onChange={(event) =>
            onChange({ ...filters, rank: event.target.value === "all" ? "all" : Number(event.target.value) })
          }
        >
          <option value="all">All</option>
          {ranks.map((rank) => (
            <option key={rank} value={rank}>
              {rank}
            </option>
          ))}
        </select>
      </label>
      <label>
        Min qty
        <input
          type="number"
          min="1"
          value={filters.minQuantity ?? ""}
          onChange={(event) => onChange({ ...filters, minQuantity: event.target.value ? Number(event.target.value) : null })}
        />
      </label>
      <label>
        Min pt
        <input
          type="number"
          min="0"
          value={filters.minPrice ?? ""}
          onChange={(event) => onChange({ ...filters, minPrice: event.target.value ? Number(event.target.value) : null })}
        />
      </label>
      <label>
        Max pt
        <input
          type="number"
          min="0"
          value={filters.maxPrice ?? ""}
          onChange={(event) => onChange({ ...filters, maxPrice: event.target.value ? Number(event.target.value) : null })}
        />
      </label>
    </form>
  );
}
