import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import userRoutes from "../modules/user/user.routes";
import productRoutes from "../modules/product/product.routes";
import orderRoutes from "../modules/order/order.routes";
import doctorRoutes from "../modules/doctor/doctor.routes";
import consultancyRoutes from "../modules/consultancy/consultancy.routes";
import prescriptionRoutes from "../modules/prescription/prescription.routes";
import paymentTransactionRoutes from "../modules/paymentTransaction/paymentTransaction.routes";
import cartRoutes from "../modules/cart/cart.routes";
import reviewRoutes from "../modules/review/review.routes";
import couponRoutes from "../modules/coupon/coupon.routes";
import branchRoutes from "../modules/branch/branch.routes";
import notificationRoutes from "../modules/notification/notification.routes";
import sslcommerzRoutes from "../modules/sslcommerz/sslcommerz.routes";
import adminRoutes from "../modules/admin/admin.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/users", userRoutes);
router.use("/products", productRoutes);
router.use("/orders", orderRoutes);
router.use("/doctors", doctorRoutes);
router.use("/consultancies", consultancyRoutes);
router.use("/prescriptions", prescriptionRoutes);
router.use("/payment-transactions", paymentTransactionRoutes);
router.use("/sslcommerz", sslcommerzRoutes);
router.use("/carts", cartRoutes);
router.use("/reviews", reviewRoutes);
router.use("/coupons", couponRoutes);
router.use("/branches", branchRoutes);
router.use("/notifications", notificationRoutes);

export default router;
