/**
 * Client-side mirror of the server pricing rules.
 * The server recalculates everything before charging; this is only for
 * showing a live estimate while the customer builds a pizza.
 */

export const SIZE_OPTIONS = [
  {
    id: "small",
    label: "Small",
    inches: 7,
    serves: "1 person",
    multiplier: 1
  },
  {
    id: "medium",
    label: "Medium",
    inches: 10,
    serves: "2 people",
    multiplier: 1.35
  },
  {
    id: "large",
    label: "Large",
    inches: 13,
    serves: "3–4 people",
    multiplier: 1.7
  }
];

export function sizeOption(id) {
  return SIZE_OPTIONS.find((size) => size.id === id) || SIZE_OPTIONS[0];
}

export function roundMoney(value) {
  return Math.round(Number(value) || 0);
}

export function ingredientTotal(ingredients) {
  return (ingredients || []).reduce(
    (sum, ingredient) => sum + (Number(ingredient?.price) || 0),
    0
  );
}

export function pizzaPrice(ingredients, size) {
  return roundMoney(ingredientTotal(ingredients) * sizeOption(size).multiplier);
}

export function orderEstimate(items, pricing) {
  const subtotal = (items || []).reduce(
    (sum, item) => sum + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 1),
    0
  );
  const deliveryFee =
    subtotal === 0 || subtotal >= (pricing?.freeDeliveryOver ?? 799)
      ? 0
      : Number(pricing?.deliveryFee) || 0;
  const tax = roundMoney(subtotal * ((Number(pricing?.taxPercent) || 0) / 100));

  return {
    subtotal,
    deliveryFee,
    tax,
    total: subtotal + deliveryFee + tax
  };
}
