import mongoose from "mongoose";

export const ORDER_STATUSES = [
  "Pending Payment",
  "Order Received",
  "In Kitchen",
  "Sent to Delivery",
  "Delivered",
  "Cancelled"
];

export const ACTIVE_STATUSES = [
  "Pending Payment",
  "Order Received",
  "In Kitchen",
  "Sent to Delivery"
];

const ingredientSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ["base", "sauce", "cheese", "vegetable"],
      required: true
    },
    code: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true }
  },
  { _id: false }
);

const orderItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["menu", "custom"],
      default: "custom"
    },
    menuSlug: String,
    name: { type: String, required: true },
    size: {
      type: String,
      enum: ["small", "medium", "large"],
      required: true
    },
    ingredients: { type: [ingredientSchema], default: [] },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1, max: 20 },
    lineTotal: { type: Number, required: true }
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, default: "", trim: true },
    city: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true }
  },
  { _id: false }
);

/**
 * Live delivery tracking, added for the Mirpur Khas delivery flow.
 * Driver details and timestamps are filled in by the admin console; the
 * customer dashboard polls the order and renders the countdown.
 */
const deliverySchema = new mongoose.Schema(
  {
    driverName: { type: String, default: "", trim: true },
    driverPhone: { type: String, default: "", trim: true },
    etaAt: Date,
    dispatchedAt: Date,
    deliveredAt: Date,
    note: { type: String, default: "", trim: true },

    /* ---- Rider system additions (all optional, no migration needed) ---- */
    // When the admin/rider claimed the order and when the rider accepted it.
    assignedAt: Date,
    acceptedAt: Date,
    pickedUpAt: Date,

    // 4-digit delivery OTP. Shown to the customer, never returned to riders.
    otp: { type: String, default: "" },
    otpAttempts: { type: Number, default: 0 },
    otpLocked: { type: Boolean, default: false },
    otpVerifiedAt: Date,

    // COD cash lifecycle: rider collects, then the admin settles the handover.
    cashCollectedAt: Date,
    cashSettledAt: Date
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: "An order needs at least one pizza"
      }
    },
    address: { type: addressSchema, required: true },
    // Rider assigned by the admin or claimed from the available queue.
    // `null` means the order is still unassigned.
    rider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    // Live tracking fields. Older orders simply have an empty delivery object,
    // so no migration is needed.
    delivery: { type: deliverySchema, default: () => ({}) },
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, required: true, default: 0 },
    tax: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "Pending Payment",
      index: true
    },
    payment: {
      // "online" uses Razorpay/demo; "cod" is paid to the rider on delivery.
      method: {
        type: String,
        enum: ["online", "cod"],
        default: "online"
      },
      provider: {
        // "cod" is used once the rider has collected the cash.
        type: String,
        enum: ["razorpay", "demo", "cod"],
        default: "demo"
      },
      status: {
        type: String,
        enum: ["pending", "paid", "failed"],
        default: "pending"
      },
      razorpayOrderId: String,
      razorpayPaymentId: String,
      razorpaySignature: String,
      paidAt: Date
    },
    stockApplied: {
      type: Boolean,
      default: false
    },
    statusHistory: [
      {
        status: { type: String, enum: ORDER_STATUSES },
        at: { type: Date, default: Date.now },
        note: { type: String, default: "" },
        by: { type: String, default: "system" }
      }
    ]
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });

export const Order = mongoose.model("Order", orderSchema);
