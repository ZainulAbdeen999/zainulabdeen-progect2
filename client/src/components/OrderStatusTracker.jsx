import { useEffect, useState } from "react";
import { ORDER_FLOW, formatDateTime, stepIndex } from "../lib/format";
import { BikeIcon, CheckIcon, HomeIcon, PhoneIcon, PizzaIcon } from "./Icons";

/**
 * Returns the milliseconds left until `etaAt`, recalculated every second.
 * `serverOffset` corrects a customer's clock against the API clock so the
 * countdown is accurate on every device.
 */
function useCountdown(etaAt, active, serverOffset) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active || !etaAt) return undefined;

    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [etaAt, active, serverOffset]);

  if (!etaAt) return null;
  return new Date(etaAt).getTime() - (now + serverOffset);
}

function formatCountdown(remaining) {
  if (remaining === null) return "Soon";
  if (remaining <= 0) return "Any moment";

  const totalSeconds = Math.ceil(remaining / 1000);

  if (totalSeconds > 3600) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.ceil((totalSeconds % 3600) / 60);
    return `${hours} hr ${minutes} min`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Live delivery panel (Mirpur Khas delivery flow).
 * Shows the rider, a ticking ETA and an animated kitchen → door route for
 * orders that have left the oven. Hidden for pending/cancelled orders.
 */
function DeliveryLive({ order, serverOffset }) {
  const delivery = order.delivery || {};
  const status = order.status;
  const delivered = status === "Delivered";
  const dispatched = status === "Sent to Delivery" || delivered;
  const remaining = useCountdown(delivery.etaAt, !delivered, serverOffset);

  const phase = delivered ? "done" : dispatched ? "moving" : "preparing";
  const title = delivered
    ? "Delivered"
    : dispatched
      ? delivery.driverName || "Your rider is on the way"
      : "In the oven";
  const subtitle = delivered
    ? "Enjoy your pizza — thanks for ordering in Mirpur Khas."
    : dispatched
      ? `Heading to ${order.address?.city || "Mirpur Khas"}${
          delivery.driverPhone ? " · call the rider if needed" : ""
        }`
      : "We’re boxing your order now. A rider will be assigned next.";

  const phoneDigits = String(delivery.driverPhone || "").replace(/[^\d+]/g, "");

  return (
    <div className={`delivery-live delivery-${phase}`}>
      <div className="delivery-live-head">
        <div className="delivery-rider">
          <span className="delivery-rider-icon" aria-hidden="true">
            {delivered ? (
              <CheckIcon size={20} />
            ) : dispatched ? (
              <BikeIcon size={20} />
            ) : (
              <PizzaIcon size={20} />
            )}
          </span>
          <div className="delivery-rider-copy">
            <strong>
              {title}
              {dispatched && !delivered && (
                <span className="delivery-live-badge">
                  <i aria-hidden="true" />
                  Live
                </span>
              )}
            </strong>
            <span>{subtitle}</span>
          </div>
        </div>

        <div className="delivery-eta">
          <span className="delivery-eta-label">
            {delivered ? "Delivered at" : "Estimated arrival"}
          </span>
          <strong>
            {delivered
              ? formatDateTime(delivery.deliveredAt) || "Just now"
              : formatCountdown(remaining)}
          </strong>
          {!delivered && delivery.etaAt && (
            <span className="delivery-eta-clock">
              around {formatDateTime(delivery.etaAt)}
            </span>
          )}
        </div>
      </div>

      <div className="delivery-route" aria-hidden="true">
        <span className="route-node">
          <PizzaIcon size={15} />
          <em>Kitchen</em>
        </span>
        <span className="route-track">
          <i className="route-dash" />
          <b className="route-rider">
            <BikeIcon size={16} />
          </b>
        </span>
        <span className="route-node">
          <HomeIcon size={15} />
          <em>Your door</em>
        </span>
      </div>

      {(delivery.driverName || delivery.driverPhone) && !delivered && (
        <div className="delivery-contact">
          <span>
            {delivery.driverName ? `Rider: ${delivery.driverName}` : "Rider assigned"}
          </span>
          {phoneDigits && (
            <a href={`tel:${phoneDigits}`}>
              <PhoneIcon size={14} />
              Call rider
            </a>
          )}
        </div>
      )}

      {delivery.note && <p className="delivery-note">{delivery.note}</p>}
    </div>
  );
}

export default function OrderStatusTracker({ order, serverOffset = 0 }) {
  const latest = order.statusHistory?.[order.statusHistory.length - 1];

  if (order.status === "Cancelled") {
    return (
      <div className="tracker tracker-message tracker-cancelled">
        <strong>Order cancelled</strong>
        <span>
          {latest?.note || "This order was cancelled."}
          {latest?.at ? ` · ${formatDateTime(latest.at)}` : ""}
        </span>
      </div>
    );
  }

  if (order.status === "Pending Payment") {
    return (
      <div className="tracker tracker-message tracker-pending">
        <strong>Waiting for payment</strong>
        <span>Complete checkout to send this order to the kitchen.</span>
      </div>
    );
  }

  const current = stepIndex(order.status);
  const showLive = ["In Kitchen", "Sent to Delivery", "Delivered"].includes(
    order.status
  );

  return (
    <>
      <ol className="tracker" aria-label={`Order status: ${order.status}`}>
        {ORDER_FLOW.map((step, index) => {
          const state =
            index < current ? "done" : index === current ? "current" : "todo";
          return (
            <li key={step} className={`tracker-step ${state}`}>
              <span className="tracker-dot" aria-hidden="true">
                {index < current ? <CheckIcon size={14} /> : index + 1}
              </span>
              <span className="tracker-label">{step}</span>
            </li>
          );
        })}
      </ol>

      {/* Live tracker appears once the kitchen starts preparing the order. */}
      {showLive && <DeliveryLive order={order} serverOffset={serverOffset} />}
    </>
  );
}
