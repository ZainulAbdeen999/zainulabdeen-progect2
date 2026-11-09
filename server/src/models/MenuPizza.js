import mongoose from "mongoose";

/**
 * A named pizza on the menu. Its price is always calculated from the
 * current inventory prices, so admin price changes flow through instantly.
 */
const menuPizzaSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: "",
      trim: true
    },
    image: {
      type: String,
      default: ""
    },
    tags: [{ type: String, trim: true }],
    ingredients: {
      base: { type: String, required: true },
      sauce: { type: String, required: true },
      cheese: { type: String, required: true },
      vegetables: [{ type: String }]
    },
    featured: {
      type: Boolean,
      default: false
    },
    available: {
      type: Boolean,
      default: true
    },
    sortOrder: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

export const MenuPizza = mongoose.model("MenuPizza", menuPizzaSchema);
