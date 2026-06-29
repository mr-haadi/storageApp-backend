import Subscription from "../models/subscriptionModel.js";
import User         from "../models/userModel.js";
import { downgradeStorage } from "../services/storageService.js";
import { FREE_PLAN }     from "../config/plans.js";

const EXPIRY_STATUSES = ["authenticated", "pending", "paused", "cancelled", "created"];

export async function runSubscriptionExpiryJob() {
  const now = new Date();
  console.log(`[cron] subscription expiry job started at ${now.toLocaleString()}`);

  const expired = await Subscription.find({
    status:     { $in: EXPIRY_STATUSES },
    currentEnd: { $lt: now },
  }).lean();

  if (expired.length === 0) {
    console.log("[cron] no subscriptions to expire");
    return;
  }

  console.log(`[cron] found ${expired.length} subscription(s) to expire`);

  for (const sub of expired) {
    try {
      const user = await User.findById(sub.userId)
        .select("maxStorageInBytes")
        .lean();

      if (!user) {
        console.warn(`[cron] user ${sub.userId} not found — skipping`);
        continue;
      }

      // Mark expired FIRST to prevent duplicate processing by concurrent runs.
      await Subscription.findByIdAndUpdate(sub._id, { status: "expired" });

      if (user.maxStorageInBytes > FREE_PLAN.storage) {
        await downgradeStorage(sub.userId);
        console.log(
          `[cron] downgraded user ${sub.userId} ` +
          `(sub ${sub.subscriptionId}, was "${sub.status}", currentEnd ${sub.currentEnd})`
        );
      } else {
        console.log(
          `[cron] user ${sub.userId} already on free tier — expired only ` +
          `(sub ${sub.subscriptionId})`
        );
      }
    } catch (err) {
      console.error(`[cron] failed for sub ${sub.subscriptionId}:`, err);
    }
  }

  console.log("[cron] subscription expiry job complete");
}
