import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import {
  listOrders,
  updateOrder,
} from "./order.controller";

const router = Router();

router.get("/", protect, authorize("admin", "pharmacist"), listOrders);
router.patch("/:id", protect, authorize("admin", "pharmacist"), updateOrder);

export default router;

