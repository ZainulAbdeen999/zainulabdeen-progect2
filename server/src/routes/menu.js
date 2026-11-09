import express from "express";
import { env } from "../config/env.js";
import { InventoryItem } from "../models/InventoryItem.js";
import { MenuPizza } from "../models/MenuPizza.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { notFound } from "../utils/ApiError.js";
import { SIZE_LIST, pizzaUnitPrice } from "../utils/price.js";

const router = express.Router();

const publicIngredient = (item) => ({
  code: item.code,
  name: item.name,
  category: item.category,
  price: item.price,
  stock: item.stock,
  available: item.available && item.stock > 0
});

function decoratePizza(pizza, byCode) {
  const codes = [
    pizza.ingredients.base,
    pizza.ingredients.sauce,
    pizza.ingredients.cheese,
    ...(pizza.ingredients.vegetables || [])
  ];

  const ingredients = codes
    .map((code) => byCode.get(code))
    .filter(Boolean)
    .map(publicIngredient);

  const missing = codes.filter((code) => !byCode.has(code));
  const soldOut = ingredients.some((item) => !item.available);

  const prices = Object.fromEntries(
    SIZE_LIST.map((size) => [size.id, pizzaUnitPrice(ingredients, size.id)])
  );

  return {
    slug: pizza.slug,
    name: pizza.name,
    description: pizza.description,
    image: pizza.image,
    tags: pizza.tags || [],
    featured: Boolean(pizza.featured),
    ingredients,
    prices,
    soldOut,
    available: Boolean(pizza.available) && !soldOut && missing.length === 0,
    missing
  };
}

function pricing() {
  return {
    currency: env.currency,
    deliveryFee: env.deliveryFee,
    freeDeliveryOver: env.freeDeliveryOver,
    taxPercent: env.taxPercent,
    sizes: SIZE_LIST
  };
}

/* GET /api/menu — named pizzas with live prices */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const [pizzas, inventory] = await Promise.all([
      MenuPizza.find({}).sort({ sortOrder: 1, name: 1 }).lean(),
      InventoryItem.find({}).lean()
    ]);

    const byCode = new Map(inventory.map((item) => [item.code, item]));

    res.json({
      pizzas: pizzas.map((pizza) => decoratePizza(pizza, byCode)),
      pricing: pricing()
    });
  })
);

/* GET /api/menu/options — builder choices grouped by category */
router.get(
  "/options",
  asyncHandler(async (req, res) => {
    const inventory = await InventoryItem.find({})
      .sort({ category: 1, price: 1, name: 1 })
      .lean();

    const groups = {
      base: [],
      sauce: [],
      cheese: [],
      vegetable: []
    };

    for (const item of inventory) {
      if (groups[item.category]) {
        groups[item.category].push(publicIngredient(item));
      }
    }

    res.json({ groups, pricing: pricing() });
  })
);

/* GET /api/menu/:slug — single pizza */
router.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const [pizza, inventory] = await Promise.all([
      MenuPizza.findOne({ slug: req.params.slug }).lean(),
      InventoryItem.find({}).lean()
    ]);

    if (!pizza) throw notFound("That pizza is not on the menu");

    const byCode = new Map(inventory.map((item) => [item.code, item]));
    res.json({ pizza: decoratePizza(pizza, byCode), pricing: pricing() });
  })
);

export default router;
