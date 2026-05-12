import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import {
  addProductToCart,
  addToCart,
  clearCart,
  getMyCart,
  removeCartItem,
  updateCartItem,
} from "./cart.controller";

const router = Router();

router.get("/me", protect, getMyCart);
router.get("/", protect, getMyCart);
router.post("/add", protect, addProductToCart);
router.post("/products/:productId", protect, addProductToCart);
router.post("/me/items", protect, addToCart);
router.post("/", protect, addToCart);
router.patch("/me/items", protect, updateCartItem);
router.delete("/me/items/:productId", protect, removeCartItem);
router.delete("/me/items", protect, clearCart);

export default router;
