import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import OrderStatusTracker from "../components/OrderStatusTracker";
import { useAuth } from "../context/AuthContext";
import { api, apiMessage } from "../lib/api";
import {
  SIZE_LABELS,
  formatDateTime,
  inr,
  statusTone
} from "../lib/format";

const CANCELLABLE = ["Pending Payment", "Order Received"];

export default function Orders() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const placed = params.get("placed") || "";

  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState("");
  const [notice, setNotice] = useState("");
  // Difference between the API clock and this device, used by the live ETA.
  const [serverOffset, setServerOffset] = useState(0);

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setOrders((current) => current ?? null);

    try {
      const { data } = await api.get("/orders");
      setOrders(data.orders);
      setServerOffset(
        data.serverTime ? Date.parse(data.serverTime) - Date.now() : 0
      );
      setError("");
    } catch (err) {
      setError(apiMessage(err));
    }
  }, []);

  useEffect(() => {
    let alive = true;
    let timer;

    async function tick() {
      try {
        const { data } = await api.get("/orders");
        if (!alive) return;
        setOrders(data.orders);
        // Keep the ETA countdown aligned with the server clock.
        setServerOffset(
          data.serverTime ? Date.parse(data.serverTime) - Date.now() : 0
        );
        setError("");
      } catch (err) {
        if (alive) setError(apiMessage(err));
      }
    }

    tick();
    timer = window.setInterval(tick, 6000);

    function onFocus() {
      tick();
    }
    window.addEventListener("focus", onFocus);

    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  async function cancelOrder(order) {
    if (!window.confirm(`Cancel order ${order.orderNumber}?`)) return;

    setActionId(order._id);
    setNotice("");
    try {
      await api.post(`/orders/${order._id}/cancel`);
      setNotice(`Order ${order.orderNumber} cancelled.`);
      await load();
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setActionId("");
    }
  }

  async function completeDemoPayment(order) {
    setActionId(order._id);
    setNotice("");
    try {
      await api.post(`/orders/${order._id}/payment/demo`);
      setNotice(`Payment confirmed for ${order.orderNumber}.`);
      await load();
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setActionId("");
    }
  }

  const active = orders
    ? orders.filter((order) =>
        ["Pending Payment", "Order Received", "In Kitchen", "Sent to Delivery"].includes(
          order.status
        )
      ).length
    : 0;
  const delivered = orders
    ? orders.filter((order) => order.status === "Delivered").length
    : 0;
  const spent = orders
    ? orders
        .filter((order) => order.payment.status === "paid")
        .reduce((sum, order) => sum + order.total, 0)
    : 0;

  return (
    <>
      <section className="page-hero page-hero-compact">
        <div className="container page-hero-inner">
          <div>
            <p className="eyebrow">Your dashboard</p>
            <h1>Hi {user?.name?.split(" ")[0] || "there"}, here are your orders</h1>
            <p className="section-lead">
              This page refreshes every six seconds, so kitchen updates appear
              without a manual reload.
            </p>
          </div>
          <dl className="page-hero-stats">
            <div>
              <dt>{active}</dt>
              <dd>active</dd>
            </div>
            <div>
              <dt>{delivered}</dt>
              <dd>delivered</dd>
            </div>
            <div>
              <dt>{inr(spent)}</dt>
              <dd>total paid</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="section section-tight">
        <div className="container">
          {placed && (
            <div className="notice notice-success">
              <p>
                <strong>Order {placed} confirmed.</strong> The kitchen has it — watch
                the status below.
              </p>
            </div>
          )}

          {notice && (
            <div className="notice notice-info">
              <p>{notice}</p>
            </div>
          )}

          {error && (
            <div className="notice notice-error" role="alert">
              <p>{error}</p>
            </div>
          )}

          {!orders && !error && (
            <div className="order-list">
              {[0, 1].map((index) => (
                <div className="order-card skeleton-card" key={index}>
                  <div className="skeleton skeleton-line" />
                  <div className="skeleton skeleton-line short" />
                  <div className="skeleton skeleton-button" />
                </div>
              ))}
            </div>
          )}

          {orders && orders.length === 0 && (
            <div className="empty-state">
              <p className="eyebrow">No orders yet</p>
              <h2>Your first pizza is waiting</h2>
              <p>Build one from scratch or pick a house favourite.</p>
              <div className="empty-actions">
                <Link className="btn btn-primary" to="/menu">
                  Browse the menu
                </Link>
                <Link className="btn btn-ghost" to="/build">
                  Build your own
                </Link>
              </div>
            </div>
          )}

          {orders && orders.length > 0 && (
            <div className="order-list">
              {orders.map((order) => {
                const highlighted = placed && order.orderNumber === placed;
                const isPendingDemo =
                  order.status === "Pending Payment" &&
                  order.payment.provider === "demo";

                return (
                  <article
                    key={order._id}
                    className={`order-card ${highlighted ? "is-highlighted" : ""}`}
                  >
                    <header className="order-head">
                      <div>
                        <p className="order-number">{order.orderNumber}</p>
                        <p className="order-date">
                          Placed {formatDateTime(order.createdAt)} · {order.items.length}{" "}
                          {order.items.length === 1 ? "pizza" : "pizzas"}
                        </p>
                      </div>
                      <div className="admin-order-badges">
                        {/* COD badge (added with the rider system). */}
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

                    <OrderStatusTracker order={order} serverOffset={serverOffset} />

                    {/* Delivery OTP (added with the rider system). */}
                    {order.delivery?.otp &&
                      ["Order Received", "In Kitchen", "Sent to Delivery"].includes(
                        order.status
                      ) && (
                        <div className="order-otp">
                          <div className="order-otp-code">
                            <span>Delivery OTP</span>
                            <strong>{order.delivery.otp}</strong>
                          </div>
                          <p>
                            Share this 4-digit code with your rider only when the
                            order arrives. The rider needs it to mark the delivery
                            complete.
                          </p>
                        </div>
                      )}

                    <ul className="order-items">
                      {order.items.map((item, index) => (
                        <li key={`${order._id}-${index}`}>
                          <div>
                            <strong>{item.name}</strong>
                            <span>
                              {SIZE_LABELS[item.size]} · ×{item.quantity}
                            </span>
                            {item.ingredients.length > 0 && (
                              <p>
                                {item.ingredients
                                  .map((ingredient) => ingredient.name)
                                  .join(" · ")}
                              </p>
                            )}
                          </div>
                          <span>{inr(item.lineTotal)}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="order-foot">
                      <div className="order-address">
                        <h3>Delivering to</h3>
                        <p>
                          {order.address.fullName}
                          <br />
                          {order.address.line1}
                          {order.address.line2 ? `, ${order.address.line2}` : ""}
                          <br />
                          {order.address.city} {order.address.pincode}
                          <br />
                          {order.address.phone}
                        </p>
                      </div>

                      <dl className="order-totals">
                        <div>
                          <dt>Subtotal</dt>
                          <dd>{inr(order.subtotal)}</dd>
                        </div>
                        <div>
                          <dt>Delivery</dt>
                          <dd>{order.deliveryFee === 0 ? "Free" : inr(order.deliveryFee)}</dd>
                        </div>
                        <div>
                          <dt>Tax</dt>
                          <dd>{inr(order.tax)}</dd>
                        </div>
                        <div className="price-total">
                          <dt>Total</dt>
                          <dd>{inr(order.total)}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="order-actions">
                      {isPendingDemo && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => completeDemoPayment(order)}
                          disabled={actionId === order._id}
                        >
                          {actionId === order._id ? "Confirming…" : "Complete demo payment"}
                        </button>
                      )}

                      {CANCELLABLE.includes(order.status) && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => cancelOrder(order)}
                          disabled={actionId === order._id}
                        >
                          Cancel order
                        </button>
                      )}

                      <Link className="btn btn-ghost btn-sm" to="/menu">
                        Order again
                      </Link>

                      <span className="order-payment">
                        {/* COD wording (added with the rider system). */}
                        {order.payment.method === "cod"
                          ? order.payment.status === "paid"
                            ? "Cash paid to rider"
                            : "Cash on delivery"
                          : order.payment.status === "paid"
                            ? `Paid ${order.payment.provider === "razorpay" ? "via Razorpay" : "(demo)"}`
                            : "Payment pending"}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
