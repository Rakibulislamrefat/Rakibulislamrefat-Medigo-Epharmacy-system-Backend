import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import {
  cancelOrder,
  listMyOrders,
  listOrders,
  trackOrder,
  updateOrder,
  getOrder,
  createOrder,
} from "./order.controller";

const router = Router();

router.use(protect);

router.post("/", createOrder);
router.get("/my", authorize("user"), listMyOrders);
router.get("/", authorize("admin", "pharmacist"), listOrders);
router.get("/:idOrNumber", getOrder);
router.patch("/:idOrNumber/cancel", cancelOrder);
router.get("/:idOrNumber/tracking", trackOrder);
router.patch("/:id", authorize("admin", "pharmacist"), updateOrder);

export default router;
