/**
 * Shared pricing rules.
 *
 * A pizza's price is the sum of its ingredient prices (from inventory)
 * multiplied by the size factor. Nothing is hard-coded per pizza, so when an
 * admin changes an ingredient price every menu item updates instantly.
 */

export const SIZES = {
  small: {
    id: "small",
    label: "Small",
    inches: 7,
    serves: "1 person",
    multiplier: 1
  },
  medium: {
    id: "medium",
    label: "Medium",
    inches: 10,
    serves: "2 people",
    multiplier: 1.35
  },
  large: {
    id: "large",
    label: "Large",
    inches: 13,
    serves: "3–4 people",
    multiplier: 1.7
  }
};

export const SIZE_LIST = Object.values(SIZES).map(({ multiplier, ...size }) => size);

/** Round to whole rupees — Indian menus rarely show paise. */
export function roundMoney(value) {
  return Math.round(Number(value) || 0);
}

export function ingredientTotal(ingredients) {
  return (ingredients || []).reduce(
    (sum, ingredient) => sum + (Number(ingredient.price) || 0),
    0
  );
}

export function pizzaUnitPrice(ingredients, size) {
  const factor = SIZES[size]?.multiplier ?? 1;
  return roundMoney(ingredientTotal(ingredients) * factor);
}

/**
 * Order totals: subtotal + delivery + tax.
 * Delivery is free once the subtotal crosses the configured threshold.
 */
export function orderTotals(items, config) {
  const subtotal = (items || []).reduce(
    (sum, item) => sum + (Number(item.lineTotal) || 0),
    0
  );
  const deliveryFee =
    subtotal === 0 || subtotal >= config.freeDeliveryOver
      ? 0
      : Number(config.deliveryFee) || 0;
  const tax = roundMoney(subtotal * ((Number(config.taxPercent) || 0) / 100));

  return {
    subtotal,
    deliveryFee,
    tax,
    total: subtotal + deliveryFee + tax
  };
}
