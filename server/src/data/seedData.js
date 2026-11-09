/**
 * Demo catalogue.
 *
 * Prices are in INR. A pizza's menu price is derived from these ingredient
 * prices at request time, so changing a price in the admin dashboard updates
 * every pizza instantly.
 */

export const inventorySeed = [
  // ---- Bases (5) ----
  {
    code: "classic-hand-tossed",
    name: "Classic Hand Tossed",
    category: "base",
    description: "Airy, foldable crust with a soft chew.",
    price: 119,
    stock: 140,
    threshold: 20
  },
  {
    code: "thin-crust",
    name: "Thin & Crisp",
    category: "base",
    description: "Rolled thin for a crunchy bite.",
    price: 129,
    stock: 110,
    threshold: 20
  },
  {
    code: "cheese-burst",
    name: "Cheese Burst",
    category: "base",
    description: "Molten mozzarella hidden in the rim.",
    price: 169,
    stock: 80,
    threshold: 20
  },
  {
    code: "whole-wheat",
    name: "Whole Wheat",
    category: "base",
    description: "Stone-ground atta with a nutty finish.",
    price: 139,
    stock: 95,
    threshold: 20
  },
  {
    code: "garlic-herb",
    name: "Garlic Herb",
    category: "base",
    description: "Butter-brushed with roasted garlic and oregano.",
    price: 149,
    stock: 70,
    threshold: 20
  },

  // ---- Sauces (5) ----
  {
    code: "classic-tomato",
    name: "Classic Tomato",
    category: "sauce",
    description: "Slow-cooked tomatoes, basil and a pinch of salt.",
    price: 39,
    stock: 160,
    threshold: 20
  },
  {
    code: "basil-pesto",
    name: "Basil Pesto",
    category: "sauce",
    description: "Fresh basil, garlic and toasted nuts.",
    price: 69,
    stock: 80,
    threshold: 20
  },
  {
    code: "smoky-bbq",
    name: "Smoky BBQ",
    category: "sauce",
    description: "Sweet, tangy and lightly smoked.",
    price: 59,
    stock: 90,
    threshold: 20
  },
  {
    code: "peri-peri",
    name: "Peri Peri",
    category: "sauce",
    description: "Bird's eye chilli with lemon and garlic.",
    price: 49,
    stock: 100,
    threshold: 20
  },
  {
    code: "white-garlic",
    name: "White Garlic",
    category: "sauce",
    description: "Creamy garlic base, no tomato.",
    price: 59,
    stock: 70,
    threshold: 20
  },

  // ---- Cheeses (3) ----
  {
    code: "mozzarella",
    name: "Mozzarella",
    category: "cheese",
    description: "The classic stretchy pizza cheese.",
    price: 89,
    stock: 180,
    threshold: 25
  },
  {
    code: "cheddar",
    name: "Aged Cheddar",
    category: "cheese",
    description: "Sharp, salty and deeply savoury.",
    price: 79,
    stock: 110,
    threshold: 20
  },
  {
    code: "parmesan",
    name: "Parmesan",
    category: "cheese",
    description: "Nutty, crystalline and aged 12 months.",
    price: 99,
    stock: 18,
    threshold: 20
  },

  // ---- Vegetables (8) ----
  {
    code: "onion",
    name: "Red Onion",
    category: "vegetable",
    description: "Thinly sliced for a sweet bite.",
    price: 19,
    stock: 220,
    threshold: 25
  },
  {
    code: "capsicum",
    name: "Capsicum",
    category: "vegetable",
    description: "Green bell pepper, sliced.",
    price: 25,
    stock: 160,
    threshold: 20
  },
  {
    code: "tomato",
    name: "Tomato",
    category: "vegetable",
    description: "Ripe, deseeded and sliced.",
    price: 19,
    stock: 150,
    threshold: 20
  },
  {
    code: "mushroom",
    name: "Mushroom",
    category: "vegetable",
    description: "Button mushrooms, sautéed.",
    price: 35,
    stock: 120,
    threshold: 20
  },
  {
    code: "sweet-corn",
    name: "Sweet Corn",
    category: "vegetable",
    description: "Golden kernels, lightly charred.",
    price: 25,
    stock: 140,
    threshold: 20
  },
  {
    code: "black-olives",
    name: "Black Olives",
    category: "vegetable",
    description: "Sliced and brined.",
    price: 39,
    stock: 16,
    threshold: 20
  },
  {
    code: "jalapeno",
    name: "Jalapeño",
    category: "vegetable",
    description: "Pickled green chilli rings.",
    price: 29,
    stock: 12,
    threshold: 20
  },
  {
    code: "baby-corn",
    name: "Baby Corn",
    category: "vegetable",
    description: "Crisp, mild and sweet.",
    price: 35,
    stock: 60,
    threshold: 20
  }
];

export const menuSeed = [
  {
    slug: "margherita",
    name: "Margherita",
    description:
      "The original. Hand-tossed base, slow-cooked tomato and a generous blanket of mozzarella.",
    image: "/images/menu-margherita.jpg",
    tags: ["classic", "veg"],
    ingredients: {
      base: "classic-hand-tossed",
      sauce: "classic-tomato",
      cheese: "mozzarella",
      vegetables: []
    },
    featured: true,
    sortOrder: 1
  },
  {
    slug: "farmhouse",
    name: "Farmhouse",
    description:
      "Onion, capsicum, tomato and mushroom piled high on a classic base.",
    image: "/images/menu-farmhouse.jpg",
    tags: ["loaded", "veg"],
    ingredients: {
      base: "classic-hand-tossed",
      sauce: "classic-tomato",
      cheese: "mozzarella",
      vegetables: ["onion", "capsicum", "tomato", "mushroom"]
    },
    featured: true,
    sortOrder: 2
  },
  {
    slug: "garden-pesto",
    name: "Garden Pesto",
    description:
      "Basil pesto, aged parmesan, mushrooms, sweet corn and black olives on whole wheat.",
    image: "/images/menu-garden-pesto.jpg",
    tags: ["premium", "veg"],
    ingredients: {
      base: "whole-wheat",
      sauce: "basil-pesto",
      cheese: "parmesan",
      vegetables: ["mushroom", "sweet-corn", "black-olives"]
    },
    featured: false,
    sortOrder: 3
  },
  {
    slug: "peri-peri-crunch",
    name: "Peri Peri Crunch",
    description:
      "Thin crust, fiery peri peri sauce, cheddar, onion, capsicum and baby corn.",
    image: "/images/menu-peri-peri.jpg",
    tags: ["spicy", "veg"],
    ingredients: {
      base: "thin-crust",
      sauce: "peri-peri",
      cheese: "cheddar",
      vegetables: ["onion", "capsicum", "baby-corn"]
    },
    featured: true,
    sortOrder: 4
  },
  {
    slug: "smoky-bbq-veg",
    name: "Smoky BBQ Veg",
    description:
      "Garlic-herb base with smoky BBQ sauce, cheddar, onion, corn and jalapeño.",
    image: "/images/menu-smoky-bbq.jpg",
    tags: ["smoky", "spicy", "veg"],
    ingredients: {
      base: "garlic-herb",
      sauce: "smoky-bbq",
      cheese: "cheddar",
      vegetables: ["onion", "sweet-corn", "jalapeno"]
    },
    featured: false,
    sortOrder: 5
  },
  {
    slug: "cheesy-garlic",
    name: "Cheesy Garlic",
    description:
      "Cheese-burst crust, white garlic sauce, mozzarella, onion and sweet corn.",
    image: "/images/menu-cheesy-garlic.jpg",
    tags: ["cheesy", "veg"],
    ingredients: {
      base: "cheese-burst",
      sauce: "white-garlic",
      cheese: "mozzarella",
      vegetables: ["onion", "sweet-corn"]
    },
    featured: false,
    sortOrder: 6
  },
  {
    slug: "jalapeno-heat",
    name: "Jalapeño Heat",
    description:
      "Thin crust, classic tomato, cheddar and a triple hit of jalapeño, onion and capsicum.",
    image: "/images/menu-jalapeno.jpg",
    tags: ["spicy", "veg"],
    ingredients: {
      base: "thin-crust",
      sauce: "classic-tomato",
      cheese: "cheddar",
      vegetables: ["jalapeno", "onion", "capsicum"]
    },
    featured: false,
    sortOrder: 7
  }
];
