import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import {
  createDoctor,
  deleteDoctor,
  getDoctor,
  listDoctors,
  updateDoctor,
} from "./doctor.controller";

const router = Router();

router.get("/", listDoctors);
router.get("/:id", getDoctor);

router.post("/", protect, authorize("admin"), createDoctor);
router.patch("/:id", protect, authorize("admin"), updateDoctor);
router.delete("/:id", protect, authorize("admin"), deleteDoctor);

export default router;

