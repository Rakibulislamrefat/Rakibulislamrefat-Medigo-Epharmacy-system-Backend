import { Router } from "express";
import { protect, optionalProtect } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import {
  createConsultancy,
  getConsultancy,
  listConsultancies,
  listMyConsultancies,
  listDoctorReadyConsultancies,
  markConsultancyReady,
  sendConsultancyConfirmation,
  updateConsultancy,
} from "./consultancy.controller";

const router = Router();

router.post("/", optionalProtect, createConsultancy);
router.post("/:id/send-confirmation", optionalProtect, sendConsultancyConfirmation);
router.get("/me", protect, listMyConsultancies);
router.get("/ready", protect, authorize("doctor"), listDoctorReadyConsultancies);
router.get("/:id", protect, getConsultancy);

router.get("/", protect, authorize("admin"), listConsultancies);
router.patch("/:id/ready", protect, authorize("admin", "doctor"), markConsultancyReady);
router.patch("/:id", protect, authorize("admin", "doctor"), updateConsultancy);

export default router;

