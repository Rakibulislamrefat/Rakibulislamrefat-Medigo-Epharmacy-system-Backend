import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import { upload } from "../../middleware/upload.middleware";
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

router.post("/", protect, authorize("admin"), upload.doctorProfileImage, createDoctor);
router.patch("/:id", protect, authorize("admin"), upload.doctorProfileImage, updateDoctor);
router.delete("/:id", protect, authorize("admin"), deleteDoctor);

export default router;

