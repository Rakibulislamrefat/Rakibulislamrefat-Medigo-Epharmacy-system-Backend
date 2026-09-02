import test from "node:test";
import assert from "node:assert/strict";
import Product from "../src/modules/product/Product.schema";
import { ProductService } from "../src/modules/product/product.service";

const originalCreate = Product.create;

test("ProductService.create accepts expriydate alias and stores expiryDate as required", async () => {
  (Product as any).create = async (payload: any) => payload;

  try {
    const created = await ProductService.create({
      name: "Paracetamol 500mg",
      slug: "paracetamol-500mg",
      price: 120,
      expriydate: "2027-12-31",
    });

    assert.equal(created.expiryDate, "2027-12-31");
    assert.equal(created.expriydate, undefined);
  } finally {
    (Product as any).create = originalCreate;
  }
});

test("ProductService.create rejects missing expiryDate", async () => {
  (Product as any).create = async (payload: any) => payload;

  try {
    await assert.rejects(
      () =>
        ProductService.create({
          name: "Paracetamol 500mg",
          slug: "paracetamol-500mg",
          price: 120,
        }),
      /expiryDate is required/i,
    );
  } finally {
    (Product as any).create = originalCreate;
  }
});
