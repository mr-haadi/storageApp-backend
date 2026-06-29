import { model, Schema } from "mongoose";

/**
 * Persists every Razorpay webhook event we receive.
 *
 * Idempotency key: webhookKey = "<event>:<subscriptionId>:<razorpay_created_at>"
 * The unique index ensures duplicate deliveries are safely rejected at the DB layer.
 *
 * Retention: 90-day TTL via the expireAt field + index.
 */
const webhookEventSchema = new Schema(
  {
    // e.g. "subscription.activated"
    event: {
      type: String,
      required: true,
      index: true,
    },

    // Composite idempotency key — duplicate delivery → duplicate-key error → safe skip
    webhookKey: {
      type: String,
      required: true,
      unique: true,
    },

    // Razorpay subscription ID extracted from the payload
    subscriptionId: {
      type: String,
      index: true,
    },

    // Unix timestamp from Razorpay's event payload (req.body.created_at)
    razorpayCreatedAt: {
      type: Date,
      default: null,
    },

    // Full raw payload for audit / manual replay
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },

    // Processing lifecycle
    status: {
      type: String,
      enum: ["received", "processed", "failed", "skipped"],
      default: "received",
    },

    // Populated when status = "failed"
    error: {
      type: String,
      default: null,
    },

    // TTL: document is auto-deleted 90 days after creation
    expireAt: {
      type: Date,
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
  }
);

// TTL index
webhookEventSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

const WebhookEvent = model("WebhookEvent", webhookEventSchema);

export default WebhookEvent;
