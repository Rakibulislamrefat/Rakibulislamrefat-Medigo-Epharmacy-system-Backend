import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import { upload } from "../../middleware/upload.middleware";
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct,
  getMedicinesByCategory,
} from "./product.controller";

const router = Router();

router.get("/", listProducts);
router.get("/by-category", getMedicinesByCategory);
router.get("/:idOrSlug", getProduct);

router.post("/", protect, authorize("admin", "pharmacist"), upload.productImage, createProduct);
router.patch("/:id", protect, authorize("admin", "pharmacist"), upload.productImage, updateProduct);
router.delete("/:id", protect, authorize("admin", "pharmacist"), deleteProduct);

export default router;

