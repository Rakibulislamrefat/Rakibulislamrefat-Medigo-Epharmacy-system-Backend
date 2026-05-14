import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import {
  initiateSSLCommerzPayment,
  handleSSLIPN,
  handlePaymentSuccess,
  handlePaymentFailed,
  handlePaymentCancel,
  validatePayment,
} from "./sslcommerz.controller";

const router = Router();

router.post("/initiate", protect, initiateSSLCommerzPayment);
router.post("/ipn", handleSSLIPN);
router.post("/success", handlePaymentSuccess);
router.post("/fail", handlePaymentFailed);
router.post("/cancel", handlePaymentCancel);
router.get("/validate/:transactionId", protect, validatePayment);

export default router;
