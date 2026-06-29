import crypto from "crypto";
import razorpay from "razorpay";
import Subscription from "../models/subscriptionModel.js";
import { isPremiumActive } from "../utils/isPremiumActive.js";
import { createSubscriptionSchema } from "../validators/subscriptionSchema.js";

const rzp = new razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createSubscription = async (req, res, next) => {
  try {
    // 1. Validate — reject unknown / tampered plan IDs immediately
    const result = createSubscriptionSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0].message });
    }
    const { planId } = result.data;

    // 1. Active subscription?
    const activeSub = await Subscription.findOne({
      userId: req.user._id,
      status: { $in: ["active", "pending", "paused"] },
    }).lean();

    if (activeSub && isPremiumActive(activeSub)) {
      return res.status(409).json({
        error: "You already have an active subscription.",
      });
    }

    // 2. Checkout already started?
    const createdSub = await Subscription.findOne({
      userId: req.user._id,
      status: "created",
    }).lean();

    if (createdSub) {
      let rzpSubscription;
      try {
        rzpSubscription = await rzp.subscriptions.fetch(
          createdSub.subscriptionId
        );
      } catch {
        // Couldn't fetch from Razorpay.
        // Remove the stale local record and create a fresh subscription below.
        await Subscription.deleteOne({
          _id: createdSub._id,
        });
        rzpSubscription = null;
      }

      if (rzpSubscription?.status === "created") {
        return res.status(200).json({
          subscriptionId: createdSub.subscriptionId,
        });
      }
      if (rzpSubscription) {
        await Subscription.deleteOne({
          _id: createdSub._id,
        });
      }
    }

    // 3. Create in Razorpay
    const rzpSub = await rzp.subscriptions.create({
      plan_id: planId,
      total_count: 12,
      quantity: 1,
      customer_notify: 1,
      notes: { userId: req.user._id.toString() },
    });

    // 4. Persist locally
    await Subscription.create({
      subscriptionId: rzpSub.id,
      planId,
      userId: req.user._id,
      status: rzpSub.status,
    });

    return res.status(201).json({ subscriptionId: rzpSub.id });
  } catch (err) {
    next(err);
  }
};

export const getActiveSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findOne({
      userId: req.user._id,
      status: {
        $in: ["created", "authenticated", "active", "pending", "paused", "cancelled"],
      },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!subscription) {
      return res.json({ subscription: null, isPremiumActive: false });
    }

    return res.json({
      subscription,
      isPremiumActive: isPremiumActive(subscription),
    });
  } catch (err) {
    next(err);
  }
};

export const verifySubscription = async (req, res, next) => {
  try {
    const {
      razorpay_subscription_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!razorpay_subscription_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing verification fields." });
    }

    // Ownership check — ensure the subscription belongs to the authenticated user
    const sub = await Subscription.findOne({
      subscriptionId: razorpay_subscription_id,
      userId: req.user._id,
    }).lean();

    if (!sub) {
      return res.status(404).json({ error: "Subscription not found." });
    }

    // Razorpay signature verification
    // HMAC-SHA256 of "<payment_id>|<subscription_id>" using the key secret
    const body = `${razorpay_payment_id}|${razorpay_subscription_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid payment signature." });
    }

    // Signature valid — return verified: true.
    // Do NOT activate premium here; webhook handles that.
    return res.json({ verified: true });
  } catch (err) {
    next(err);
  }
};

export const cancelSubscription = async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;

    if (!subscriptionId?.startsWith("sub_")) {
      return res.status(400).json({ error: "Invalid subscription ID." });
    }

    const sub = await Subscription.findOne({
      subscriptionId,
      userId: req.user._id,
    }).lean();

    if (!sub) {
      return res.status(404).json({ error: "Subscription not found." });
    }

    if (!["active", "authenticated", "created", "pending"].includes(sub.status)) {
      return res.status(409).json({
        error: `Cannot cancel a subscription with status "${sub.status}".`,
      });
    }


    if (sub.status === "created") {
      await rzp.subscriptions.cancel(subscriptionId, true);

      return res.json({
        message: "Subscription cancelled.",
      });
    }

    // cancel_at_cycle_end=false means Razorpay cancels at end of current billing cycle,
    // without downgrading).
    await rzp.subscriptions.cancel(subscriptionId, false);

    return res.json({
      message:
        "Subscription cancelled. You will retain premium access until the end of your current billing cycle.",
    });
  } catch (err) {
    next(err);
  }
};

export const getUpdatePaymentLink = async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;

    if (!subscriptionId?.startsWith("sub_")) {
      return res.status(400).json({ error: "Invalid subscription ID." });
    }

    const sub = await Subscription.findOne({
      subscriptionId,
      userId: req.user._id,
    }).lean();

    if (!sub) {
      return res.status(404).json({ error: "Subscription not found." });
    }

    if (!["active", "authenticated", "pending", "cancelled", "paused"].includes(sub.status)) {
      return res.status(409).json({
        error: "Payment method can only be updated on an active or pending subscription.",
      });
    }

    const rzpSub = await rzp.subscriptions.fetch(subscriptionId);

    return res.json({ updateUrl: rzpSub.short_url });
  } catch (err) {
    next(err);
  }
};

export const getPaymentHistory = async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;

    if (!subscriptionId?.startsWith("sub_")) {
      return res.status(400).json({ error: "Invalid subscription ID." });
    }

    // Ownership check
    const sub = await Subscription.findOne({
      subscriptionId,
      userId: req.user._id,
    }).lean();

    if (!sub) {
      return res.status(404).json({ error: "Subscription not found." });
    }

    // Razorpay invoices.all returns items in descending order by default.
    const rzpInvoices = await rzp.invoices.all({ subscription_id: subscriptionId });

    const payments = (rzpInvoices.items ?? []).map((inv) => ({
      invoiceId: inv.id,
      amount: inv.amount / 100,     // paise → rupees
      paymentMethod: sub.paymentMethod,
      status: inv.status,
      createdAt: new Date(inv.created_at * 1000).toISOString(),
      invoiceUrl: inv.short_url ?? null,
    }));

    return res.json({ payments });
  } catch (err) {
    next(err);
  }
};
