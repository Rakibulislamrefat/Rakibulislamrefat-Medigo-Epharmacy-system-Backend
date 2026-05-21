import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import {
  createRequestOrder,
  deleteRequestOrder,
  getRequestOrder,
  listRequestOrders,
  listUserRequestOrders,
  updateRequestOrder,
  updateRequestOrderPayment,
  sendRequestOrderInvoice,
} from "./requestOrder.controller";

const router = Router();

router.post("/", createRequestOrder);

router.get("/user/all", protect, authorize("user"), listUserRequestOrders);

router.get("/", protect, authorize("admin", "pharmacist"), listRequestOrders);
router.get("/:id", protect, authorize("admin", "pharmacist"), getRequestOrder);
router.patch("/:id", protect, authorize("admin", "pharmacist"), updateRequestOrder);

// Payment endpoints
router.post("/:id/payment", updateRequestOrderPayment);
router.post("/:id/invoice", sendRequestOrderInvoice);

router.delete("/:id", protect, authorize("admin"), deleteRequestOrder);

export default router;
