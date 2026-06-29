import express from "express";
import checkAuth, { requireRole } from "../middleWares/authMiddleware.js";
import { getAllUsers, hardDelete, logoutByAdmin, recoverUserByAdmin, softDelete, updateUserRole } from "../controllers/adminController.js";

const router = express.Router();

router.get("/users", checkAuth, requireRole("Manager"), getAllUsers);

router.post("/users/:userId/logout", checkAuth, requireRole("Manager"), logoutByAdmin);

router.patch("/users/:userId/soft", checkAuth, requireRole("Admin"), softDelete);

router.delete("/users/:userId/hard", checkAuth, requireRole("Admin"), hardDelete);

router.patch("/users/:userId/recover", checkAuth, requireRole("Admin"), recoverUserByAdmin);

router.patch("/users/:userId/role", checkAuth, requireRole("Admin"), updateUserRole);

export default router;
