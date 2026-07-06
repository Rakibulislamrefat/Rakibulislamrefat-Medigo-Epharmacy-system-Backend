import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import { validate } from "../../middleware/validation.middleware";
import {
  getDashboardStats,
  getRequestedOrders,
  getPrescriptionOrder,
  verifyPrescription,
  rejectPrescription,
  getPrescribedOrders,
  getOrder,
  updateOrderStatus,
  generateInvoice,
  searchPrescriptions,
} from "./pharmacist.controller";
import {
  verifyPrescriptionSchema,
  rejectPrescriptionSchema,
  updateOrderStatusSchema,
} from "./pharmacist.validation";

const router = Router();

// All pharmacist routes require authentication and pharmacist/admin role
router.use(protect);
router.use(authorize("pharmacist", "admin"));

// Dashboard
router.get("/dashboard", getDashboardStats);

// Prescription verification endpoints
router.get("/requested-orders", getRequestedOrders);
router.get("/requested-orders/:id", getPrescriptionOrder);
router.put("/requested-orders/:id/verify", validate(verifyPrescriptionSchema), verifyPrescription);
router.put("/requested-orders/:id/reject", validate(rejectPrescriptionSchema), rejectPrescription);

// Order fulfillment endpoints
router.get("/prescribed-orders", getPrescribedOrders);
router.get("/prescribed-orders/:id", getOrder);
router.put("/prescribed-orders/:id/status", validate(updateOrderStatusSchema), updateOrderStatus);
router.post("/prescribed-orders/:id/invoice", generateInvoice);

// Search
router.get("/search/prescriptions", searchPrescriptions);

export default router;
