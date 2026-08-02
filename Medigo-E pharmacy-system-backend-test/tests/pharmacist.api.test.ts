import test from "node:test";
import assert from "node:assert/strict";
import { ApiResponse } from "../src/shared/utils/ApiResponse";
import { generateInvoice } from "../src/modules/pharmacist/pharmacist.controller";
import { PharmacistService } from "../src/modules/pharmacist/pharmacist.service";

test("ApiResponse wraps payloads with success, message, and data", () => {
  const response = new ApiResponse(200, "Dashboard loaded successfully", { totalOrdersToday: 2 });

  assert.equal(response.success, true);
  assert.equal(response.message, "Dashboard loaded successfully");
  assert.deepEqual(response.data, { totalOrdersToday: 2 });
});

test("ApiResponse marks errors as unsuccessful", () => {
  const response = new ApiResponse(400, "Bad request", null);

  assert.equal(response.success, false);
  assert.equal(response.statusCode, 400);
});

test("generateInvoice returns the documented invoice payload shape", async () => {
  const originalGenerateInvoice = PharmacistService.generateInvoice;
  const statusCodes: number[] = [];
  const payloads: Array<{ status?: number; message?: string; data?: { invoiceUrl?: string } }> = [];

  const res: any = {
    status(code: number) {
      statusCodes.push(code);
      return this;
    },
    json(body: { status?: number; message?: string; data?: { invoiceUrl?: string } }) {
      payloads.push(body);
      return this;
    },
  };

  PharmacistService.generateInvoice = (async () => ({
    invoiceUrl: "https://example.com/invoices/inv_123.pdf",
  })) as any;

  try {
    (generateInvoice as any)({ params: { id: "507f1f77bcf86cd799439011" } }, res, () => undefined);
    await new Promise((resolve) => setImmediate(resolve));
  } finally {
    PharmacistService.generateInvoice = originalGenerateInvoice;
  }

  assert.deepEqual(statusCodes, [200]);
  assert.equal(payloads.length, 1);

  const payload = payloads[0];
  assert.equal(payload.status, 200);
  assert.equal(payload.message, "Invoice generated");
  assert.deepEqual(payload.data, { invoiceUrl: "https://example.com/invoices/inv_123.pdf" });
});
