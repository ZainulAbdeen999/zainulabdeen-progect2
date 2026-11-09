import { useCallback, useEffect, useState } from "react";
import { api, apiMessage } from "../../lib/api";
import { formatDateTime, inr, statusTone } from "../../lib/format";

const STATUSES = [
  "Pending Payment",
  "Order Received",
  "In Kitchen",
  "Sent to Delivery",
  "Delivered",
  "Cancelled"
];

const NEXT_STATUS = {
  "Order Received": "In Kitchen",
  "In Kitchen": "Sent to Delivery",
  "Sent to Delivery": "Delivered"
};

/**
 * Inline live-tracking editor for the admin console.
 * Inputs are uncontrolled so the 10-second polling refresh does not overwrite
 * whatever the admin is typing. The `key` remounts the form after a save when
 * the stored ETA changes, keeping the minute value in sync.
 */
function DeliveryEditor({ order, busy, onSave }) {
  if (["Pending Payment", "Delivered", "Cancelled"].includes(order.status)) {
    return null;
  }

  const etaMinutes = order.delivery?.etaAt
    ? Math.max(
        1,
        Math.round((new Date(order.delivery.etaAt) - Date.now()) / 60000)
      )
    : 30;

  return (
    <form
      className="admin-delivery"
      key={`${order._id}-${order.delivery?.etaAt || "no-eta"}`}
      onSubmit={(event) => onSave(order, event)}
    >
      <div className="admin-delivery-head">
        <h4>Live tracking · Mirpur Khas</h4>
        <span>
          {order.delivery?.etaAt
            ? `ETA ${formatDateTime(order.delivery.etaAt)}`
            : "No ETA set yet"}
        </span>
      </div>

      <div className="admin-delivery-grid">
        <label className="field">
          <span>Rider name</span>
          <input
            name="driverName"
            type="text"
            defaultValue={order.delivery?.driverName || ""}
            placeholder="e.g. Ali Raza"
          />
        </label>
        <label className="field">
          <span>Rider phone</span>
          <input
            name="driverPhone"
            type="tel"
            defaultValue={order.delivery?.driverPhone || ""}
            placeholder="03xx xxxxxxx"
          />
        </label>
        <label className="field">
          <span>ETA (minutes)</span>
          <input
            name="etaMinutes"
            type="number"
            min="1"
            max="240"
            defaultValue={etaMinutes}
          />
        </label>
        <label className="field">
          <span>Note</span>
          <input
            name="note"
            type="text"
            defaultValue={order.delivery?.note || ""}
            placeholder="Rider will call on arrival"
          />
        </label>
      </div>

      <div className="admin-delivery-actions">
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
          {busy ? "Saving…" : "Save tracking"}
        </button>
        <span className="admin-hint">
          Customers see the rider and countdown live on “My orders”.
        </span>
      </div>
    </form>
  );
}

/*
 * Rider assignment control (added with the rider system).
 * The admin can hand an order to a rider, or unassign it so it returns to the
 * riders' available queue. Assignment is locked after pickup, matching the API.
 */
function RiderAssign({ order, riders, busy, onAssign }) {
  if (["Delivered", "Cancelled"].includes(order.status)) return null;

  const assignedId = order.rider?._id || order.rider || "";
  const locked = order.status === "Sent to Delivery";

  return (
    <div className="admin-rider-assign">
      <div className="admin-rider-assign-head">
        <h4>Rider</h4>
        <span>
          {order.rider?.name
            ? `Assigned to ${order.rider.name}`
            : "Unassigned — visible in the rider queue"}
        </span>
      </div>

      <div className="admin-rider-assign-row">
        <label className="field">
          <span>Assign rider</span>
          <select
            value={assignedId}
            disabled={busy || locked}
            onChange={(event) => onAssign(order, event.target.value)}
          >
            <option value="">Unassigned</option>
            {riders.map((rider) => (
              <option key={rider.id} value={rider.id}>
                {rider.name}
                {rider.active ? "" : " (inactive)"}
                {rider.stats?.active ? ` · ${rider.stats.active} active` : ""}
              </option>
            ))}
          </select>
        </label>

        {locked && (
          <p className="admin-hint">
            The rider cannot be changed after the order is picked up.
          </p>
        )}
      </div>
    </div>
  );
}

/*
 * Delivery OTP panel (added with the rider system).
 * The admin can see the code (for phone support) and reset the attempt counter
 * if a rider locks the order after five wrong tries.
 */
function AdminOtp({ order, busy, onReset }) {
  const delivery = order.delivery || {};
  const otp = delivery.otp;
  const attempts = delivery.otpAttempts || 0;

  if (!otp && !attempts && !delivery.otpLocked) return null;

  return (
    <div className={`admin-otp ${delivery.otpLocked ? "is-locked" : ""}`}>
      <div className="admin-otp-code">
        <span>Delivery OTP</span>
        <strong>{otp || "—"}</strong>
        <small>The customer shares this with the rider on arrival.</small>
      </div>

      <div className="admin-otp-meta">
        <span>
          {delivery.otpVerifiedAt
            ? `Verified ${formatDateTime(delivery.otpVerifiedAt)}`
            : delivery.otpLocked
              ? "Locked after 5 wrong attempts"
              : `${attempts} wrong attempt${attempts === 1 ? "" : "s"}`}
        </span>

        {(attempts > 0 || delivery.otpLocked) && !delivery.otpVerifiedAt && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={busy}
            onClick={() => onReset(order)}
          >
            {busy ? "Resetting…" : "Reset OTP attempts"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminOrders() {
  const [orders, setOrders] = useState(null);
  // Rider list powers the assignment dropdown (added with the rider system).
  const [riders, setRiders] = useState([]);
  const [filter, setFilter] = useState("All");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [actionId, setActionId] = useState("");

  const load = useCallback(async (status = filter) => {
    try {
      const query = status === "All" ? "" : `?status=${encodeURIComponent(status)}`;
      // Orders and riders load together so the dropdown is always populated.
      const [ordersResponse, ridersResponse] = await Promise.all([
        api.get(`/admin/orders${query}`),
        api.get("/admin/riders")
      ]);
      setOrders(ordersResponse.data.orders);
      setRiders(ridersResponse.data.riders);
      setError("");
    } catch (err) {
      setError(apiMessage(err));
    }
  }, [filter]);

  useEffect(() => {
    let alive = true;
    let timer;

    async function tick() {
      try {
        const query =
          filter === "All" ? "" : `?status=${encodeURIComponent(filter)}`;
        const [ordersResponse, ridersResponse] = await Promise.all([
          api.get(`/admin/orders${query}`),
          api.get("/admin/riders")
        ]);
        if (!alive) return;
        setOrders(ordersResponse.data.orders);
        setRiders(ridersResponse.data.riders);
        setError("");
      } catch (err) {
        if (alive) setError(apiMessage(err));
      }
    }

    tick();
    timer = window.setInterval(tick, 10000);

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [filter]);

  async function move(order, status) {
    setActionId(order._id);
    setNotice("");
    setError("");

    try {
      const { data } = await api.patch(`/admin/orders/${order._id}/status`, { status });
      setNotice(data.message);
      await load();
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setActionId("");
    }
  }

  async function cancel(order) {
    if (!window.confirm(`Cancel order ${order.orderNumber}? Stock will be returned.`)) {
      return;
    }
    await move(order, "Cancelled");
  }

  /**
   * Save rider name, phone, note and ETA. The server turns `etaMinutes` into an
   * absolute timestamp so all customers see the same countdown.
   */
  async function saveDelivery(order, event) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const eta = String(formData.get("etaMinutes") || "").trim();
    const payload = {
      driverName: String(formData.get("driverName") || "").trim(),
      driverPhone: String(formData.get("driverPhone") || "").trim(),
      note: String(formData.get("note") || "").trim()
    };

    if (eta) payload.etaMinutes = Number(eta);

    setActionId(order._id);
    setNotice("");
    setError("");

    try {
      const { data } = await api.patch(
        `/admin/orders/${order._id}/delivery`,
        payload
      );
      setNotice(data.message);
      await load();
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setActionId("");
    }
  }

  /**
   * Assign or unassign a rider (added with the rider system).
   * An empty value sends the order back to the riders' available queue.
   */
  async function assignRider(order, riderId) {
    setActionId(order._id);
    setNotice("");
    setError("");

    try {
      const { data } = await api.patch(`/admin/orders/${order._id}/assign`, {
        riderId
      });
      setNotice(data.message);
      await load();
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setActionId("");
    }
  }

  /* Reset the OTP attempt counter after a rider locks an order. */
  async function resetOtp(order) {
    setActionId(order._id);
    setNotice("");
    setError("");

    try {
      const { data } = await api.post(`/admin/orders/${order._id}/otp/reset`);
      setNotice(data.message);
      await load();
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setActionId("");
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h2>Orders</h2>
          <p>Move paid orders through the kitchen. Customers see updates within six seconds.</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => load()}>
          Refresh
        </button>
      </header>

      <div className="filter-chips" role="group" aria-label="Filter orders">
        {["All", ...STATUSES].map((status) => (
          <button
            key={status}
            type="button"
            className={`chip ${filter === status ? "is-active" : ""}`}
            aria-pressed={filter === status}
            onClick={() => setFilter(status)}
          >
            {status}
          </button>
        ))}
      </div>

      {error && (
        <div className="notice notice-error" role="alert">
          <p>{error}</p>
        </div>
      )}
      {notice && (
        <div className="notice notice-success">
          <p>{notice}</p>
        </div>
      )}

      {!orders && !error && (
        <div className="admin-loading">
          <span className="spinner" aria-hidden="true" />
          <p>Loading orders…</p>
        </div>
      )}

      {orders && orders.length === 0 && (
        <div className="panel panel-empty-state">
          <h3>No orders in this view</h3>
          <p>New orders will appear here automatically.</p>
        </div>
      )}

      {orders && orders.length > 0 && (
        <div className="admin-order-list">
          {orders.map((order) => {
            const next = NEXT_STATUS[order.status];
            const canCancel = !["Delivered", "Cancelled"].includes(order.status);
            const busy = actionId === order._id;

            return (
              <article className="admin-order" key={order._id}>
                <header className="admin-order-head">
                  <div>
                    <p className="order-number">{order.orderNumber}</p>
                    <p className="order-date">
                      {formatDateTime(order.createdAt)} · {order.user?.name || order.address.fullName}
                      {order.user?.email ? ` · ${order.user.email}` : ""}
                    </p>
                  </div>
                  <div className="admin-order-badges">
                    {/* Payment method badge (added with COD support). */}
                    <span
                      className={`rider-pay ${
                        order.payment.method === "cod" ? "is-cod" : "is-online"
                      }`}
                    >
                      {order.payment.method === "cod" ? "COD" : "Online"}
                    </span>
                    <span className={`status-pill status-${statusTone(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </header>

                <div className="admin-order-grid">
                  <div>
                    <h4>Items</h4>
                    <ul className="admin-order-items">
                      {order.items.map((item, index) => (
                        <li key={`${order._id}-${index}`}>
                          <span>
                            {item.quantity} × {item.name}
                            <small>{item.size}</small>
                          </span>
                          <strong>{inr(item.lineTotal)}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4>Delivery</h4>
                    <p className="admin-order-address">
                      {order.address.fullName}
                      <br />
                      {order.address.line1}
                      {order.address.line2 ? `, ${order.address.line2}` : ""}
                      <br />
                      {order.address.city} {order.address.pincode}
                      <br />
                      {order.address.phone}
                    </p>
                    {/* Live rider summary supplied from the tracking editor. */}
                    {order.delivery?.driverName && (
                      <p className="admin-order-note">
                        Rider: {order.delivery.driverName}
                        {order.delivery.driverPhone
                          ? ` · ${order.delivery.driverPhone}`
                          : ""}
                      </p>
                    )}
                    {order.delivery?.etaAt &&
                      order.status === "Sent to Delivery" && (
                        <p className="admin-order-note">
                          ETA {formatDateTime(order.delivery.etaAt)}
                        </p>
                      )}
                    {order.delivery?.deliveredAt && (
                      <p className="admin-order-note">
                        Delivered {formatDateTime(order.delivery.deliveredAt)}
                      </p>
                    )}
                  </div>

                  <div>
                    <h4>Payment</h4>
                    <p className="admin-order-payment">
                      <strong>{inr(order.total)}</strong>
                      <span>
                        {/* COD wording was added with the rider system. */}
                        {order.payment.method === "cod"
                          ? order.payment.status === "paid"
                            ? "Cash collected by rider"
                            : "Cash on delivery · due"
                          : order.payment.status === "paid"
                            ? `${order.payment.provider === "razorpay" ? "Razorpay" : "Demo"} · paid`
                            : "Pending"}
                      </span>
                    </p>
                    {order.payment.method === "cod" && (
                      <p className="admin-order-note">
                        {order.delivery?.cashSettledAt
                          ? `Cash settled ${formatDateTime(order.delivery.cashSettledAt)}`
                          : order.delivery?.cashCollectedAt
                            ? `Cash collected ${formatDateTime(order.delivery.cashCollectedAt)}`
                            : "Cash not collected yet"}
                      </p>
                    )}
                    <p className="admin-order-note">
                      Stock {order.stockApplied ? "decremented" : "not applied"}
                    </p>
                  </div>
                </div>

                {/* Rider assignment + delivery OTP (rider system). */}
                <RiderAssign
                  order={order}
                  riders={riders}
                  busy={busy}
                  onAssign={assignRider}
                />

                <AdminOtp order={order} busy={busy} onReset={resetOtp} />

                {/* Rider + ETA editor, shown while the order is still active. */}
                <DeliveryEditor order={order} busy={busy} onSave={saveDelivery} />

                <footer className="admin-order-actions">
                  {next && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={busy}
                      onClick={() => move(order, next)}
                    >
                      {busy ? "Updating…" : `Advance to ${next}`}
                    </button>
                  )}

                  {order.status === "Pending Payment" && (
                    <span className="admin-hint">Waiting for the customer to pay.</span>
                  )}

                  {canCancel && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={busy}
                      onClick={() => cancel(order)}
                    >
                      Cancel order
                    </button>
                  )}

                  <span className="admin-order-history">
                    {order.statusHistory?.length
                      ? `${order.statusHistory.length} status update${
                          order.statusHistory.length === 1 ? "" : "s"
                        }`
                      : ""}
                  </span>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
