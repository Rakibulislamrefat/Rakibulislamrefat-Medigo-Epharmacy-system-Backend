import { Router } from "express";
import {
  getAdminMetrics,
  getAdminUsers,
  getAdminMedicines,
  getAdminOrders,
  getAdminDoctors,
  getAdminConsultancies,
  updateAdminUser,
  updateAdminOrder,
  updateAdminOrderStatus,
} from "./admin.controller";
import {
  createProduct,
  updateProduct,
  deleteProduct,
} from "../product/product.controller";
import { protect, authorize } from "../../middleware";

const router = Router();

// Protected routes - requires authentication
router.use(protect);

// Metrics - Admin only
router.get("/metrics", authorize("admin"), getAdminMetrics);

// Users - Admin only
router.get("/users", authorize("admin"), getAdminUsers);
router.patch("/users/:id", authorize("admin"), updateAdminUser);

// Medicines - Admin and Pharmacist
router.get("/medicines", authorize("admin", "pharmacist"), getAdminMedicines);
router.post("/medicines", authorize("admin", "pharmacist"), createProduct);
router.patch("/medicines/:id", authorize("admin", "pharmacist"), updateProduct);
router.delete("/medicines/:id", authorize("admin", "pharmacist"), deleteProduct);

// Orders - Admin and Pharmacist
router.get("/orders", authorize("admin", "pharmacist"), getAdminOrders);
router.patch("/orders/:id", authorize("admin", "pharmacist"), updateAdminOrder);
router.patch("/orders/:id/status", authorize("admin", "pharmacist"), updateAdminOrderStatus);

// Doctors - Admin only
router.get("/doctors", authorize("admin"), getAdminDoctors);

// Consultancies - Admin only (could also be Doctor/Pharmacist)
router.get("/consultancies", authorize("admin"), getAdminConsultancies);

export default router;
