import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cartKey, useCart } from "../context/CartContext";
import { api, apiMessage } from "../lib/api";
import { CheckIcon } from "../components/Icons";
import { SIZE_LABELS, inr } from "../lib/format";
import {
  SIZE_OPTIONS,
  ingredientTotal,
  pizzaPrice,
  sizeOption
} from "../lib/pricing";

const steps = [
  {
    key: "base",
    group: "base",
    title: "Pick your base",
    copy: "Five doughs, stretched to order. This is the foundation of the whole pizza.",
    multi: false
  },
  {
    key: "sauce",
    group: "sauce",
    title: "Choose a sauce",
    copy: "Spread edge to edge. Tomato, pesto, BBQ, peri peri or white garlic.",
    multi: false
  },
  {
    key: "cheese",
    group: "cheese",
    title: "Add the cheese",
    copy: "Mozzarella for stretch, cheddar for sharpness, parmesan for depth.",
    multi: false
  },
  {
    key: "vegetable",
    group: "vegetable",
    title: "Load the vegetables",
    copy: "Pick as many as you like — the price updates with every topping.",
    multi: true
  }
];

export default function Builder() {
  const { add } = useCart();
  const navigate = useNavigate();

  const [options, setOptions] = useState(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const [size, setSize] = useState("medium");
  const [quantity, setQuantity] = useState(1);
  const [selection, setSelection] = useState({
    base: "",
    sauce: "",
    cheese: "",
    vegetables: []
  });

  useEffect(() => {
    let alive = true;

    api
      .get("/menu/options")
      .then(({ data }) => {
        if (alive) setOptions(data);
      })
      .catch((err) => {
        if (alive) setError(apiMessage(err));
      });

    return () => {
      alive = false;
    };
  }, []);

  const groups = options?.groups;

  const selectedIngredients = useMemo(() => {
    if (!groups) return [];

    const picked = [];

    if (selection.base) {
      const item = groups.base.find((entry) => entry.code === selection.base);
      if (item) picked.push(item);
    }
    if (selection.sauce) {
      const item = groups.sauce.find((entry) => entry.code === selection.sauce);
      if (item) picked.push(item);
    }
    if (selection.cheese) {
      const item = groups.cheese.find((entry) => entry.code === selection.cheese);
      if (item) picked.push(item);
    }
    for (const code of selection.vegetables) {
      const item = groups.vegetable.find((entry) => entry.code === code);
      if (item) picked.push(item);
    }

    return picked;
  }, [groups, selection]);

  const unitPrice = pizzaPrice(selectedIngredients, size);
  const ingredientSum = ingredientTotal(selectedIngredients);
  const activeStep = steps[step];
  const activeOptions = groups ? groups[activeStep.group] : [];
  const selectedCount =
    selectedIngredients.length - selection.vegetables.length + selection.vegetables.length;

  function choose(option) {
    if (!option.available) return;

    if (activeStep.multi) {
      setSelection((current) => {
        const exists = current.vegetables.includes(option.code);
        return {
          ...current,
          vegetables: exists
            ? current.vegetables.filter((code) => code !== option.code)
            : [...current.vegetables, option.code]
        };
      });
      return;
    }

    setSelection((current) => ({ ...current, [activeStep.key]: option.code }));
  }

  function isChosen(option) {
    if (activeStep.multi) return selection.vegetables.includes(option.code);
    return selection[activeStep.key] === option.code;
  }

  function next() {
    if (!activeStep.multi && !selection[activeStep.key]) {
      setError(`Choose a ${activeStep.group} before continuing.`);
      return;
    }
    setError("");
    setStep((current) => Math.min(steps.length - 1, current + 1));
  }

  function back() {
    setError("");
    setStep((current) => Math.max(0, current - 1));
  }

  function reset() {
    setSelection({ base: "", sauce: "", cheese: "", vegetables: [] });
    setStep(0);
    setQuantity(1);
    setError("");
  }

  function addToCart() {
    if (!selection.base || !selection.sauce || !selection.cheese) {
      setError("Your pizza still needs a base, a sauce and a cheese.");
      return;
    }

    const ingredients = {
      base: selection.base,
      sauce: selection.sauce,
      cheese: selection.cheese,
      vegetables: [...selection.vegetables]
    };

    add({
      key: cartKey({ type: "custom", size, ingredients }),
      type: "custom",
      name: "Build Your Own Pizza",
      size,
      quantity,
      unitPrice,
      ingredients,
      ingredientNames: selectedIngredients.map((item) => item.name)
    });

    navigate("/checkout");
  }

  if (!options && !error) {
    return (
      <div className="page-loading">
        <span className="spinner" aria-hidden="true" />
        <p>Warming the oven…</p>
      </div>
    );
  }

  if (error && !options) {
    return (
      <section className="section">
        <div className="container empty-state">
          <h1>The builder is unavailable</h1>
          <p>{error}</p>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="page-hero page-hero-compact">
        <div className="container page-hero-inner">
          <div>
            <p className="eyebrow">Build your own</p>
            <h1>Four steps. One great pizza.</h1>
            <p className="section-lead">
              Choose a base, sauce and cheese, then add as many vegetables as you
              like. Everything is priced live and confirmed on the server before
              payment.
            </p>
          </div>
          <div className="builder-progress" aria-label="Builder progress">
            {steps.map((entry, index) => {
              const complete =
                entry.multi
                  ? selection.vegetables.length > 0
                  : Boolean(selection[entry.key]);
              return (
                <button
                  key={entry.key}
                  type="button"
                  className={`builder-progress-step ${
                    index === step ? "is-current" : complete ? "is-complete" : ""
                  }`}
                  onClick={() => {
                    setStep(index);
                    setError("");
                  }}
                >
                  <span>
                    {complete && index !== step ? (
                      <CheckIcon size={13} />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <small>{entry.key === "vegetable" ? "Veggies" : entry.key}</small>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section section-tight">
        <div className="container builder-layout">
          <div className="builder-main">
            <header className="builder-step-head">
              <p className="eyebrow">Step {step + 1} of 4</p>
              <h2>{activeStep.title}</h2>
              <p>{activeStep.copy}</p>
            </header>

            {error && (
              <div className="notice notice-error" role="alert">
                <p>{error}</p>
              </div>
            )}

            <div className="option-grid">
              {activeOptions.map((option) => {
                const chosen = isChosen(option);
                return (
                  <button
                    key={option.code}
                    type="button"
                    className={`option-card ${chosen ? "is-selected" : ""}`}
                    aria-pressed={chosen}
                    disabled={!option.available}
                    onClick={() => choose(option)}
                  >
                    <span className="option-top">
                      <span className="option-name">{option.name}</span>
                      <span className="option-check" aria-hidden="true">
                        {chosen ? <CheckIcon size={13} /> : ""}
                      </span>
                    </span>
                    <span className="option-description">{option.description}</span>
                    <span className="option-bottom">
                      <span className="option-price">+{inr(option.price)}</span>
                      <span className="option-stock">
                        {option.available ? `${option.stock} in stock` : "Out of stock"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="builder-nav">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={back}
                disabled={step === 0}
              >
                ← Back
              </button>

              <div className="builder-nav-right">
                <button type="button" className="btn btn-ghost" onClick={reset}>
                  Start over
                </button>
                {step < steps.length - 1 ? (
                  <button type="button" className="btn btn-primary" onClick={next}>
                    Next: {steps[step + 1].key === "vegetable" ? "veggies" : steps[step + 1].key} →
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={addToCart}
                    disabled={!selection.base || !selection.sauce || !selection.cheese}
                  >
                    Add to cart · {inr(unitPrice * quantity)}
                  </button>
                )}
              </div>
            </div>
          </div>

          <aside className="builder-summary" aria-label="Your pizza summary">
            <div className="summary-card">
              <header className="summary-head">
                <div>
                  <p className="eyebrow">Live summary</p>
                  <h2>Your pizza</h2>
                </div>
                <span className="summary-count">{selectedCount} picks</span>
              </header>

              <dl className="summary-list">
                <div>
                  <dt>Base</dt>
                  <dd>{findName(groups, "base", selection.base) || "Not chosen"}</dd>
                </div>
                <div>
                  <dt>Sauce</dt>
                  <dd>{findName(groups, "sauce", selection.sauce) || "Not chosen"}</dd>
                </div>
                <div>
                  <dt>Cheese</dt>
                  <dd>{findName(groups, "cheese", selection.cheese) || "Not chosen"}</dd>
                </div>
                <div>
                  <dt>Veggies</dt>
                  <dd>
                    {selection.vegetables.length
                      ? selection.vegetables
                          .map((code) => findName(groups, "vegetable", code))
                          .filter(Boolean)
                          .join(" · ")
                      : "None yet"}
                  </dd>
                </div>
              </dl>

              <div className="summary-block">
                <h3>Size</h3>
                <div className="size-row">
                  {SIZE_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`size-chip ${size === option.id ? "is-active" : ""}`}
                      aria-pressed={size === option.id}
                      onClick={() => setSize(option.id)}
                    >
                      <span>{option.label}</span>
                      <small>{option.inches}"</small>
                    </button>
                  ))}
                </div>
                <p className="summary-hint">{sizeOption(size).serves} · ×{sizeOption(size).multiplier} price</p>
              </div>

              <div className="summary-block">
                <h3>Quantity</h3>
                <div className="stepper">
                  <button
                    type="button"
                    onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span>{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((value) => Math.min(20, value + 1))}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>

              <dl className="price-breakdown">
                <div>
                  <dt>Ingredients</dt>
                  <dd>{inr(ingredientSum)}</dd>
                </div>
                <div>
                  <dt>{SIZE_LABELS[size]}</dt>
                  <dd>×{sizeOption(size).multiplier}</dd>
                </div>
                <div>
                  <dt>Per pizza</dt>
                  <dd>{inr(unitPrice)}</dd>
                </div>
                <div className="price-total">
                  <dt>Total ({quantity})</dt>
                  <dd>{inr(unitPrice * quantity)}</dd>
                </div>
              </dl>

              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={addToCart}
                disabled={!selection.base || !selection.sauce || !selection.cheese}
              >
                Add to cart
              </button>
              <p className="summary-hint summary-hint-center">
                Final price is confirmed on the checkout page.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

function findName(groups, category, code) {
  if (!groups || !code) return "";
  const item = groups[category]?.find((entry) => entry.code === code);
  return item ? item.name : "";
}
