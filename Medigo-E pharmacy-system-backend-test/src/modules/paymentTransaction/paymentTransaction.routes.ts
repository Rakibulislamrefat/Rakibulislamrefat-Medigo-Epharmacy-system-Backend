import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import {
  createPaymentTransaction,
  getPaymentTransaction,
  listMyPaymentTransactions,
  listPaymentTransactions,
  updatePaymentTransaction,
} from "./paymentTransaction.controller";

const router = Router();

router.post("/", protect, createPaymentTransaction);
router.get("/me", protect, listMyPaymentTransactions);
router.get("/:id", protect, getPaymentTransaction);

router.get("/", protect, authorize("admin", "pharmacist"), listPaymentTransactions);
router.patch("/:id", protect, authorize("admin", "pharmacist"), updatePaymentTransaction);

export default router;

