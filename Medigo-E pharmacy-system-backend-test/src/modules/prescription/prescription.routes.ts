import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import {
  adminUpdatePrescription,
  getPrescription,
  listMyPrescriptions,
  listPrescriptions,
  submitPrescription,
} from "./prescription.controller";

const router = Router();

router.post("/", protect, submitPrescription);
router.get("/me", protect, listMyPrescriptions);
router.get("/:id", protect, getPrescription);

router.get("/", protect, authorize("admin", "pharmacist"), listPrescriptions);
router.patch("/:id", protect, authorize("admin", "pharmacist"), adminUpdatePrescription);

export default router;

