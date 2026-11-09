import { InventoryItem } from "../models/InventoryItem.js";
import { MenuPizza } from "../models/MenuPizza.js";
import { env } from "../config/env.js";
import { badRequest } from "../utils/ApiError.js";
import { SIZES, pizzaUnitPrice, orderTotals } from "../utils/price.js";

function normaliseQuantity(value) {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
    throw badRequest("Quantity must be a whole number between 1 and 20", "INVALID_QUANTITY");
  }
  return quantity;
}

function normaliseSize(value) {
  const size = String(value || "").toLowerCase();
  if (!SIZES[size]) {
    throw badRequest("Choose a valid pizza size", "INVALID_SIZE");
  }
  return size;
}

function resolveIngredient(byCode, code, category) {
  const item = byCode.get(String(code || ""));
  if (!item || item.category !== category) {
    throw badRequest(`Choose a valid ${category}`, "INVALID_INGREDIENT");
  }
  if (!item.available) {
    throw badRequest(`${item.name} is currently unavailable`, "INGREDIENT_UNAVAILABLE");
  }
  if (item.stock <= 0) {
    throw badRequest(`${item.name} is out of stock`, "OUT_OF_STOCK");
  }
  return {
    category,
    code: item.code,
    name: item.name,
    price: item.price
  };
}

/**
 * Rebuild the cart on the server from codes only.
 *
 * The client sends what was chosen, never what it should cost. Prices, names
 * and totals are always recalculated here so a tampered request cannot change
 * the amount charged.
 */
export async function buildOrderDraft(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw badRequest("Your cart is empty", "EMPTY_CART");
  }
  if (rawItems.length > 20) {
    throw badRequest("Too many different pizzas in one order", "CART_TOO_LARGE");
  }

  const [inventory, menu] = await Promise.all([
    InventoryItem.find({}).lean(),
    MenuPizza.find({}).lean()
  ]);

  const byCode = new Map(inventory.map((item) => [item.code, item]));
  const bySlug = new Map(menu.map((pizza) => [pizza.slug, pizza]));

  const items = rawItems.map((raw) => {
    const type = raw?.type === "menu" ? "menu" : "custom";
    const size = normaliseSize(raw?.size);
    const quantity = normaliseQuantity(raw?.quantity);
    let name;
    let menuSlug;
    let ingredients;

    if (type === "menu") {
      const pizza = bySlug.get(String(raw?.menuSlug || ""));
      if (!pizza || !pizza.available) {
        throw badRequest("That pizza is not available right now", "PIZZA_UNAVAILABLE");
      }

      const codes = [
        pizza.ingredients.base,
        pizza.ingredients.sauce,
        pizza.ingredients.cheese,
        ...(pizza.ingredients.vegetables || [])
      ];

      ingredients = codes.map((code, index) => {
        const category =
          index === 0 ? "base" : index === 1 ? "sauce" : index === 2 ? "cheese" : "vegetable";
        return resolveIngredient(byCode, code, category);
      });

      name = pizza.name;
      menuSlug = pizza.slug;
    } else {
      const chosen = raw?.ingredients && typeof raw.ingredients === "object" ? raw.ingredients : {};
      const vegetableCodes = Array.isArray(chosen.vegetables)
        ? [...new Set(chosen.vegetables.map((code) => String(code || "")))]
        : [];

      if (vegetableCodes.length > 8) {
        throw badRequest("Choose up to 8 vegetables", "TOO_MANY_VEGETABLES");
      }

      ingredients = [
        resolveIngredient(byCode, chosen.base, "base"),
        resolveIngredient(byCode, chosen.sauce, "sauce"),
        resolveIngredient(byCode, chosen.cheese, "cheese"),
        ...vegetableCodes.map((code) => resolveIngredient(byCode, code, "vegetable"))
      ];

      name = "Build Your Own Pizza";
    }

    const unitPrice = pizzaUnitPrice(ingredients, size);

    return {
      type,
      ...(menuSlug ? { menuSlug } : {}),
      name,
      size,
      ingredients,
      unitPrice,
      quantity,
      lineTotal: unitPrice * quantity
    };
  });

  const totals = orderTotals(items, env);

  return { items, ...totals };
}
