import { env } from "../config/env.js";
import { InventoryItem } from "../models/InventoryItem.js";
import { User } from "../models/User.js";
import { sendLowStockEmail } from "./mailer.js";
import { findLowStockItems } from "./inventory.js";

async function adminRecipients() {
  const admins = await User.find({ role: "admin" }).select("email").lean();
  const recipients = new Set(admins.map((admin) => admin.email));
  recipients.add(env.admin.email);
  return [...recipients];
}

/**
 * Run the low-stock check.
 *
 * The node-cron job calls this every few minutes. Each ingredient is emailed
 * at most once per LOW_STOCK_ALERT_HOURS so the inbox is not flooded. A manual
 * run from the admin dashboard passes `force` to bypass that cooldown.
 */
export async function runLowStockCheck({ force = false } = {}) {
  const lowItems = await findLowStockItems();

  if (lowItems.length === 0) {
    return { sent: false, lowCount: 0, alerted: 0, items: [] };
  }

  const cutoff = new Date(
    Date.now() - env.lowStockAlertHours * 60 * 60 * 1000
  );

  const dueItems = force
    ? lowItems
    : lowItems.filter(
        (item) => !item.lastAlertAt || new Date(item.lastAlertAt) < cutoff
      );

  if (dueItems.length === 0) {
    return {
      sent: false,
      lowCount: lowItems.length,
      alerted: 0,
      skipped: true,
      items: lowItems
    };
  }

  const recipients = await adminRecipients();
  const result = await sendLowStockEmail({ items: dueItems, recipients });

  await InventoryItem.updateMany(
    { _id: { $in: dueItems.map((item) => item._id) } },
    { $set: { lastAlertAt: new Date() } }
  );

  return {
    sent: true,
    lowCount: lowItems.length,
    alerted: dueItems.length,
    recipients,
    mode: result.mode,
    items: dueItems
  };
}
