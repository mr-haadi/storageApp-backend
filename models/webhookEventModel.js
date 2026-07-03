import { model, Schema } from "mongoose";

const webhookEventSchema = new Schema(
  {
    event: {
      type: String,
      required: true,
      index: true,
    },

    webhookKey: {
      type: String,
      required: true,
      unique: true,
    },

    subscriptionId: {
      type: String,
      index: true,
    },

    razorpayCreatedAt: {
      type: Date,
      default: null,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ["received", "processed", "failed", "skipped"],
      default: "received",
    },
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
