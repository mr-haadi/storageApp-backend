import { model, Schema } from "mongoose";

export const SUBSCRIPTION_STATUSES = [
  "created",
  "authenticated",
  "active",
  "pending",
  "halted",
  "paused",
  "cancelled",
  "completed",
  "expired",
];

const subscriptionSchema = new Schema(
  {
    subscriptionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },

    planId: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: SUBSCRIPTION_STATUSES,
      default: "created",
    },

    paymentMethod: {
      type: String,
      default: null,
    },

    // Timestamps received from Razorpay (Unix epoch → Date)
    // currentStart / currentEnd bound the ALREADY-PAID billing window
    currentStart: { type: Date, default: null },
    currentEnd:   { type: Date, default: null },

    // Overall subscription lifetime
    startAt: { type: Date, default: null },
    endAt:   { type: Date, default: null },

    // Billing-cycle counters from Razorpay
    paidCount:      { type: Number, default: 0 },
    remainingCount: { type: Number, default: null },

    // Set when Razorpay halts the subscription after retries are exhausted
    haltedAt: { type: Date, default: null },

    // Set when subscription reaches its natural end
    endedAt: { type: Date, default: null },

    // Payment tracking
    lastPaymentId: { type: String, default: null },
    invoiceId:     { type: String, default: null },
    lastChargedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

const Subscription = model("Subscription", subscriptionSchema);

export default Subscription;
