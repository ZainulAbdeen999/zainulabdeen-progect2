import express from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Order } from "../models/Order.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest, forbidden, notFound, unauthorized } from "../utils/ApiError.js";
import { isValidEmail, normalizeEmail } from "../utils/validation.js";
import {
  AUTH_COOKIE,
  cookieOptions,
  requireRider,
  signToken
} from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimit.js";

/*
 * Rider API (added with the rider system).
 *
 * Riders only ever see:
 *  - orders assigned to them, and
 *  - the unassigned "available" queue (without the customer's exact address).
 *
 * The 4-digit delivery OTP is stored on the order but is deliberately removed
 * from every rider response below. Only the customer (and the admin) can see it.
 */

const router = express.Router();

const ACTIVE_STATUSES = ["Order Received", "In Kitchen", "Sent to Delivery"];

/** Remove secrets before an order is sent to a rider. */
function toRiderOrder(order) {
  if (!order) return order;
  const plain = typeof order.toObject === "function" ? order.toObject() : { ...order };

  if (plain.delivery) {
    const { otp, otpAttempts, otpLocked, ...safeDelivery } = plain.delivery;
    plain.delivery = safeDelivery;
  }

  return plain;
}

/**
 * The available queue hides the exact address and phone number until the rider
 * claims the order. City + PIN are enough to decide whether to take it.
 */
function toAvailableOrder(order) {
  const safe = toRiderOrder(order);
  if (safe.address) {
    safe.address = {
      city: safe.address.city,
      pincode: safe.address.pincode
    };
  }
  return safe;
}

/** Load an order only when it belongs to the signed-in rider. */
async function findAssignedOrder(req) {
  const order = await Order.findOne({
    _id: req.params.id,
    rider: req.user._id
  });

  if (!order) {
    throw notFound("Order not found or not assigned to you", "ORDER_NOT_FOUND");
  }

  return order;
}

/* ------------------------------------------------------------------ */
/* Rider sign-in                                                       */
/* ------------------------------------------------------------------ */
router.post(
  "/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!isValidEmail(email) || !password) {
      throw unauthorized("Rider credentials are incorrect", "INVALID_CREDENTIALS");
    }

    const user = await User.findOne({ email }).select("+passwordHash");
    const matches = user
      ? await bcrypt.compare(password, user.passwordHash)
      : false;

    if (!user || !matches || user.role !== "rider") {
      throw unauthorized("Rider credentials are incorrect", "INVALID_CREDENTIALS");
    }

    if (user.riderProfile?.active === false) {
      throw forbidden(
        "This rider account is inactive. Contact the store.",
        "RIDER_INACTIVE"
      );
    }

    res.cookie(AUTH_COOKIE, signToken(user), cookieOptions());
    res.json({
      message: "Signed in to the rider dashboard",
      user: user.toSafeJSON()
    });
  })
);

// Everything below requires an active rider session.
router.use(requireRider);

/* ------------------------------------------------------------------ */
/* Dashboard data: my orders + available queue + cash summary          */
/* ------------------------------------------------------------------ */
router.get(
  "/orders",
  asyncHandler(async (req, res) => {
    const riderId = req.user._id;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [orders, available, cashAgg, deliveredToday] = await Promise.all([
      Order.find({
        rider: riderId,
        status: { $in: [...ACTIVE_STATUSES, "Delivered"] }
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      Order.find({
        rider: null,
        status: { $in: ["Order Received", "In Kitchen"] },
        $or: [{ "payment.status": "paid" }, { "payment.method": "cod" }]
      })
        .sort({ createdAt: 1 })
        .limit(30)
        .lean(),
      // COD cash the rider has collected but not yet handed to the admin.
      Order.aggregate([
        {
          $match: {
            rider: riderId,
            "payment.method": "cod",
            "payment.status": "paid",
            "delivery.cashCollectedAt": { $ne: null },
            "delivery.cashSettledAt": null
          }
        },
        { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } }
      ]),
      Order.countDocuments({
        rider: riderId,
        status: "Delivered",
        "delivery.deliveredAt": { $gte: startOfToday }
      })
    ]);

    const activeCount = orders.filter((order) =>
      ACTIVE_STATUSES.includes(order.status)
    ).length;

    res.json({
      orders: orders.map(toRiderOrder),
      available: available.map(toAvailableOrder),
      summary: {
        active: activeCount,
        deliveredToday,
        cashInHand: cashAgg[0]?.total || 0,
        cashOrders: cashAgg[0]?.count || 0
      },
      serverTime: new Date().toISOString()
    });
  })
);

/* ------------------------------------------------------------------ */
/* Claim an unassigned order from the available queue                  */
/* ------------------------------------------------------------------ */
router.post(
  "/orders/:id/claim",
  asyncHandler(async (req, res) => {
    /*
     * findOneAndUpdate keeps the claim atomic: if two riders tap at the same
     * time, only the first update matches `rider: null`.
     */
    const order = await Order.findOneAndUpdate(
      {
        _id: req.params.id,
        rider: null,
        status: { $in: ["Order Received", "In Kitchen"] },
        $or: [{ "payment.status": "paid" }, { "payment.method": "cod" }]
      },
      {
        $set: {
          rider: req.user._id,
          "delivery.assignedAt": new Date(),
          "delivery.driverName": req.user.name,
          "delivery.driverPhone": req.user.riderProfile?.phone || ""
        }
      },
      { new: true }
    );

    if (!order) {
      throw badRequest(
        "This order is no longer available to claim",
        "ORDER_UNAVAILABLE"
      );
    }

    order.statusHistory.push({
      status: order.status,
      note: `Claimed by rider ${req.user.name}`,
      by: req.user.email
    });
    await order.save();

    res.json({ message: "Order claimed", order: toRiderOrder(order) });
  })
);

/* ------------------------------------------------------------------ */
/* Accept an assigned order                                            */
/* ------------------------------------------------------------------ */
router.post(
  "/orders/:id/accept",
  asyncHandler(async (req, res) => {
    const order = await findAssignedOrder(req);

    if (["Delivered", "Cancelled"].includes(order.status)) {
      throw badRequest("This order is already closed", "ORDER_CLOSED");
    }

    if (!order.delivery) order.delivery = {};

    if (!order.delivery.acceptedAt) {
      order.delivery.acceptedAt = new Date();
      order.statusHistory.push({
        status: order.status,
        note: `Accepted by rider ${req.user.name}`,
        by: req.user.email
      });
      await order.save();
    }

    res.json({ message: "Order accepted", order: toRiderOrder(order) });
  })
);

/* ------------------------------------------------------------------ */
/* Mark an order as picked up (moves it to Sent to Delivery)           */
/* ------------------------------------------------------------------ */
router.post(
  "/orders/:id/pickup",
  asyncHandler(async (req, res) => {
    const order = await findAssignedOrder(req);

    if (!["Order Received", "In Kitchen"].includes(order.status)) {
      throw badRequest(
        "This order cannot be picked up right now",
        "INVALID_TRANSITION"
      );
    }

    if (!order.delivery) order.delivery = {};

    const now = new Date();
    order.delivery.acceptedAt = order.delivery.acceptedAt || now;
    order.delivery.pickedUpAt = now;
    order.delivery.dispatchedAt = order.delivery.dispatchedAt || now;

    // Give the customer a default 30 minute ETA if the admin did not set one.
    if (!order.delivery.etaAt) {
      order.delivery.etaAt = new Date(now.getTime() + 30 * 60 * 1000);
    }

    order.status = "Sent to Delivery";
    order.statusHistory.push({
      status: "Sent to Delivery",
      note: `Picked up by rider ${req.user.name}`,
      by: req.user.email
    });
    await order.save();

    res.json({ message: "Order picked up", order: toRiderOrder(order) });
  })
);

/* ------------------------------------------------------------------ */
/* COD: rider marks the cash as collected                              */
/* ------------------------------------------------------------------ */
router.post(
  "/orders/:id/cash",
  asyncHandler(async (req, res) => {
    const order = await findAssignedOrder(req);

    if (order.payment.method !== "cod") {
      throw badRequest(
        "This order was paid online — no cash is due",
        "NOT_COD"
      );
    }

    if (order.status === "Cancelled") {
      throw badRequest("This order was cancelled", "ORDER_CLOSED");
    }

    if (!order.delivery) order.delivery = {};

    if (order.payment.status !== "paid") {
      order.payment.status = "paid";
      order.payment.provider = "cod";
      order.payment.paidAt = new Date();
      order.delivery.cashCollectedAt = new Date();
      order.statusHistory.push({
        status: order.status,
        note: `Cash collected by rider ${req.user.name}`,
        by: req.user.email
      });
      await order.save();
    }

    res.json({
      message: "Cash marked as collected",
      order: toRiderOrder(order)
    });
  })
);

/* ------------------------------------------------------------------ */
/* Delivered + 4-digit OTP verification                                */
/* ------------------------------------------------------------------ */
router.post(
  "/orders/:id/deliver",
  asyncHandler(async (req, res) => {
    const order = await findAssignedOrder(req);

    if (order.status === "Delivered") {
      return res.json({
        message: "This order is already delivered",
        order: toRiderOrder(order)
      });
    }

    if (order.status !== "Sent to Delivery") {
      throw badRequest(
        "Mark the order as picked up before delivering it",
        "NOT_PICKED_UP"
      );
    }

    if (!order.delivery) order.delivery = {};

    if (order.delivery.otpLocked) {
      throw badRequest(
        "OTP is locked after too many attempts. Ask the admin to reset it.",
        "OTP_LOCKED"
      );
    }

    const otp = String(req.body?.otp || "").trim();
    if (!/^\d{4}$/.test(otp)) {
      throw badRequest(
        "Enter the 4-digit OTP shown to the customer",
        "INVALID_OTP"
      );
    }

    // COD must be collected before the order can be closed.
    if (order.payment.method === "cod" && order.payment.status !== "paid") {
      throw badRequest(
        "Collect the cash before marking this order delivered",
        "CASH_NOT_COLLECTED"
      );
    }

    if (order.delivery.otp !== otp) {
      order.delivery.otpAttempts = (order.delivery.otpAttempts || 0) + 1;
      const remaining = Math.max(0, 5 - order.delivery.otpAttempts);

      if (remaining === 0) {
        order.delivery.otpLocked = true;
        await order.save();
        throw badRequest(
          "Too many incorrect OTP attempts. Ask the admin to reset the code.",
          "OTP_LOCKED"
        );
      }

      await order.save();
      throw badRequest(
        `Incorrect OTP. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`,
        "INVALID_OTP"
      );
    }

    order.status = "Delivered";
    order.delivery.deliveredAt = new Date();
    order.delivery.otpVerifiedAt = new Date();
    order.statusHistory.push({
      status: "Delivered",
      note: `Delivered by rider ${req.user.name}`,
      by: req.user.email
    });
    await order.save();

    res.json({ message: "Order delivered", order: toRiderOrder(order) });
  })
);

/* ------------------------------------------------------------------ */
/* Release an un-picked-up order back to the available queue           */
/* ------------------------------------------------------------------ */
router.post(
  "/orders/:id/release",
  asyncHandler(async (req, res) => {
    const order = await findAssignedOrder(req);

    if (["Delivered", "Cancelled"].includes(order.status)) {
      throw badRequest("This order is already closed", "ORDER_CLOSED");
    }

    if (order.status === "Sent to Delivery") {
      throw badRequest(
        "An order that is already picked up cannot be released",
        "CANNOT_RELEASE"
      );
    }

    order.rider = null;
    if (!order.delivery) order.delivery = {};
    order.delivery.assignedAt = undefined;
    order.delivery.acceptedAt = undefined;
    order.delivery.driverName = "";
    order.delivery.driverPhone = "";
    order.statusHistory.push({
      status: order.status,
      note: `Released back to the queue by rider ${req.user.name}`,
      by: req.user.email
    });
    await order.save();

    res.json({
      message: "Order released back to the available queue",
      order: toRiderOrder(order)
    });
  })
);

export default router;
