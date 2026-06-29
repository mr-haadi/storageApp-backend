import express from "express";
import validateIdMiddleware from "../middleWares/validateIdMiddleware.js";
import { sanitizeHeaders, sanitizeInputs } from "../middleWares/sanitizeMiddleware.js";
import {
  createDirectory,
  deleteDirectory,
  getDirectoryPath,
  readDirectory,
  renameDirectory,
} from "../controllers/directoryController.js";

const router = express.Router();

router.param("parentDirId", validateIdMiddleware);
router.param("id", validateIdMiddleware);

router.get("/path/:id", getDirectoryPath);
router.get("/{:id}", readDirectory);
router.post("/{:parentDirId}", sanitizeHeaders(["dirname"]), createDirectory);
router.patch("/:id", sanitizeInputs(["newDirName"]), renameDirectory);
router.delete("/:id", deleteDirectory);

export default router;
