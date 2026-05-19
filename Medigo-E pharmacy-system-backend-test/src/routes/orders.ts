import { Router } from "express";
import { cancelOrder, createOrder, getOrder, listMyOrders, trackOrder } from "../modules/order/order.controller";

const router = Router();

router.post("/", createOrder);
router.get("/me", listMyOrders);
router.patch("/:idOrNumber/cancel", cancelOrder);
router.get("/:idOrNumber/tracking", trackOrder);
router.get("/:idOrNumber", getOrder);

export default router;
