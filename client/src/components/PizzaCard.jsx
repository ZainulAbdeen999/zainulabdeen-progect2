import { useState } from "react";
import { cartKey, useCart } from "../context/CartContext";
import { SIZE_LABELS, inr } from "../lib/format";
import { SIZE_OPTIONS } from "../lib/pricing";
import { CheckIcon, PizzaIcon } from "./Icons";

export default function PizzaCard({ pizza }) {
  const { add } = useCart();
  const [size, setSize] = useState("medium");
  const [added, setAdded] = useState(false);

  const base = pizza.ingredients.find((item) => item.category === "base");
  const sauce = pizza.ingredients.find((item) => item.category === "sauce");
  const cheese = pizza.ingredients.find((item) => item.category === "cheese");
  const vegetables = pizza.ingredients
    .filter((item) => item.category === "vegetable")
    .map((item) => item.code);

  function handleAdd() {
    const ingredients = {
      base: base?.code,
      sauce: sauce?.code,
      cheese: cheese?.code,
      vegetables
    };

    add({
      key: cartKey({ type: "menu", menuSlug: pizza.slug, size }),
      type: "menu",
      menuSlug: pizza.slug,
      name: pizza.name,
      size,
      quantity: 1,
      unitPrice: pizza.prices[size],
      ingredients,
      ingredientNames: pizza.ingredients.map((item) => item.name)
    });

    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <article className={`pizza-card ${pizza.available ? "" : "is-sold-out"}`}>
      <div className="pizza-media">
        {pizza.image ? (
          <img
            src={pizza.image}
            alt={`${pizza.name} pizza`}
            loading="lazy"
            width="640"
            height="420"
          />
        ) : (
          <span className="pizza-media-fallback" aria-hidden="true">
            <PizzaIcon size={62} />
          </span>
        )}
        {pizza.featured && <span className="badge badge-gold">Kitchen favourite</span>}
        {!pizza.available && <span className="badge badge-dark">Sold out</span>}
      </div>

      <div className="pizza-body">
        <div className="pizza-heading">
          <h3>{pizza.name}</h3>
          <p className="pizza-price">
            {inr(pizza.prices[size])}
            <span>{SIZE_LABELS[size]}</span>
          </p>
        </div>

        <p className="pizza-description">{pizza.description}</p>

        <ul className="pizza-tags" aria-label="Tags">
          {pizza.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>

        <div className="size-row" role="group" aria-label={`Size for ${pizza.name}`}>
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

        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={handleAdd}
          disabled={!pizza.available}
        >
          {!pizza.available ? (
            "Sold out"
          ) : added ? (
            <>
              <CheckIcon size={16} /> Added to cart
            </>
          ) : (
            "Add to cart"
          )}
        </button>
      </div>
    </article>
  );
}
