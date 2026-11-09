import crypto from "node:crypto";
import express from "express";
import { env } from "../config/env.js";
import { Order } from "../models/Order.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError, badRequest, notFound } from "../utils/ApiError.js";
import { createOrderNumber } from "../utils/tokens.js";
import { validateAddress } from "../utils/validation.js";
import { buildOrderDraft } from "../services/orderBuilder.js";
import {
  applyStockForOrder,
  restoreStockForOrder,
  rollbackStock
} from "../services/inventory.js";
import { sendOrderConfirmationEmail } from "../services/mailer.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

let razorpayClient = null;

async function getRazorpayClient() {
  if (!env.razorpay.enabled) return null;
  if (!razorpayClient) {
    const { default: Razorpay } = await import("razorpay");
    razorpayClient = new Razorpay({
      key_id: env.razorpay.keyId,
      key_secret: env.razorpay.keySecret
    });
  }
  return razorpayClient;
}

async function createOrderDocument(data) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await Order.create({ ...data, orderNumber: createOrderNumber() });
    } catch (error) {
      const duplicateNumber =
        error.code === 11000 && error.keyPattern && error.keyPattern.orderNumber;
      if (!duplicateNumber) throw error;
    }
  }
  throw new ApiError(500, "Could not create an order number. Try again.", "ORDER_NUMBER_FAILED");
}

function signaturesMatch(expected, received) {
  const a = Buffer.from(String(expected || ""));
  const b = Buffer.from(String(received || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/*
 * 4-digit delivery OTP (added with the rider system).
 * The customer sees this code on "My orders" and in the confirmation email.
 * Riders must type it in before an order can be marked delivered, and rider
 * API responses strip it out so a rider can never read it from the network.
 */
function generateOtp() {
  return String(crypto.randomInt(0, 10000)).padStart(4, "0");
}

/**
 * Mark an order paid, decrement stock and move it to "Order Received".
 * Stock is rolled back if saving the order fails.
 */
async function finalisePayment(order, paymentFields, provider, customer) {
  if (order.payment.status === "paid") return order;
  if (order.status !== "Pending Payment") {
    throw badRequest(
      "This order is no longer waiting for payment",
      "ORDER_NOT_PAYABLE"
    );
  }

  let applied = [];

  try {
    applied = await applyStockForOrder(order.items);

    order.payment.provider = provider;
    order.payment.status = "paid";
    Object.assign(order.payment, paymentFields);
    order.payment.paidAt = new Date();
    order.stockApplied = true;
    order.status = "Order Received";
    order.statusHistory.push({
      status: "Order Received",
      note: "Payment confirmed — order sent to the kitchen",
      by: "system"
    });

    await order.save();
  } catch (error) {
    if (applied.length) await rollbackStock(applied);
    throw error;
  }

  sendOrderConfirmationEmail(
    { name: customer?.name || order.address.fullName, email: customer?.email },
    order
  ).catch((error) => {
    console.warn("[mail] Order confirmation failed:", error.message);
  });

  return order;
}

/* ------------------------------------------------------------------ */
/* Create an order (pending payment)                                   */
/* ------------------------------------------------------------------ */
router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const address = validateAddress(req.body?.address);
    const draft = await buildOrderDraft(req.body?.items);

    /*
     * Payment method + delivery OTP (added with the rider system).
     * COD orders skip the online payment step and reserve stock immediately.
     * Online orders keep the existing Pending Payment → paid flow.
     */
    const paymentMethod = req.body?.paymentMethod === "cod" ? "cod" : "online";
    const deliveryOtp = generateOtp();

    if (paymentMethod === "cod") {
      let applied = [];

      try {
        // There is no payment event to decrement stock for COD, so do it now.
        applied = await applyStockForOrder(draft.items);

        const codOrder = await createOrderDocument({
          user: req.user._id,
          address,
          ...draft,
          currency: env.currency,
          status: "Order Received",
          payment: { method: "cod", provider: "cod", status: "pending" },
          delivery: { otp: deliveryOtp },
          stockApplied: true,
          statusHistory: [
            {
              status: "Order Received",
              note: "Cash on delivery — order sent to the kitchen",
              by: "customer"
            }
          ]
        });

        // The confirmation email includes the OTP to share with the rider.
        sendOrderConfirmationEmail(
          { name: req.user.name, email: req.user.email },
          codOrder
        ).catch((error) => {
          console.warn("[mail] COD order confirmation failed:", error.message);
        });

        return res.status(201).json({
          message: "Order placed. Pay the rider in cash when it arrives.",
          order: codOrder.toJSON(),
          cod: true,
          demo: false
        });
      } catch (error) {
        // Undo a partial stock decrement if the order could not be saved.
        if (applied.length) await rollbackStock(applied);
        throw error;
      }
    }

    const order = await createOrderDocument({
      user: req.user._id,
      address,
      ...draft,
      currency: env.currency,
      status: "Pending Payment",
      payment: { method: "online" },
      // Generated up-front so the customer can see it immediately.
      delivery: { otp: deliveryOtp },
      statusHistory: [
        {
          status: "Pending Payment",
          note: "Order created, waiting for payment",
          by: "customer"
        }
      ]
    });

    let razorpay = null;

    if (env.razorpay.enabled) {
      try {
        const client = await getRazorpayClient();
        const rzpOrder = await client.orders.create({
          amount: Math.round(order.total * 100),
          currency: env.currency,
          receipt: order.orderNumber,
          notes: { orderId: order._id.toString() }
        });

        order.payment.provider = "razorpay";
        order.payment.razorpayOrderId = rzpOrder.id;
        await order.save();

        razorpay = {
          keyId: env.razorpay.keyId,
          orderId: rzpOrder.id,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency
        };
      } catch (error) {
        await Order.deleteOne({ _id: order._id });
        console.error("[razorpay] Could not create payment order:", error.message);
        throw new ApiError(
          502,
          "The payment gateway is unavailable right now. Please try again.",
          "PAYMENT_GATEWAY_ERROR"
        );
      }
    } else {
      order.payment.provider = "demo";
      await order.save();
    }

    res.status(201).json({
      message: env.razorpay.enabled
        ? "Order created. Complete the payment to confirm it."
        : "Order created. Complete the demo checkout to confirm it.",
      order: order.toJSON(),
      razorpay,
      demo: !env.razorpay.enabled
    });
  })
);

/* ------------------------------------------------------------------ */
/* Demo checkout (used when Razorpay keys are not configured)          */
/* ------------------------------------------------------------------ */
router.post(
  "/:id/payment/demo",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (env.razorpay.enabled) {
      throw badRequest(
        "Demo checkout is disabled because Razorpay is configured",
        "DEMO_DISABLED"
      );
    }

    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!order) throw notFound("Order not found");

    await finalisePayment(order, {}, "demo", req.user);

    res.json({ message: "Payment successful — order confirmed", order });
  })
);

/* ------------------------------------------------------------------ */
/* Razorpay signature verification                                     */
/* ------------------------------------------------------------------ */
router.post(
  "/:id/payment/verify",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!env.razorpay.enabled) {
      throw badRequest("Razorpay is not configured", "RAZORPAY_DISABLED");
    }

    const {
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature
    } = req.body || {};

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw badRequest("Incomplete payment response", "PAYMENT_MISSING_FIELDS");
    }

    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!order) throw notFound("Order not found");

    if (
      !order.payment.razorpayOrderId ||
      order.payment.razorpayOrderId !== razorpayOrderId
    ) {
      throw badRequest(
        "This payment does not belong to this order",
        "PAYMENT_MISMATCH"
      );
    }

    const expected = crypto
      .createHmac("sha256", env.razorpay.keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (!signaturesMatch(expected, razorpaySignature)) {
      throw badRequest(
        "Payment signature could not be verified",
        "INVALID_SIGNATURE"
      );
    }

    await finalisePayment(
      order,
      {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      },
      "razorpay",
      req.user
    );

    res.json({ message: "Payment verified — order confirmed", order });
  })
);

/* ------------------------------------------------------------------ */
/* List + read (used by the polling dashboard)                         */
/* ------------------------------------------------------------------ */
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({ orders, serverTime: new Date().toISOString() });
  })
);

router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id
    }).lean();

    if (!order) throw notFound("Order not found");
    res.json({ order });
  })
);

/* ------------------------------------------------------------------ */
/* Customer cancellation (before it leaves the kitchen)                */
/* ------------------------------------------------------------------ */
router.post(
  "/:id/cancel",
  requireAuth,
  asyncHandler(async (req, res) => {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!order) throw notFound("Order not found");

    if (!["Pending Payment", "Order Received"].includes(order.status)) {
      throw badRequest(
        "This order can no longer be cancelled online. Please call the store.",
        "CANNOT_CANCEL"
      );
    }

    if (order.stockApplied) {
      await restoreStockForOrder(order.items);
      order.stockApplied = false;
    }

    order.status = "Cancelled";
    order.statusHistory.push({
      status: "Cancelled",
      note: "Cancelled by the customer",
      by: "customer"
    });
    await order.save();

    res.json({ message: "Order cancelled", order });
  })
);

export default router;
