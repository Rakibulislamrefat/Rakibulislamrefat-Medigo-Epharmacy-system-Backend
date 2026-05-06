import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import {
  createConsultancy,
  getConsultancy,
  listConsultancies,
  listMyConsultancies,
  updateConsultancy,
} from "./consultancy.controller";

const router = Router();

router.post("/", protect, createConsultancy);
router.get("/me", protect, listMyConsultancies);
router.get("/:id", protect, getConsultancy);

router.get("/", protect, authorize("admin"), listConsultancies);
router.patch("/:id", protect, authorize("admin", "doctor"), updateConsultancy);

export default router;

