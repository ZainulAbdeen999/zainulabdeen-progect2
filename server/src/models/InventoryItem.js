import mongoose from "mongoose";

export const CATEGORIES = ["base", "sauce", "cheese", "vegetable"];

const inventorySchema = new mongoose.Schema(
  {
    code: {
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
    category: {
      type: String,
      enum: CATEGORIES,
      required: true,
      index: true
    },
    description: {
      type: String,
      default: "",
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    threshold: {
      type: Number,
      min: 0,
      default: 20
    },
    unit: {
      type: String,
      default: "portion"
    },
    available: {
      type: Boolean,
      default: true
    },
    lastAlertAt: Date
  },
  { timestamps: true }
);

inventorySchema.virtual("lowStock").get(function lowStock() {
  return this.stock <= this.threshold;
});

inventorySchema.set("toJSON", { virtuals: true });

export const InventoryItem = mongoose.model("InventoryItem", inventorySchema);
