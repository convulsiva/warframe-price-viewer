import { Check, Copy, ThumbsUp } from "lucide-react";
import { useState } from "react";
import type { MarketOrder } from "../../domain/models";
import { whisperCommand } from "../library/priceAlerts";
import { writeClipboardText } from "../../lib/clipboard";
import { formatDateTime } from "../../lib/format";
import { useI18n } from "../../lib/i18n";

type Props = {
  title: string;
  orders: MarketOrder[];
  itemName: string;
};

export function OrderList({ title, orders, itemName }: Props) {
  const { language, t } = useI18n();
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  async function copyWhisper(order: MarketOrder) {
    if (!order.user) return;
    await writeClipboardText(whisperCommand(itemName, order.user.name, order.platinum));
    setCopiedOrderId(order.id);
    window.setTimeout(() => setCopiedOrderId((current) => (current === order.id ? null : current)), 1_500);
  }

  return (
    <section className="order-panel">
      <h3>{title}</h3>
      {orders.length === 0 ? (
        <p className="empty-copy">{t("noFilteredOrders")}</p>
      ) : (
        <div className="order-table" role="table" aria-label={title}>
          <div className="order-row head" role="row">
            <span>{t("price")}</span>
            <span>{t("user")}</span>
            <span>{t("status")}</span>
            <span>{t("qty")}</span>
            <span>{t("rank")}</span>
            <span>{t("updated")}</span>
          </div>
          {orders.slice(0, 12).map((order) => (
            <div className="order-row" role="row" key={order.id}>
              <strong>{order.platinum} pt</strong>
              <span className="seller-cell">
                <span className="seller-identity">
                  <span>{order.user?.name ?? t("unknown")}</span>
                  {order.user && (
                    <small className="seller-reputation" title={t("reputation")} aria-label={`${t("reputation")}: ${order.user.reputation}`}>
                      <ThumbsUp size={11} aria-hidden="true" />
                      {order.user.reputation > 0 ? `+${order.user.reputation}` : order.user.reputation}
                    </small>
                  )}
                </span>
                {order.type === "sell" && order.user && (
                  <button
                    type="button"
                    className="copy-whisper-button"
                    onClick={() => {
                      void copyWhisper(order);
                    }}
                    aria-label={t("copyWhisperFor", { name: order.user.name })}
                    title={t("copyWhisper")}
                  >
                    {copiedOrderId === order.id ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
                    {copiedOrderId === order.id ? t("copied") : t("copy")}
                  </button>
                )}
              </span>
              <span className={`status-dot ${order.user?.status ?? "offline"}`}>{order.user?.status === "ingame" ? t("ingame") : order.user?.status === "online" ? t("online") : t("offline")}</span>
              <span>{order.quantity}</span>
              <span>{order.rank ?? "-"}</span>
              <span>{formatDateTime(order.updatedAt, language)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
