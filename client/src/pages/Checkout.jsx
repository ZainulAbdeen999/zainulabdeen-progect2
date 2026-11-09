import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { api, apiMessage } from "../lib/api";
import { SIZE_LABELS, inr } from "../lib/format";
import { orderEstimate } from "../lib/pricing";

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-razorpay]");

    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Could not load Razorpay")));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpay = "true";
    script.onload = () => resolve();
    script.onerror = () =>
      reject(
        new Error(
          "Could not load the Razorpay checkout. Check your internet connection and try again."
        )
      );
    document.body.appendChild(script);
  });
}

const fallbackPricing = {
  deliveryFee: 49,
  freeDeliveryOver: 799,
  taxPercent: 5
};

export default function Checkout() {
  const { user } = useAuth();
  const { items, remove, setQuantity, clear } = useCart();
  const navigate = useNavigate();

  const [pricing, setPricing] = useState(null);
  const [form, setForm] = useState({
    fullName: user?.name || "",
    phone: "",
    line1: "",
    line2: "",
    // Delivery is currently limited to Mirpur Khas, so the city is pre-filled.
    city: "Mirpur Khas",
    pincode: ""
  });
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(false);
  const [pending, setPending] = useState(null);
  const [demoOpen, setDemoOpen] = useState(false);
  // Payment method (added with the rider system): online or cash on delivery.
  const [paymentMethod, setPaymentMethod] = useState("online");

  useEffect(() => {
    let alive = true;

    api
      .get("/menu/options")
      .then(({ data }) => {
        if (alive) setPricing(data.pricing);
      })
      .catch(() => {
        if (alive) setPricing(fallbackPricing);
      });

    return () => {
      alive = false;
    };
  }, []);

  const priceConfig = pricing || fallbackPricing;
  const totals = useMemo(
    () => orderEstimate(items, priceConfig),
    [items, priceConfig]
  );

  const payloadItems = items.map((item) =>
    item.type === "menu"
      ? {
          type: "menu",
          menuSlug: item.menuSlug,
          size: item.size,
          quantity: item.quantity
        }
      : {
          type: "custom",
          size: item.size,
          quantity: item.quantity,
          ingredients: item.ingredients
        }
  );

  function update(field) {
    return (event) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
      setError("");
    };
  }

  function validate() {
    if (form.fullName.trim().length < 2) return "Enter the name for the delivery.";
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15) return "Enter a valid phone number.";
    if (form.line1.trim().length < 5) return "Enter your street address.";
    if (form.city.trim().length < 2) return "Enter your city.";
    if (!/^[a-zA-Z0-9 -]{4,10}$/.test(form.pincode.trim())) return "Enter a valid PIN code.";
    return "";
  }

  async function launchRazorpay(pendingState) {
    try {
      await loadRazorpayScript();
    } catch (err) {
      setError(apiMessage(err));
      return;
    }

    const order = pendingState.order;
    const options = {
      key: pendingState.razorpay.keyId,
      amount: pendingState.razorpay.amount,
      currency: pendingState.razorpay.currency,
      name: "Slice House",
      description: `Order ${order.orderNumber}`,
      order_id: pendingState.razorpay.orderId,
      prefill: {
        name: form.fullName,
        email: user?.email || "",
        contact: form.phone
      },
      notes: { orderNumber: order.orderNumber },
      theme: { color: "#d9382b" },
      handler: async (response) => {
        setPaying(true);
        setError("");
        try {
          await api.post(`/orders/${order._id}/payment/verify`, {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });
          clear();
          navigate(`/orders?placed=${encodeURIComponent(order.orderNumber)}`);
        } catch (err) {
          setError(apiMessage(err));
        } finally {
          setPaying(false);
        }
      },
      modal: {
        ondismiss: () => {
          setInfo(
            "Payment window closed. Your order is saved as pending — use “Pay now” to try again."
          );
        }
      }
    };

    const checkout = new window.Razorpay(options);
    checkout.on("payment.failed", (response) => {
      setError(
        response?.error?.description ||
          "The payment failed. No money was taken — try again."
      );
    });
    checkout.open();
  }

  async function placeOrder(event) {
    event.preventDefault();

    if (pending) return;

    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    setBusy(true);
    setError("");
    setInfo("");

    try {
      const { data } = await api.post("/orders", {
        items: payloadItems,
        // The server uses this to choose the payment flow (COD vs online).
        paymentMethod,
        address: {
          fullName: form.fullName,
          phone: form.phone,
          line1: form.line1,
          line2: form.line2,
          city: form.city,
          pincode: form.pincode
        }
      });

      /*
       * COD orders are created already confirmed (added with the rider system).
       * There is nothing to pay online, so clear the cart and show the order.
       */
      if (data.cod) {
        clear();
        navigate(`/orders?placed=${encodeURIComponent(data.order.orderNumber)}`);
        return;
      }

      if (data.demo) {
        setPending({ order: data.order });
        setDemoOpen(true);
      } else {
        setPending({ order: data.order, razorpay: data.razorpay });
        await launchRazorpay({ order: data.order, razorpay: data.razorpay });
      }
    } catch (err) {
      setError(apiMessage(err, "Could not place the order."));
    } finally {
      setBusy(false);
    }
  }

  async function payDemo() {
    if (!pending) return;
    setPaying(true);
    setError("");

    try {
      await api.post(`/orders/${pending.order._id}/payment/demo`);
      setDemoOpen(false);
      clear();
      navigate(`/orders?placed=${encodeURIComponent(pending.order.orderNumber)}`);
    } catch (err) {
      setError(apiMessage(err));
      setDemoOpen(false);
    } finally {
      setPaying(false);
    }
  }

  async function cancelPending() {
    if (!pending) return;
    if (!window.confirm("Cancel this pending order?")) return;

    try {
      await api.post(`/orders/${pending.order._id}/cancel`);
      setPending(null);
      clear();
      setInfo("Order cancelled. Your cart was cleared.");
    } catch (err) {
      setError(apiMessage(err));
    }
  }

  if (items.length === 0 && !pending) {
    return (
      <section className="section">
        <div className="container empty-state">
          <p className="eyebrow">Checkout</p>
          <h1>Your cart is empty</h1>
          <p>Add a pizza from the menu, or build one from scratch.</p>
          <div className="empty-actions">
            <Link className="btn btn-primary" to="/menu">
              Browse the menu
            </Link>
            <Link className="btn btn-ghost" to="/build">
              Build your own
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="page-hero page-hero-compact">
        <div className="container page-hero-inner">
          <div>
            <p className="eyebrow">Checkout</p>
            <h1>Review, then pay</h1>
            <p className="section-lead">
              Check your pizzas and delivery details. The server recalculates the
              total before the payment step.
            </p>
          </div>
          <div className="checkout-steps" aria-hidden="true">
            <span className="is-done">1 · Cart</span>
            <span className="is-current">2 · Details</span>
            <span>3 · Payment</span>
          </div>
        </div>
      </section>

      <section className="section section-tight">
        <div className="container checkout-layout">
          <div className="checkout-main">
            {error && (
              <div className="notice notice-error" role="alert">
                <p>{error}</p>
              </div>
            )}
            {info && (
              <div className="notice notice-info">
                <p>{info}</p>
              </div>
            )}

            {pending ? (
              <div className="summary-card pending-card">
                <p className="eyebrow">Order created</p>
                <h2>Payment pending</h2>
                <p>
                  Order <strong>{pending.order.orderNumber}</strong> is saved. Finish
                  the payment to send it to the kitchen.
                </p>
                <dl className="pending-summary">
                  <div>
                    <dt>Total</dt>
                    <dd>{inr(pending.order.total)}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{pending.order.status}</dd>
                  </div>
                </dl>
                <div className="pending-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={paying}
                    onClick={() =>
                      pending.razorpay ? launchRazorpay(pending) : setDemoOpen(true)
                    }
                  >
                    {paying ? "Confirming…" : `Pay ${inr(pending.order.total)}`}
                  </button>
                  <Link className="btn btn-ghost" to="/orders">
                    View my orders
                  </Link>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={cancelPending}
                    disabled={paying}
                  >
                    Cancel order
                  </button>
                </div>
                <p className="summary-hint">
                  {pending.razorpay
                    ? "Razorpay test mode — no real money is charged."
                    : "Demo checkout is active because Razorpay keys are not configured."}
                </p>
              </div>
            ) : (
              <>
                <form className="summary-card" onSubmit={placeOrder} noValidate>
                  <header className="summary-head">
                    <div>
                      <p className="eyebrow">Delivery details</p>
                      <h2>Where should we send it?</h2>
                    </div>
                  </header>

                  <div className="form-grid">
                    <label className="field">
                      <span>Full name</span>
                      <input
                        type="text"
                        name="fullName"
                        autoComplete="name"
                        value={form.fullName}
                        onChange={update("fullName")}
                        required
                      />
                    </label>

                    <label className="field">
                      <span>Phone number</span>
                      <input
                        type="tel"
                        name="phone"
                        autoComplete="tel"
                        value={form.phone}
                        onChange={update("phone")}
                        placeholder="03xx xxxxxxx"
                        required
                      />
                    </label>

                    <label className="field field-span">
                      <span>Address line 1</span>
                      <input
                        type="text"
                        name="line1"
                        autoComplete="address-line1"
                        value={form.line1}
                        onChange={update("line1")}
                        placeholder="House / street"
                        required
                      />
                    </label>

                    <label className="field field-span">
                      <span>Address line 2 <small>(optional)</small></span>
                      <input
                        type="text"
                        name="line2"
                        autoComplete="address-line2"
                        value={form.line2}
                        onChange={update("line2")}
                        placeholder="Area, landmark"
                      />
                    </label>

                    <label className="field">
                      <span>City</span>
                      <input
                        type="text"
                        name="city"
                        autoComplete="address-level2"
                        value={form.city}
                        onChange={update("city")}
                        required
                      />
                    </label>

                    {/* Mirpur Khas GPO postal code. */}
                    <label className="field">
                      <span>PIN code</span>
                      <input
                        type="text"
                        name="pincode"
                        autoComplete="postal-code"
                        value={form.pincode}
                        onChange={update("pincode")}
                        placeholder="69000"
                        required
                      />
                    </label>
                  </div>

                  {/* Online vs cash-on-delivery selector (rider system). */}
                  <div className="pay-method" role="radiogroup" aria-label="Payment method">
                    <p className="pay-method-label">Payment method</p>
                    <div className="pay-method-options">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={paymentMethod === "online"}
                        className={`pay-option ${
                          paymentMethod === "online" ? "is-active" : ""
                        }`}
                        onClick={() => setPaymentMethod("online")}
                      >
                        <span className="pay-option-title">Pay online</span>
                        <span className="pay-option-note">
                          Razorpay in test mode, or the built-in demo checkout.
                        </span>
                      </button>

                      <button
                        type="button"
                        role="radio"
                        aria-checked={paymentMethod === "cod"}
                        className={`pay-option ${
                          paymentMethod === "cod" ? "is-active" : ""
                        }`}
                        onClick={() => setPaymentMethod("cod")}
                      >
                        <span className="pay-option-title">Cash on delivery</span>
                        <span className="pay-option-note">
                          Pay the rider in cash when your pizza arrives.
                        </span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-block btn-lg"
                    disabled={busy}
                  >
                    {busy
                      ? "Creating order…"
                      : paymentMethod === "cod"
                        ? `Place COD order · ${inr(totals.total)}`
                        : `Place order · ${inr(totals.total)}`}
                  </button>
                  <p className="summary-hint summary-hint-center">
                    {paymentMethod === "cod"
                      ? "Your order goes straight to the kitchen. Keep the delivery OTP shown on “My orders” ready for the rider."
                      : "You will confirm payment on the next step. No card details are stored by Slice House."}
                  </p>
                </form>

                <div className="summary-card">
                  <header className="summary-head">
                    <div>
                      <p className="eyebrow">Your cart</p>
                      <h2>{items.length} {items.length === 1 ? "pizza" : "pizzas"}</h2>
                    </div>
                    <Link className="text-link" to="/menu">
                      Add more
                    </Link>
                  </header>

                  <ul className="cart-list">
                    {items.map((item) => (
                      <li className="cart-item" key={item.key}>
                        <div className="cart-item-main">
                          <h3>
                            {item.name}
                            <span>{SIZE_LABELS[item.size]}</span>
                          </h3>
                          <p>{item.ingredientNames.join(" · ")}</p>
                          <button
                            type="button"
                            className="text-link text-link-danger"
                            onClick={() => remove(item.key)}
                          >
                            Remove
                          </button>
                        </div>

                        <div className="cart-item-side">
                          <div className="stepper stepper-sm">
                            <button
                              type="button"
                              onClick={() => setQuantity(item.key, item.quantity - 1)}
                              aria-label={`Decrease ${item.name}`}
                            >
                              −
                            </button>
                            <span>{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => setQuantity(item.key, item.quantity + 1)}
                              aria-label={`Increase ${item.name}`}
                            >
                              +
                            </button>
                          </div>
                          <p className="cart-line-total">
                            {inr(item.unitPrice * item.quantity)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>

          <aside className="checkout-aside">
            <div className="summary-card sticky-card">
              <header className="summary-head">
                <div>
                  <p className="eyebrow">Order summary</p>
                  <h2>{pending ? pending.order.orderNumber : "Before payment"}</h2>
                </div>
              </header>

              <dl className="price-breakdown">
                <div>
                  <dt>Subtotal</dt>
                  <dd>{inr(pending ? pending.order.subtotal : totals.subtotal)}</dd>
                </div>
                <div>
                  <dt>Delivery</dt>
                  <dd>
                    {(pending ? pending.order.deliveryFee : totals.deliveryFee) === 0
                      ? "Free"
                      : inr(pending ? pending.order.deliveryFee : totals.deliveryFee)}
                  </dd>
                </div>
                <div>
                  <dt>Tax ({priceConfig.taxPercent}%)</dt>
                  <dd>{inr(pending ? pending.order.tax : totals.tax)}</dd>
                </div>
                <div className="price-total">
                  <dt>Total</dt>
                  <dd>{inr(pending ? pending.order.total : totals.total)}</dd>
                </div>
              </dl>

              <ul className="summary-notes">
                {/* Mirpur Khas delivery messaging + live tracking hint. */}
                <li>Delivering across Mirpur Khas (69000) only.</li>
                <li>Free delivery over {inr(priceConfig.freeDeliveryOver)}.</li>
                <li>Live rider tracking and ETA appear on “My orders” after dispatch.</li>
                {/* COD wording (rider system). */}
                <li>
                  Pay online via Razorpay/demo, or choose cash on delivery to pay
                  the rider.
                </li>
                <li>
                  Online orders reserve stock after payment; COD orders reserve it
                  when placed.
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </section>

      {demoOpen && pending && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="demo-title">
          <div className="modal">
            <p className="eyebrow">Demo checkout</p>
            <h2 id="demo-title">Confirm your payment</h2>
            <p>
              Razorpay keys are not configured, so this demo button confirms order{" "}
              <strong>{pending.order.orderNumber}</strong> without charging anything.
            </p>
            <dl className="pending-summary">
              <div>
                <dt>Amount</dt>
                <dd>{inr(pending.order.total)}</dd>
              </div>
              <div>
                <dt>Payment</dt>
                <dd>Demo / test</dd>
              </div>
            </dl>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={payDemo}
                disabled={paying}
              >
                {paying ? "Confirming…" : `Pay ${inr(pending.order.total)} now`}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setDemoOpen(false)}
                disabled={paying}
              >
                Not yet
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
