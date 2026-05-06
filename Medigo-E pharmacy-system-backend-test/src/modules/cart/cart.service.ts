import mongoose from "mongoose";
import Cart from "./Cart.schema";
import Product from "../product/Product.schema";
import { ApiError } from "../../shared/utils";

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export class CartService {
  static async getOrCreate(userId: string) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user id");
    const existing = await Cart.findOne({ user: userId }).populate("items.product");
    if (existing) return existing;
    const created = await Cart.create({ user: userId, items: [] });
    return Cart.findById(created._id).populate("items.product");
  }

  static async addItem(userId: string, payload: any) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user id");
    const productId = payload?.product || payload?.medicine;
    const qty = Number(payload?.qty || 1);
    if (!productId) throw new ApiError(400, "product is required");
    if (!isValidId(String(productId))) throw new ApiError(400, "Invalid product id");
    if (!Number.isFinite(qty) || qty < 1) throw new ApiError(400, "qty must be >= 1");

    const product: any = await Product.findById(productId).select("status stockQty name");
    if (!product || product.status !== "active") throw new ApiError(404, "Product not found");
    if (Number(product.stockQty) < qty) throw new ApiError(400, `Insufficient stock for ${product.name}`);

    const cart: any = await Cart.findOne({ user: userId });
    const next = cart || (await Cart.create({ user: userId, items: [] }));
    const idx = next.items.findIndex((i: any) => String(i.product) === String(productId));
    if (idx >= 0) next.items[idx].qty += qty;
    else next.items.push({ product: productId, qty });
    await next.save();
    return Cart.findById(next._id).populate("items.product");
  }

  static async updateItem(userId: string, payload: any) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user id");
    const productId = payload?.product || payload?.medicine;
    const qty = Number(payload?.qty);
    if (!productId) throw new ApiError(400, "product is required");
    if (!isValidId(String(productId))) throw new ApiError(400, "Invalid product id");
    if (!Number.isFinite(qty) || qty < 1) throw new ApiError(400, "qty must be >= 1");

    const cart: any = await Cart.findOne({ user: userId });
    if (!cart) throw new ApiError(404, "Cart not found");
    const idx = cart.items.findIndex((i: any) => String(i.product) === String(productId));
    if (idx < 0) throw new ApiError(404, "Cart item not found");
    cart.items[idx].qty = qty;
    await cart.save();
    return Cart.findById(cart._id).populate("items.product");
  }

  static async removeItem(userId: string, productId: string) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user id");
    if (!isValidId(productId)) throw new ApiError(400, "Invalid product id");
    const cart: any = await Cart.findOne({ user: userId });
    if (!cart) throw new ApiError(404, "Cart not found");
    cart.items = cart.items.filter((i: any) => String(i.product) !== String(productId));
    await cart.save();
    return Cart.findById(cart._id).populate("items.product");
  }

  static async clear(userId: string) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user id");
    const cart: any = await Cart.findOne({ user: userId });
    if (!cart) return Cart.create({ user: userId, items: [] });
    cart.items = [];
    await cart.save();
    return Cart.findById(cart._id).populate("items.product");
  }
}

