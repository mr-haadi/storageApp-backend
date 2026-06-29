import express from "express";
import validateIdMiddleware from "../middleWares/validateIdMiddleware.js";
import { rateLimiter, throttle } from "../middleWares/limiterMiddleware.js";
import { sanitizeInputs } from "../middleWares/sanitizeMiddleware.js";
import {
  getFile,
  renameFile,
  deleteFile,
  uploadInitiate,
  uploadComplete,
  uploadCancel,
} from "../controllers/fileController.js";


const router = express.Router();

router.param("id", validateIdMiddleware);

router.get("/:id", getFile);
router.post("/:upload/initiate", rateLimiter(60 * 1000, 20), throttle({
  waitTime: 500,
  delayAfter: 5,
  maxDelay: 5000,
}), uploadInitiate)
router.post("/:upload/complete", rateLimiter(60 * 1000, 100), uploadComplete)
router.post("/:upload/cancel", rateLimiter(60 * 1000, 50), uploadCancel)
router.patch("/:id", renameFile);
router.delete("/:id", deleteFile);

export default router;
