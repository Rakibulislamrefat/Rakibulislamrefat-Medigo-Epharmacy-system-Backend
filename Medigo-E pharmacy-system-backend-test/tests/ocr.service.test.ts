import test from "node:test";
import assert from "node:assert/strict";
import { OCRService } from "../src/modules/prescriptionOrder/ocr.service";
import Product from "../src/modules/product/Product.schema";

const originalFind = Product.find;

const mockProducts = (products: Array<Record<string, unknown>>) => {
  Product.find = ((() => ({
    select: () => ({
      lean: async () => products,
    }),
  })) as unknown) as typeof Product.find;
};

test("matchMedicinesFromText returns an available match for a stocked product", async () => {
  mockProducts([
    { _id: 'prod1', name: 'Paracetamol', genericName: 'Acetaminophen', brandName: 'Medico', price: 50, salePrice: 45, stockQty: 10 },
  ]);

  const results = await OCRService.matchMedicinesFromText("Paracetamol 500mg 1+0+1 for 5 days");
  assert.equal(results.length, 1);
  assert.equal(results[0].available, true);
  assert.equal(results[0].stockQty, 10);
  assert.equal(results[0].id, 'prod1');
});

test("matchMedicinesFromText marks out-of-stock products as unavailable", async () => {
  mockProducts([
    { _id: 'prod2', name: 'Amoxicillin', genericName: 'Amox', brandName: 'Medi', price: 80, salePrice: 75, stockQty: 0 },
  ]);

  const results = await OCRService.matchMedicinesFromText("Amoxicillin 500mg 1+0+1 for 5 days");
  assert.equal(results.length, 1);
  assert.equal(results[0].available, false);
  assert.equal(results[0].stockQty, 0);
});

test("matchMedicinesFromText fuzzy-matches OCR-garbled names", async () => {
  mockProducts([
    { _id: 'prod3', name: 'Aspirin', genericName: 'Acetylsalicylic acid', brandName: 'Medi', price: 30, salePrice: 28, stockQty: 5 },
  ]);

  const results = await OCRService.matchMedicinesFromText("Asprn 500mg 1+0+1 for 5 days");
  assert.equal(results.length, 1);
  assert.equal(results[0].available, true);
  assert.ok(results[0].matchConfidence > 0);
});

test("matchMedicinesFromText returns an unmatched item with null id for missing products", async () => {
  mockProducts([]);

  const results = await OCRService.matchMedicinesFromText("UnknownDrug 500mg 1+0+1 for 5 days");
  assert.equal(results.length, 1);
  assert.equal(results[0].id, null);
  assert.equal(results[0].available, false);
  assert.equal(results[0].matchConfidence, 0);
});

test("parseMedicinesFromText skips non-medicine lines", () => {
  const text = [
    "Dr. Rahman",
    "Date: 03/08/2026",
    "Patient: John Doe",
    "Diagnosis: fever",
    "Advice: Rest",
    "Signature",
    "Paracetamol 500mg 1+0+1 for 5 days",
  ].join("\n");

  const parsed = OCRService.parseMedicinesFromText(text);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].name, "Paracetamol");
});

test.afterEach(() => {
  Product.find = originalFind;
});
