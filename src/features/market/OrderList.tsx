import { Copy } from "lucide-react";
import type { MarketOrder } from "../../domain/models";
import { whisperCommand } from "../library/priceAlerts";
import { writeClipboardText } from "../../lib/clipboard";
import { formatDateTime } from "../../lib/format";

type Props = {
  title: string;
  orders: MarketOrder[];
  itemName: string;
};

export function OrderList({ title, orders, itemName }: Props) {
  async function copyWhisper(order: MarketOrder) {
    if (!order.user) return;
    await writeClipboardText(whisperCommand(itemName, order.user.name, order.platinum));
  }

  return (
    <section className="order-panel">
      <h3>{title}</h3>
      {orders.length === 0 ? (
        <p className="empty-copy">No active orders match these filters.</p>
      ) : (
        <div className="order-table" role="table" aria-label={title}>
          <div className="order-row head" role="row">
            <span>Price</span>
            <span>User</span>
            <span>Status</span>
            <span>Qty</span>
            <span>Rank</span>
            <span>Updated</span>
          </div>
          {orders.slice(0, 12).map((order) => (
            <div className="order-row" role="row" key={order.id}>
              <strong>{order.platinum} pt</strong>
              <span className="seller-cell">
                <span>{order.user?.name ?? "Unknown"}</span>
                {order.type === "sell" && order.user && (
                  <button
                    type="button"
                    className="copy-whisper-button"
                    onClick={() => {
                      void copyWhisper(order);
                    }}
                    aria-label={`Copy whisper for ${order.user.name}`}
                    title="Copy whisper"
                  >
                    <Copy size={13} aria-hidden="true" />
                    Copy
                  </button>
                )}
              </span>
              <span className={`status-dot ${order.user?.status ?? "offline"}`}>{order.user?.status ?? "offline"}</span>
              <span>{order.quantity}</span>
              <span>{order.rank ?? "-"}</span>
              <span>{formatDateTime(order.updatedAt)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
