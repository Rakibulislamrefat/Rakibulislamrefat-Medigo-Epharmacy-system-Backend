import mongoose, { Schema, model, Types } from "mongoose";

export type MedicineStatus = "active" | "inactive";
export type DosageForm =
  | "tablet"
  | "capsule"
  | "syrup"
  | "injection"
  | "cream"
  | "drops"
  | "other";

const ProductSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    genericName: { type: String, default: "", trim: true, index: true },
    brandName: { type: String, default: "", trim: true, index: true },
    dosageForm: {
      type: String,
      enum: ["tablet", "capsule", "syrup", "injection", "cream", "drops", "other"],
      default: "other",
    },
    strength: { type: String, default: "" },
    description: { type: String, default: "" },
    indications: { type: [String], default: [] },
    warnings: { type: [String], default: [] },
    otc: { type: Boolean, default: true },
    requiresPrescription: { type: Boolean, default: false },
    categories: { type: [String], default: [], index: true },
    tags: { type: [String], default: [] },
    images: { type: [String], default: [] },
    sku: { type: String, default: "", index: true },
    manufacturer: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, default: null, min: 0 },
    currency: { type: String, default: "BDT" },
    stockQty: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
  },
  { timestamps: true },
);

ProductSchema.index({ name: "text", genericName: "text", brandName: "text" });

export const Product =
  (mongoose.models.Product as mongoose.Model<any>) || model("Product", ProductSchema);

export default Product;

