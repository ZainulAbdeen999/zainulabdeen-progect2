import express from "express";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { Order, ORDER_STATUSES } from "../models/Order.js";
import { InventoryItem } from "../models/InventoryItem.js";
import { MenuPizza } from "../models/MenuPizza.js";
// Staff payroll models (added with the admin Settings page).
import { StaffMember, STAFF_ROLES } from "../models/StaffMember.js";
import { Attendance, ATTENDANCE_STATUSES } from "../models/Attendance.js";
import { SalaryPayment } from "../models/SalaryPayment.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  badRequest,
  conflict,
  notFound,
  unauthorized
} from "../utils/ApiError.js";
import {
  isValidEmail,
  normalizeEmail,
  optionalString,
  requireString,
  validatePassword
} from "../utils/validation.js";
import {
  AUTH_COOKIE,
  cookieOptions,
  requireAdmin,
  signToken
} from "../middleware/auth.js";
import { restoreStockForOrder } from "../services/inventory.js";
import { runLowStockCheck } from "../services/lowStock.js";
import { authLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

const STATUS_RANK = {
  "Pending Payment": 0,
  "Order Received": 1,
  "In Kitchen": 2,
  "Sent to Delivery": 3,
  Delivered: 4
};

const ADMIN_SETTABLE = [
  "Order Received",
  "In Kitchen",
  "Sent to Delivery",
  "Delivered",
  "Cancelled"
];

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function withLowStock(item) {
  const plain = typeof item.toObject === "function" ? item.toObject() : item;
  return { ...plain, lowStock: plain.stock <= plain.threshold };
}

/*
 * Shape a rider user for the admin Riders page.
 * Passwords are never selected, so only profile fields are returned.
 */
function riderSafe(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.riderProfile?.phone || "",
    vehicle: user.riderProfile?.vehicle || "",
    active: user.riderProfile?.active !== false,
    createdAt: user.createdAt
  };
}

// Statuses that still need a rider / are in progress.
const RIDER_ACTIVE_STATUSES = ["Order Received", "In Kitchen", "Sent to Delivery"];

/* ------------------------------------------------------------------ */
/* Separate admin sign-in                                              */
/* ------------------------------------------------------------------ */
router.post(
  "/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!isValidEmail(email) || !password) {
      throw unauthorized("Admin credentials are incorrect", "INVALID_CREDENTIALS");
    }

    const user = await User.findOne({ email }).select("+passwordHash");
    const matches = user
      ? await bcrypt.compare(password, user.passwordHash)
      : false;

    if (!user || !matches || user.role !== "admin") {
      throw unauthorized("Admin credentials are incorrect", "INVALID_CREDENTIALS");
    }

    if (!user.emailVerified) {
      throw unauthorized(
        "This admin account has not been verified",
        "EMAIL_NOT_VERIFIED"
      );
    }

    res.cookie(AUTH_COOKIE, signToken(user), cookieOptions());
    res.json({
      message: "Signed in to the admin console",
      user: user.toSafeJSON()
    });
  })
);

// Everything below this line requires an admin session.
router.use(requireAdmin);

/* ------------------------------------------------------------------ */
/* Dashboard numbers                                                   */
/* ------------------------------------------------------------------ */
router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      todayOrders,
      statusGroups,
      revenueAgg,
      todayRevenueAgg,
      lowStockCount,
      inventoryCount,
      customerCount,
      menuCount,
      // Rider-system dashboard numbers.
      activeRiders,
      unassignedOrders,
      codOutstandingAgg,
      recentOrders
    ] = await Promise.all([
      Order.countDocuments({}),
      Order.countDocuments({ createdAt: { $gte: startOfToday } }),
      Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Order.aggregate([
        { $match: { "payment.status": "paid" } },
        { $group: { _id: null, total: { $sum: "$total" } } }
      ]),
      Order.aggregate([
        { $match: { "payment.status": "paid", createdAt: { $gte: startOfToday } } },
        { $group: { _id: null, total: { $sum: "$total" } } }
      ]),
      InventoryItem.countDocuments({
        $expr: { $lte: ["$stock", "$threshold"] }
      }),
      InventoryItem.countDocuments({}),
      User.countDocuments({ role: "user" }),
      MenuPizza.countDocuments({ available: true }),
      // Active riders available for assignment.
      User.countDocuments({ role: "rider", "riderProfile.active": { $ne: false } }),
      // Orders that still need a rider.
      Order.countDocuments({
        rider: null,
        status: { $in: ["Order Received", "In Kitchen"] },
        $or: [{ "payment.status": "paid" }, { "payment.method": "cod" }]
      }),
      // COD cash collected by riders but not yet settled with the owner.
      Order.aggregate([
        {
          $match: {
            "payment.method": "cod",
            "payment.status": "paid",
            "delivery.cashCollectedAt": { $ne: null },
            "delivery.cashSettledAt": null
          }
        },
        { $group: { _id: null, total: { $sum: "$total" } } }
      ]),
      Order.find({})
        .sort({ createdAt: -1 })
        .limit(8)
        .populate("user", "name email")
        .populate("rider", "name email riderProfile")
        .lean()
    ]);

    const statusCounts = Object.fromEntries(ORDER_STATUSES.map((status) => [status, 0]));
    for (const group of statusGroups) {
      if (group._id in statusCounts) statusCounts[group._id] = group.count;
    }

    res.json({
      stats: {
        totalOrders,
        todayOrders,
        revenue: revenueAgg[0]?.total || 0,
        todayRevenue: todayRevenueAgg[0]?.total || 0,
        lowStockCount,
        inventoryCount,
        customerCount,
        menuCount,
        // Rider-system summary.
        activeRiders,
        unassignedOrders,
        codOutstanding: codOutstandingAgg[0]?.total || 0,
        statusCounts
      },
      recentOrders
    });
  })
);

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */
router.get(
  "/orders",
  asyncHandler(async (req, res) => {
    const query = {};

    if (req.query.status && ORDER_STATUSES.includes(req.query.status)) {
      query.status = req.query.status;
    }
    if (req.query.q) {
      query.orderNumber = new RegExp(escapeRegex(req.query.q).slice(0, 40), "i");
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("user", "name email")
      // Rider is populated so the admin card can show the assigned name.
      .populate("rider", "name email riderProfile")
      .lean();

    res.json({ orders, statuses: ORDER_STATUSES });
  })
);

router.get(
  "/orders/:id",
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .populate("rider", "name email riderProfile")
      .lean();

    if (!order) throw notFound("Order not found");
    res.json({ order, statuses: ORDER_STATUSES });
  })
);

router.patch(
  "/orders/:id/status",
  asyncHandler(async (req, res) => {
    const target = String(req.body?.status || "");

    if (!ADMIN_SETTABLE.includes(target)) {
      throw badRequest("Choose a valid order status", "INVALID_STATUS");
    }

    const order = await Order.findById(req.params.id);
    if (!order) throw notFound("Order not found");

    if (order.status === target) {
      return res.json({ message: `Order is already "${target}"`, order });
    }

    if (target === "Cancelled") {
      if (["Delivered", "Cancelled"].includes(order.status)) {
        throw badRequest(
          "A delivered or cancelled order cannot be cancelled",
          "CANNOT_CANCEL"
        );
      }
      if (order.stockApplied) {
        await restoreStockForOrder(order.items);
        order.stockApplied = false;
      }
    } else {
      /*
       * COD orders (added with the rider system) move through the kitchen
       * before the cash is collected, so the old "must be paid" rule only
       * applies to online orders. Cash is settled by the rider on delivery.
       */
      const isCod = order.payment.method === "cod";
      if (order.payment.status !== "paid" && !isCod) {
        throw badRequest(
          "This order has not been paid yet, so it cannot move forward",
          "ORDER_NOT_PAID"
        );
      }

      const currentRank = STATUS_RANK[order.status] ?? -1;
      const targetRank = STATUS_RANK[target];

      if (targetRank <= currentRank) {
        throw badRequest(
          `Cannot move an order from "${order.status}" back to "${target}"`,
          "INVALID_TRANSITION"
        );
      }
    }

    order.status = target;
    order.statusHistory.push({
      status: target,
      note: optionalString(req.body?.note, 200) || `Updated by ${req.user.email}`,
      by: req.user.email
    });

    /*
     * Live delivery tracking hooks.
     * Dispatching an order records the time it left the kitchen and gives it a
     * default 30 minute ETA when the admin has not set one yet. Marking it
     * delivered stores the completion time for the customer timeline.
     */
    if (target === "Sent to Delivery") {
      if (!order.delivery) order.delivery = {};
      if (!order.delivery.dispatchedAt) order.delivery.dispatchedAt = new Date();
      if (!order.delivery.etaAt) {
        order.delivery.etaAt = new Date(Date.now() + 30 * 60 * 1000);
      }
    }

    if (target === "Delivered") {
      if (!order.delivery) order.delivery = {};
      order.delivery.deliveredAt = new Date();
    }

    await order.save();

    res.json({ message: `Order moved to "${target}"`, order });
  })
);

/* ------------------------------------------------------------------ */
/* Live delivery tracking                                              */
/* ------------------------------------------------------------------ */
/*
 * The admin sets the rider and an ETA from the Orders screen. The ETA is
 * stored as an absolute timestamp so every browser shows the same countdown,
 * even when the customer reloads the page or uses a different device.
 */
router.patch(
  "/orders/:id/delivery",
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) throw notFound("Order not found");

    if (["Delivered", "Cancelled"].includes(order.status)) {
      throw badRequest(
        "Delivery details are locked once the order is closed",
        "DELIVERY_LOCKED"
      );
    }

    const updates = {};

    // Empty strings are allowed so the admin can clear a mistake.
    if (req.body?.driverName !== undefined) {
      updates.driverName = optionalString(req.body.driverName, 80);
    }

    if (req.body?.driverPhone !== undefined) {
      const phone = optionalString(req.body.driverPhone, 20);
      if (phone && !/^[0-9+() -]{7,20}$/.test(phone)) {
        throw badRequest("Enter a valid rider phone number", "INVALID_RIDER_PHONE");
      }
      updates.driverPhone = phone;
    }

    if (req.body?.note !== undefined) {
      updates.note = optionalString(req.body.note, 160);
    }

    if (req.body?.etaMinutes !== undefined && req.body.etaMinutes !== "") {
      const etaMinutes = Number(req.body.etaMinutes);
      if (!Number.isFinite(etaMinutes) || etaMinutes < 1 || etaMinutes > 240) {
        throw badRequest(
          "ETA must be between 1 and 240 minutes",
          "INVALID_ETA"
        );
      }
      updates.etaAt = new Date(Date.now() + Math.round(etaMinutes) * 60000);
    }

    if (Object.keys(updates).length === 0) {
      throw badRequest("Nothing to update", "NO_CHANGES");
    }

    if (!order.delivery) order.delivery = {};
    Object.assign(order.delivery, updates);
    await order.save();

    res.json({ message: "Delivery tracking updated", order });
  })
);

/* ------------------------------------------------------------------ */
/* Riders (added with the rider system)                                */
/* ------------------------------------------------------------------ */
router.get(
  "/riders",
  asyncHandler(async (req, res) => {
    const [riders, stats, unassignedOrders] = await Promise.all([
      User.find({ role: "rider" }).sort({ createdAt: 1 }).lean(),
      // One aggregate gives each rider their active, delivered and COD totals.
      Order.aggregate([
        { $match: { rider: { $ne: null } } },
        {
          $group: {
            _id: "$rider",
            active: {
              $sum: {
                $cond: [{ $in: ["$status", RIDER_ACTIVE_STATUSES] }, 1, 0]
              }
            },
            delivered: {
              $sum: { $cond: [{ $eq: ["$status", "Delivered"] }, 1, 0] }
            },
            cashInHand: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$payment.method", "cod"] },
                      { $eq: ["$payment.status", "paid"] },
                      { $ne: ["$delivery.cashCollectedAt", null] },
                      {
                        $eq: [
                          { $ifNull: ["$delivery.cashSettledAt", null] },
                          null
                        ]
                      }
                    ]
                  },
                  "$total",
                  0
                ]
              }
            },
            cashOrders: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$payment.method", "cod"] },
                      { $eq: ["$payment.status", "paid"] },
                      { $ne: ["$delivery.cashCollectedAt", null] },
                      {
                        $eq: [
                          { $ifNull: ["$delivery.cashSettledAt", null] },
                          null
                        ]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),
      Order.countDocuments({
        rider: null,
        status: { $in: ["Order Received", "In Kitchen"] },
        $or: [{ "payment.status": "paid" }, { "payment.method": "cod" }]
      })
    ]);

    const statsById = new Map(stats.map((row) => [row._id.toString(), row]));

    const payload = riders.map((rider) => {
      const row = statsById.get(rider._id.toString()) || {};
      return {
        ...riderSafe(rider),
        stats: {
          active: row.active || 0,
          delivered: row.delivered || 0,
          cashInHand: row.cashInHand || 0,
          cashOrders: row.cashOrders || 0
        }
      };
    });

    res.json({
      riders: payload,
      unassignedOrders,
      totals: {
        riders: payload.length,
        activeRiders: payload.filter((rider) => rider.active).length,
        cashInHand: payload.reduce((sum, rider) => sum + rider.stats.cashInHand, 0),
        unassignedOrders
      }
    });
  })
);

router.post(
  "/riders",
  asyncHandler(async (req, res) => {
    const name = requireString(req.body?.name, "Rider name", { min: 2, max: 80 });
    const email = normalizeEmail(req.body?.email);

    if (!isValidEmail(email)) {
      throw badRequest("Enter a valid rider email", "INVALID_EMAIL");
    }

    const passwordError = validatePassword(req.body?.password);
    if (passwordError) throw badRequest(passwordError, "WEAK_PASSWORD");

    const existing = await User.findOne({ email });
    if (existing) {
      throw conflict("An account with this email already exists", "EMAIL_IN_USE");
    }

    const phone = optionalString(req.body?.phone, 20);
    if (phone && !/^[0-9+() -]{7,20}$/.test(phone)) {
      throw badRequest("Enter a valid rider phone number", "INVALID_PHONE");
    }

    const vehicle = optionalString(req.body?.vehicle, 40);
    const passwordHash = await bcrypt.hash(String(req.body.password), 12);

    const rider = await User.create({
      name,
      email,
      passwordHash,
      role: "rider",
      // Riders are created by the admin, so their email is already trusted.
      emailVerified: true,
      emailVerifiedAt: new Date(),
      riderProfile: {
        phone,
        vehicle,
        active: req.body?.active !== false
      }
    });

    res.status(201).json({
      message: "Rider created",
      rider: {
        ...riderSafe(rider),
        stats: { active: 0, delivered: 0, cashInHand: 0, cashOrders: 0 }
      }
    });
  })
);

router.patch(
  "/riders/:id",
  asyncHandler(async (req, res) => {
    const rider = await User.findOne({
      _id: req.params.id,
      role: "rider"
    }).select("+passwordHash");

    if (!rider) throw notFound("Rider not found");

    if (req.body?.name !== undefined) {
      rider.name = requireString(req.body.name, "Rider name", {
        min: 2,
        max: 80
      });
    }

    if (req.body?.email !== undefined) {
      const email = normalizeEmail(req.body.email);
      if (!isValidEmail(email)) {
        throw badRequest("Enter a valid rider email", "INVALID_EMAIL");
      }
      if (email !== rider.email) {
        const existing = await User.findOne({
          email,
          _id: { $ne: rider._id }
        });
        if (existing) {
          throw conflict(
            "An account with this email already exists",
            "EMAIL_IN_USE"
          );
        }
        rider.email = email;
      }
    }

    if (req.body?.phone !== undefined) {
      const phone = optionalString(req.body.phone, 20);
      if (phone && !/^[0-9+() -]{7,20}$/.test(phone)) {
        throw badRequest("Enter a valid rider phone number", "INVALID_PHONE");
      }
      rider.riderProfile.phone = phone;
    }

    if (req.body?.vehicle !== undefined) {
      rider.riderProfile.vehicle = optionalString(req.body.vehicle, 40);
    }

    if (req.body?.active !== undefined) {
      rider.riderProfile.active = Boolean(req.body.active);
    }

    // Optional password reset from the admin Riders page.
    if (req.body?.password) {
      const passwordError = validatePassword(req.body.password);
      if (passwordError) throw badRequest(passwordError, "WEAK_PASSWORD");
      rider.passwordHash = await bcrypt.hash(String(req.body.password), 12);
      rider.passwordChangedAt = new Date();
    }

    await rider.save();
    res.json({ message: "Rider updated", rider: riderSafe(rider) });
  })
);

router.post(
  "/riders/:id/settle",
  asyncHandler(async (req, res) => {
    const rider = await User.findOne({ _id: req.params.id, role: "rider" });
    if (!rider) throw notFound("Rider not found");

    // Only cash that has been collected and not yet handed over is settled.
    const orders = await Order.find({
      rider: rider._id,
      "payment.method": "cod",
      "payment.status": "paid",
      "delivery.cashCollectedAt": { $ne: null },
      "delivery.cashSettledAt": null
    });

    if (orders.length === 0) {
      return res.json({
        message: "No cash is waiting to be settled",
        total: 0,
        count: 0
      });
    }

    const total = orders.reduce((sum, order) => sum + order.total, 0);
    const now = new Date();

    await Order.updateMany(
      { _id: { $in: orders.map((order) => order._id) } },
      { $set: { "delivery.cashSettledAt": now } }
    );

    res.json({
      message: `Cash settled for ${rider.name}`,
      total,
      count: orders.length
    });
  })
);

/* Assign or unassign a rider from an admin order card. */
router.patch(
  "/orders/:id/assign",
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) throw notFound("Order not found");

    if (["Delivered", "Cancelled"].includes(order.status)) {
      throw badRequest("A closed order cannot be reassigned", "ORDER_CLOSED");
    }

    if (order.status === "Sent to Delivery") {
      throw badRequest(
        "The rider cannot be changed after pickup",
        "RIDER_LOCKED"
      );
    }

    const riderId = String(req.body?.riderId || "").trim();

    if (!riderId) {
      order.rider = null;
      if (!order.delivery) order.delivery = {};
      order.delivery.assignedAt = undefined;
      order.delivery.acceptedAt = undefined;
      order.delivery.driverName = "";
      order.delivery.driverPhone = "";
      order.statusHistory.push({
        status: order.status,
        note: "Rider unassigned",
        by: req.user.email
      });
      await order.save();
      return res.json({ message: "Rider unassigned", order });
    }

    const rider = await User.findOne({ _id: riderId, role: "rider" });
    if (!rider) throw notFound("Rider not found");
    if (rider.riderProfile?.active === false) {
      throw badRequest("This rider is inactive", "RIDER_INACTIVE");
    }

    order.rider = rider._id;
    if (!order.delivery) order.delivery = {};
    order.delivery.assignedAt = new Date();
    order.delivery.acceptedAt = undefined;
    order.delivery.driverName = rider.name;
    order.delivery.driverPhone = rider.riderProfile?.phone || "";
    order.statusHistory.push({
      status: order.status,
      note: `Assigned to rider ${rider.name}`,
      by: req.user.email
    });
    await order.save();

    res.json({ message: `Assigned to ${rider.name}`, order });
  })
);

/* Admin override for an OTP that locked after five wrong attempts. */
router.post(
  "/orders/:id/otp/reset",
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) throw notFound("Order not found");

    if (!order.delivery) order.delivery = {};
    order.delivery.otpAttempts = 0;
    order.delivery.otpLocked = false;
    await order.save();

    res.json({ message: "OTP attempts reset", order });
  })
);

/* ------------------------------------------------------------------ */
/* Inventory                                                           */
/* ------------------------------------------------------------------ */
router.get(
  "/inventory",
  asyncHandler(async (req, res) => {
    const items = await InventoryItem.find({})
      .sort({ category: 1, name: 1 })
      .lean();

    res.json({
      items: items.map(withLowStock),
      config: {
        threshold: env.lowStockThreshold,
        cron: env.lowStockCron,
        alertHours: env.lowStockAlertHours
      }
    });
  })
);

router.patch(
  "/inventory/:id",
  asyncHandler(async (req, res) => {
    const updates = {};

    if (req.body?.stock !== undefined) {
      const stock = Number(req.body.stock);
      if (!Number.isFinite(stock) || stock < 0) {
        throw badRequest("Stock must be zero or more", "INVALID_STOCK");
      }
      updates.stock = Math.floor(stock);
    }

    if (req.body?.price !== undefined) {
      const price = Number(req.body.price);
      if (!Number.isFinite(price) || price < 0) {
        throw badRequest("Price must be zero or more", "INVALID_PRICE");
      }
      updates.price = Math.round(price);
    }

    if (req.body?.threshold !== undefined) {
      const threshold = Number(req.body.threshold);
      if (!Number.isFinite(threshold) || threshold < 0) {
        throw badRequest("Threshold must be zero or more", "INVALID_THRESHOLD");
      }
      updates.threshold = Math.floor(threshold);
    }

    if (req.body?.available !== undefined) {
      updates.available = Boolean(req.body.available);
    }

    if (Object.keys(updates).length === 0) {
      throw badRequest("Nothing to update", "NO_CHANGES");
    }

    const item = await InventoryItem.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!item) throw notFound("Inventory item not found");

    res.json({ message: `${item.name} updated`, item: withLowStock(item) });
  })
);

/* ------------------------------------------------------------------ */
/* Low-stock monitor                                                   */
/* ------------------------------------------------------------------ */
router.get(
  "/low-stock",
  asyncHandler(async (req, res) => {
    const items = await InventoryItem.find({
      $expr: { $lte: ["$stock", "$threshold"] }
    })
      .sort({ stock: 1, name: 1 })
      .lean();

    res.json({
      items: items.map(withLowStock),
      config: {
        threshold: env.lowStockThreshold,
        cron: env.lowStockCron,
        alertHours: env.lowStockAlertHours,
        smtpConfigured: env.smtp.configured
      }
    });
  })
);

router.post(
  "/low-stock/check",
  asyncHandler(async (req, res) => {
    const result = await runLowStockCheck({ force: true });

    res.json({
      message: result.sent
        ? `Alert sent for ${result.alerted} ingredient(s)`
        : result.lowCount === 0
          ? "Everything is above its threshold"
          : "Alert was recently sent — use force to send again",
      result
    });
  })
);

/* ------------------------------------------------------------------ */
/* Menu availability                                                   */
/* ------------------------------------------------------------------ */
router.get(
  "/menu",
  asyncHandler(async (req, res) => {
    const pizzas = await MenuPizza.find({}).sort({ sortOrder: 1, name: 1 }).lean();
    res.json({ pizzas });
  })
);

router.patch(
  "/menu/:slug",
  asyncHandler(async (req, res) => {
    if (typeof req.body?.available !== "boolean") {
      throw badRequest("Send { available: true | false }", "INVALID_AVAILABILITY");
    }

    const pizza = await MenuPizza.findOneAndUpdate(
      { slug: req.params.slug },
      { $set: { available: req.body.available } },
      { new: true }
    );

    if (!pizza) throw notFound("Pizza not found");

    res.json({ message: `${pizza.name} updated`, pizza });
  })
);

/* ------------------------------------------------------------------ */
/* Staff & payroll (added with the admin Settings page)                */
/* ------------------------------------------------------------------ */

function pad2(value) {
  return String(value).padStart(2, "0");
}

/** Today's local date as YYYY-MM-DD. */
function dateKeyFrom(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Validate a "YYYY-MM" month and return its length. */
function monthMeta(raw) {
  const fallback = dateKeyFrom().slice(0, 7);
  const month = /^\d{4}-\d{2}$/.test(String(raw || "")) ? String(raw) : fallback;
  const [year, monthNumber] = month.split("-").map(Number);

  if (monthNumber < 1 || monthNumber > 12) {
    throw badRequest("Choose a valid month", "INVALID_MONTH");
  }

  return {
    month,
    daysInMonth: new Date(year, monthNumber, 0).getDate()
  };
}

function isDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Salary earned so far this month.
 * A full day counts 1, a half day 0.5, and leave/absent count 0.
 */
function computePayable(monthlySalary, daysInMonth, counts) {
  const days = counts.present + counts.half * 0.5;
  const daily = (Number(monthlySalary) || 0) / daysInMonth;
  return Math.round(daily * days);
}

/**
 * Build a validated staff payload. In partial mode only the fields that were
 * sent are returned, so a PATCH never clears values the admin did not touch.
 */
async function staffPayload(body, { partial = false } = {}) {
  const updates = {};

  if (!partial || body?.name !== undefined) {
    updates.name = requireString(body?.name, "Staff name", { min: 2, max: 80 });
  }

  if (!partial || body?.phone !== undefined) {
    updates.phone = optionalString(body?.phone, 20);
  }

  if (!partial || body?.role !== undefined) {
    const role = String(body?.role || "Other");
    if (!STAFF_ROLES.includes(role)) {
      throw badRequest("Choose a valid staff role", "INVALID_ROLE");
    }
    updates.role = role;
  }

  if (!partial || body?.monthlySalary !== undefined) {
    const salary = Number(body?.monthlySalary ?? 0);
    if (!Number.isFinite(salary) || salary < 0) {
      throw badRequest("Salary must be zero or more", "INVALID_SALARY");
    }
    updates.monthlySalary = Math.round(salary);
  }

  if (!partial || body?.joinedAt !== undefined) {
    if (body?.joinedAt) {
      const joined = new Date(body.joinedAt);
      if (Number.isNaN(joined.getTime())) {
        throw badRequest("Choose a valid joining date", "INVALID_DATE");
      }
      updates.joinedAt = joined;
    } else if (!partial) {
      updates.joinedAt = new Date();
    }
  }

  if (!partial || body?.active !== undefined) {
    updates.active = body?.active === undefined ? true : Boolean(body.active);
  }

  if (!partial || body?.notes !== undefined) {
    updates.notes = optionalString(body?.notes, 300);
  }

  if (!partial || body?.userId !== undefined) {
    const raw = String(body?.userId || "").trim();
    if (!raw) {
      updates.userId = null;
    } else {
      // Only real rider accounts can be linked to a Rider staff record.
      const rider = await User.findOne({ _id: raw, role: "rider" }).select("_id");
      if (!rider) throw badRequest("Choose a valid rider account", "INVALID_RIDER");
      updates.userId = rider._id;
    }
  }

  return updates;
}

function staffSafe(staff) {
  return {
    id: staff._id.toString(),
    name: staff.name,
    phone: staff.phone || "",
    role: staff.role,
    monthlySalary: staff.monthlySalary,
    joinedAt: staff.joinedAt,
    active: staff.active !== false,
    userId: staff.userId ? staff.userId.toString() : null,
    notes: staff.notes || ""
  };
}

router.get(
  "/staff",
  asyncHandler(async (req, res) => {
    const { month, daysInMonth } = monthMeta(req.query.month);
    const today = dateKeyFrom();
    // The Settings page can mark attendance for any date, so accept an
    // optional ?date=YYYY-MM-DD and echo it back with each staff row.
    const selectedDate = isDateKey(req.query.date)
      ? String(req.query.date)
      : today;

    const staff = await StaffMember.find({})
      .sort({ active: -1, role: 1, name: 1 })
      .lean();
    const ids = staff.map((member) => member._id);

    const [attendance, selectedRows, payments, riderAccounts] = await Promise.all([
      ids.length
        ? Attendance.find({
            staff: { $in: ids },
            dateKey: { $regex: `^${month}-` }
          }).lean()
        : [],
      // When the chosen date is outside the selected month it is not part of
      // the month query above, so fetch those rows separately.
      ids.length && !selectedDate.startsWith(`${month}-`)
        ? Attendance.find({ staff: { $in: ids }, dateKey: selectedDate }).lean()
        : [],
      ids.length
        ? SalaryPayment.find({ staff: { $in: ids }, month }).lean()
        : [],
      User.countDocuments({ role: "rider" })
    ]);

    // Status for the chosen attendance date, used by the P/H/A/L buttons.
    const selectedByStaff = new Map();
    for (const row of selectedRows) {
      selectedByStaff.set(row.staff.toString(), row.status);
    }

    // Roll the month's attendance into per-staff counters.
    const attendanceByStaff = new Map();
    for (const row of attendance) {
      const key = row.staff.toString();
      if (!attendanceByStaff.has(key)) {
        attendanceByStaff.set(key, {
          present: 0,
          half: 0,
          absent: 0,
          leave: 0,
          todayStatus: null,
          selectedStatus: null
        });
      }
      const bucket = attendanceByStaff.get(key);
      if (row.status === "present") bucket.present += 1;
      else if (row.status === "half") bucket.half += 1;
      else if (row.status === "absent") bucket.absent += 1;
      else if (row.status === "leave") bucket.leave += 1;
      if (row.dateKey === today) bucket.todayStatus = row.status;
      if (row.dateKey === selectedDate) bucket.selectedStatus = row.status;
    }

    const paidByStaff = new Map();
    for (const payment of payments) {
      const key = payment.staff.toString();
      paidByStaff.set(key, (paidByStaff.get(key) || 0) + payment.amount);
    }

    const rows = staff.map((member) => {
      const key = member._id.toString();
      const counts = attendanceByStaff.get(key) || {
        present: 0,
        half: 0,
        absent: 0,
        leave: 0,
        todayStatus: null,
        selectedStatus: null
      };
      const payable = computePayable(member.monthlySalary, daysInMonth, counts);
      const paid = paidByStaff.get(key) || 0;

      return {
        ...staffSafe(member),
        attendance: counts,
        daysCounted: counts.present + counts.half * 0.5,
        payable,
        paid,
        balance: Math.max(0, payable - paid),
        todayStatus: counts.todayStatus,
        // Falls back to the extra query when the chosen date is not in the
        // selected month (the month bucket has no row for it then).
        selectedStatus: counts.selectedStatus || selectedByStaff.get(key) || null
      };
    });

    const activeRows = rows.filter((row) => row.active);

    res.json({
      month,
      daysInMonth,
      today,
      // Echo the chosen date so the client can label the attendance controls.
      date: selectedDate,
      staff: rows,
      summary: {
        total: rows.length,
        active: activeRows.length,
        riders: activeRows.filter((row) => row.role === "Rider").length,
        riderAccounts,
        // "Present" counts the chosen attendance date, not just today.
        presentToday: rows.filter(
          (row) => row.selectedStatus === "present" || row.selectedStatus === "half"
        ).length,
        monthlyPayroll: activeRows.reduce(
          (sum, row) => sum + row.monthlySalary,
          0
        ),
        payable: rows.reduce((sum, row) => sum + row.payable, 0),
        paid: rows.reduce((sum, row) => sum + row.paid, 0),
        pending: rows.reduce((sum, row) => sum + row.balance, 0)
      }
    });
  })
);

router.post(
  "/staff",
  asyncHandler(async (req, res) => {
    const payload = await staffPayload(req.body);
    if (payload.role !== "Rider") payload.userId = null;

    const staff = await StaffMember.create(payload);
    res.status(201).json({
      message: `${staff.name} added to staff`,
      staff: staffSafe(staff)
    });
  })
);

router.patch(
  "/staff/:id",
  asyncHandler(async (req, res) => {
    const staff = await StaffMember.findById(req.params.id);
    if (!staff) throw notFound("Staff member not found");

    const updates = await staffPayload(req.body, { partial: true });
    if (Object.keys(updates).length === 0) {
      throw badRequest("Nothing to update", "NO_CHANGES");
    }

    // A non-rider record cannot keep a rider account link.
    const nextRole = updates.role ?? staff.role;
    if (nextRole !== "Rider") updates.userId = null;

    Object.assign(staff, updates);
    await staff.save();

    res.json({ message: `${staff.name} updated`, staff: staffSafe(staff) });
  })
);

router.post(
  "/staff/:id/attendance",
  asyncHandler(async (req, res) => {
    const staff = await StaffMember.findById(req.params.id);
    if (!staff) throw notFound("Staff member not found");

    const dateKey = String(req.body?.date || dateKeyFrom());
    if (!isDateKey(dateKey)) {
      throw badRequest("Choose a valid date", "INVALID_DATE");
    }

    const status = String(req.body?.status || "present");
    if (!ATTENDANCE_STATUSES.includes(status)) {
      throw badRequest(
        "Choose present, half, absent or leave",
        "INVALID_STATUS"
      );
    }

    const note = optionalString(req.body?.note, 200);

    const row = await Attendance.findOneAndUpdate(
      { staff: staff._id, dateKey },
      { $set: { status, note } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({
      message: `${staff.name} marked ${status} on ${dateKey}`,
      attendance: {
        id: row._id.toString(),
        dateKey,
        status: row.status,
        note: row.note
      }
    });
  })
);

router.post(
  "/staff/:id/salary",
  asyncHandler(async (req, res) => {
    const staff = await StaffMember.findById(req.params.id);
    if (!staff) throw notFound("Staff member not found");

    const { month, daysInMonth } = monthMeta(req.body?.month);

    const attendance = await Attendance.find({
      staff: staff._id,
      dateKey: { $regex: `^${month}-` }
    }).lean();

    const counts = { present: 0, half: 0 };
    for (const row of attendance) {
      if (row.status === "present") counts.present += 1;
      else if (row.status === "half") counts.half += 1;
    }

    const payable = computePayable(staff.monthlySalary, daysInMonth, counts);
    const existing = await SalaryPayment.findOne({ staff: staff._id, month });
    const alreadyPaid = existing?.amount || 0;
    const balance = Math.max(0, payable - alreadyPaid);

    if (balance <= 0) {
      throw badRequest("This month's salary is already settled", "SALARY_SETTLED");
    }

    const requested =
      req.body?.amount === undefined || req.body?.amount === ""
        ? balance
        : Number(req.body.amount);

    if (!Number.isFinite(requested) || requested <= 0) {
      throw badRequest("Payment must be more than zero", "INVALID_AMOUNT");
    }

    // Never record more than the earned balance; the admin can pay the rest
    // next time after more attendance is marked.
    const amount = Math.min(Math.round(requested), balance);
    const daysPresent = counts.present + counts.half * 0.5;

    if (existing) {
      existing.amount = alreadyPaid + amount;
      existing.daysPresent = daysPresent;
      if (req.body?.note !== undefined) {
        existing.note = optionalString(req.body.note, 200);
      }
      await existing.save();
    } else {
      await SalaryPayment.create({
        staff: staff._id,
        month,
        amount,
        daysPresent,
        note: optionalString(req.body?.note, 200)
      });
    }

    res.json({
      message: `Salary recorded for ${staff.name} (${month})`,
      paid: amount,
      totalPaid: alreadyPaid + amount,
      payable,
      balance: balance - amount
    });
  })
);

export default router;
