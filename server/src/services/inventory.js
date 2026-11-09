import { InventoryItem } from "../models/InventoryItem.js";
import { badRequest } from "../utils/ApiError.js";

/**
 * Turn an order's items into a map of ingredient code -> units required.
 * One pizza consumes one portion of each ingredient on it.
 */
export function requiredQuantities(items) {
  const need = new Map();

  for (const item of items || []) {
    const quantity = Number(item.quantity) || 1;
    for (const ingredient of item.ingredients || []) {
      need.set(
        ingredient.code,
        (need.get(ingredient.code) || 0) + quantity
      );
    }
  }

  return need;
}

/**
 * Decrement stock for a paid order.
 *
 * Each ingredient is decremented with a conditional update (`stock >= qty`),
 * which keeps concurrent orders from overselling. If any ingredient runs out
 * midway, everything already decremented in this call is put back and the
 * whole order is rejected.
 */
export async function applyStockForOrder(items) {
  const need = requiredQuantities(items);
  const applied = [];

  for (const [code, quantity] of need) {
    const updated = await InventoryItem.findOneAndUpdate(
      { code, available: true, stock: { $gte: quantity } },
      { $inc: { stock: -quantity } },
      { new: true }
    );

    if (!updated) {
      await rollbackStock(applied);
      const existing = await InventoryItem.findOne({ code }).lean();
      const name = existing ? existing.name : code;
      throw badRequest(
        `${name} just went out of stock. Please adjust your order.`,
        "OUT_OF_STOCK"
      );
    }

    applied.push({ code, quantity });
  }

  return applied;
}

/** Undo a partial decrement (used when a later step fails). */
export async function rollbackStock(applied) {
  for (const { code, quantity } of applied || []) {
    await InventoryItem.updateOne({ code }, { $inc: { stock: quantity } });
  }
}

/** Put stock back when an order is cancelled. */
export async function restoreStockForOrder(items) {
  const need = requiredQuantities(items);
  for (const [code, quantity] of need) {
    await InventoryItem.updateOne({ code }, { $inc: { stock: quantity } });
  }
}

/** Items at or below their own threshold, lowest first. */
export async function findLowStockItems() {
  return InventoryItem.find({
    $expr: { $lte: ["$stock", "$threshold"] }
  })
    .sort({ stock: 1, name: 1 })
    .lean();
}
