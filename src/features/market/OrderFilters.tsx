import type { MarketOrder, OrderFilters as OrderFiltersType } from "../../domain/models";
import { uniquePlatforms, uniqueRanks } from "../../domain/market";
import { useI18n } from "../../lib/i18n";

type Props = {
  orders: MarketOrder[];
  filters: OrderFiltersType;
  onChange: (filters: OrderFiltersType) => void;
};

export function OrderFilters({ orders, filters, onChange }: Props) {
  const { t } = useI18n();
  const platforms = uniquePlatforms(orders);
  const ranks = uniqueRanks(orders);

  return (
    <form className="filters" aria-label={t("orderFilters")}>
      <label>
        {t("type")}
        <select value={filters.type} onChange={(event) => onChange({ ...filters, type: event.target.value as OrderFiltersType["type"] })}>
          <option value="all">{t("all")}</option>
          <option value="sell">{t("sell")}</option>
          <option value="buy">{t("buy")}</option>
        </select>
      </label>
      <label>
        {t("status")}
        <select value={filters.status} onChange={(event) => onChange({ ...filters, status: event.target.value as OrderFiltersType["status"] })}>
          <option value="all">{t("all")}</option>
          <option value="active">{t("onlineIngame")}</option>
          <option value="ingame">{t("ingame")}</option>
          <option value="online">{t("online")}</option>
          <option value="offline">{t("offline")}</option>
        </select>
      </label>
      <label>
        {t("platform")}
        <select value={filters.platform} onChange={(event) => onChange({ ...filters, platform: event.target.value })}>
          <option value="all">{t("all")}</option>
          {platforms.map((platform) => (
            <option key={platform} value={platform}>
              {platform}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("crossPlay")}
        <select value={filters.crossplay} onChange={(event) => onChange({ ...filters, crossplay: event.target.value as OrderFiltersType["crossplay"] })}>
          <option value="all">{t("all")}</option>
          <option value="enabled">{t("enabled")}</option>
          <option value="disabled">{t("disabled")}</option>
        </select>
      </label>
      <label>
        {t("rank")}
        <select
          value={filters.rank}
          onChange={(event) =>
            onChange({ ...filters, rank: event.target.value === "all" ? "all" : Number(event.target.value) })
          }
        >
          <option value="all">{t("all")}</option>
          {ranks.map((rank) => (
            <option key={rank} value={rank}>
              {rank}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("minQty")}
        <input
          type="number"
          min="1"
          value={filters.minQuantity ?? ""}
          onChange={(event) => onChange({ ...filters, minQuantity: event.target.value ? Number(event.target.value) : null })}
        />
      </label>
      <label>
        {t("minPt")}
        <input
          type="number"
          min="0"
          value={filters.minPrice ?? ""}
          onChange={(event) => onChange({ ...filters, minPrice: event.target.value ? Number(event.target.value) : null })}
        />
      </label>
      <label>
        {t("maxPt")}
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
