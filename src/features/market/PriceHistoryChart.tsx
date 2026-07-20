import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Activity } from "lucide-react";
import { config } from "../../lib/config";
import { historyKey, usePriceHistoryStore } from "./historyStore";
import { useI18n } from "../../lib/i18n";

type Period = "24h" | "7d" | "30d" | "90d";

const PERIODS: Array<{ value: Period; label: string; duration: number }> = [
  { value: "24h", label: "24H", duration: 24 * 60 * 60 * 1000 },
  { value: "7d", label: "7D", duration: 7 * 24 * 60 * 60 * 1000 },
  { value: "30d", label: "30D", duration: 30 * 24 * 60 * 60 * 1000 },
  { value: "90d", label: "90D", duration: 90 * 24 * 60 * 60 * 1000 }
];
const EMPTY_POINTS: never[] = [];

export function PriceHistoryChart({ slug }: { slug: string }) {
  const { language, t } = useI18n();
  const [period, setPeriod] = useState<Period>("24h");
  const points = usePriceHistoryStore((state) => state.series[historyKey(slug, config.platform)] ?? EMPTY_POINTS);
  const activePeriod = PERIODS.find((entry) => entry.value === period) ?? PERIODS[0];
  const data = useMemo(() => {
    const latestTimestamp = points.at(-1)?.timestamp;
    if (!latestTimestamp) return [];
    const cutoff = new Date(latestTimestamp).getTime() - activePeriod.duration;
    return points
      .filter((point) => new Date(point.timestamp).getTime() >= cutoff)
      .map((point) => ({ ...point, time: new Date(point.timestamp).getTime() }));
  }, [activePeriod.duration, points]);

  return (
    <section className="history-panel" aria-labelledby="price-history-title">
      <header className="section-heading">
        <div>
          <span className="section-kicker"><Activity size={14} aria-hidden="true" /> {t("marketMovement")}</span>
          <h3 id="price-history-title">{t("priceHistory")}</h3>
          <p>{t("historyHint")}</p>
        </div>
        <div className="period-control" aria-label={t("historyPeriod")}>
          {PERIODS.map((entry) => (
            <button
              type="button"
              className={period === entry.value ? "is-active" : ""}
              aria-pressed={period === entry.value}
              key={entry.value}
              onClick={() => setPeriod(entry.value)}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </header>
      <div className="chart-stage">
        {data.length < 2 ? (
          <div className="chart-empty">
            <Activity size={22} aria-hidden="true" />
            <strong>{t("historyPreparing")}</strong>
            <span>{t("historyPreparingHint")}</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 12, right: 10, left: 2, bottom: 0 }}>
              <defs>
                <linearGradient id="priceArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
              <XAxis
                dataKey="time"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(value) => formatTick(Number(value), activePeriod.value, language)}
                stroke="var(--text-muted)"
                tickLine={false}
                axisLine={false}
                minTickGap={28}
              />
              <YAxis
                dataKey="lowestSell"
                stroke="var(--text-muted)"
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(value) => `${value} pt`}
              />
              <Tooltip content={<HistoryTooltip language={language} />} cursor={{ stroke: "var(--accent)", strokeOpacity: 0.35 }} />
              <Area
                type="monotone"
                dataKey="lowestSell"
                stroke="var(--accent)"
                strokeWidth={2.5}
                fill="url(#priceArea)"
                activeDot={{ r: 5, fill: "var(--accent)", stroke: "var(--surface-1)", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

function HistoryTooltip({ active, language, payload }: { active?: boolean; language: "en" | "ru"; payload?: Array<{ payload: { timestamp: string; lowestSell: number; medianSell: number | null } }> }) {
  const { t } = useI18n();
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="chart-tooltip">
      <span>{new Date(point.timestamp).toLocaleString(language === "ru" ? "ru-RU" : "en-US")}</span>
      <strong>{point.lowestSell} {t("platinum")}</strong>
      {point.medianSell !== null && <small>{t("median", { value: point.medianSell })}</small>}
    </div>
  );
}

function formatTick(value: number, period: Period, language: "en" | "ru"): string {
  const date = new Date(value);
  const locale = language === "ru" ? "ru-RU" : "en-US";
  return period === "24h"
    ? date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString(locale, { month: "short", day: "numeric" });
}
