import { Router } from "express";
import {
  getAdminMetrics,
  getAdminUsers,
  getAdminMedicines,
  getAdminOrders,
  getAdminDoctors,
  getAdminConsultancies,
  updateAdminUser,
} from "./admin.controller";
import {
  createProduct,
  updateProduct,
  deleteProduct,
} from "../product/product.controller";
import { protect, authorize } from "../../middleware";

const router = Router();

// Protected routes - admin only
router.use(protect, authorize("admin"));

// Metrics
router.get("/metrics", getAdminMetrics);

// Users
router.get("/users", getAdminUsers);
router.patch("/users/:id", updateAdminUser);

// Medicines
router.get("/medicines", getAdminMedicines);
router.post("/medicines", createProduct);
router.patch("/medicines/:id", updateProduct);
router.delete("/medicines/:id", deleteProduct);

// Orders
router.get("/orders", getAdminOrders);

// Doctors
router.get("/doctors", getAdminDoctors);

// Consultancies
router.get("/consultancies", getAdminConsultancies);

export default router;
