import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import {
  createOrder,
  getOrder,
  listMyOrders,
  listOrders,
  updateOrder,
} from "./order.controller";

const router = Router();

router.post("/", protect, createOrder);
router.get("/me", protect, listMyOrders);
router.get("/:idOrNumber", protect, getOrder);

router.get("/", protect, authorize("admin", "pharmacist"), listOrders);
router.patch("/:id", protect, authorize("admin", "pharmacist"), updateOrder);

export default router;

