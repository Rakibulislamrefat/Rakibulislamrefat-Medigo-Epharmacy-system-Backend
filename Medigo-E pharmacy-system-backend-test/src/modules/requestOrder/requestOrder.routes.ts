import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import { upload } from "../../middleware/upload.middleware";
import {
  createRequestOrder,
  deleteRequestOrder,
  getRequestOrder,
  listRequestOrders,
  updateRequestOrder,
} from "./requestOrder.controller";

const router = Router();

router.post("/", upload.prescriptionFile, createRequestOrder);

router.get("/", protect, authorize("admin", "pharmacist"), listRequestOrders);
router.get("/:id", protect, authorize("admin", "pharmacist"), getRequestOrder);
router.patch("/:id", protect, authorize("admin", "pharmacist"), upload.prescriptionFile, updateRequestOrder);
router.delete("/:id", protect, authorize("admin"), deleteRequestOrder);

export default router;
