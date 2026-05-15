import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import {
  listOrders,
  trackOrder,
  updateOrder,
} from "./order.controller";

const router = Router();

router.get("/", protect, authorize("admin", "pharmacist"), listOrders);
router.get("/:idOrNumber/tracking", protect, trackOrder);
router.patch("/:id", protect, authorize("admin", "pharmacist"), updateOrder);

export default router;
