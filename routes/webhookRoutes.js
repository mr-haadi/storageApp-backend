import express from "express";
import { razorpayWebhook } from "../controllers/webhookController.js";

const router = express.Router();
 

router.post(
  "/razorpay",
  express.raw({ type: "application/json", limit: "1mb" }),
  (req, _res, next) => {
    if (!Buffer.isBuffer(req.body)) {
      // Fallback: body was somehow already parsed — reject to avoid HMAC mismatch
      return next(Object.assign(new Error("Unexpected body type"), { status: 400 }));
    }
    req.rawBody = req.body;
    try {
      req.body = JSON.parse(req.body.toString("utf8"));
    } catch {
      return next(Object.assign(new Error("Invalid JSON in webhook payload"), { status: 400 }));
    }
    next();
  },
  razorpayWebhook
);

export default router;
