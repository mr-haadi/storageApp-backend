import express from "express";
import { loginWithGoogle, sendOtp, verifyOtp } from "../controllers/authController.js";
import { rateLimiter, throttle } from "../middleWares/limiterMiddleware.js";

const router = express.Router()

router.post("/send-otp", rateLimiter(10 * 60 * 1000, 3), throttle({
    waitTime: 3000,
    delayAfter: 1,
    maxDelay: 15000,
}), sendOtp)

router.post("/verify-otp", rateLimiter(10 * 60 * 1000, 5), throttle({
    delayAfter: 2,
    maxDelay: 5000
}), verifyOtp)

router.post("/google", rateLimiter(10 * 60 * 1000, 5), throttle(), loginWithGoogle)


export default router;