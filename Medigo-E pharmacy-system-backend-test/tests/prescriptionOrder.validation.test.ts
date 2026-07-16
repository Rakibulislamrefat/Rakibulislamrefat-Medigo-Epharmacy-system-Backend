import test from "node:test";
import assert from "node:assert/strict";
import { createPrescriptionOrderSchema } from "../src/modules/prescriptionOrder/prescriptionOrder.validation";

test("createPrescriptionOrderSchema accepts multipart-style user and address payloads", () => {
  const payload = {
    user: JSON.stringify({ name: "John Doe", email: "john@example.com", phone: "01700000000" }),
    address: JSON.stringify({ line1: "123 Main Street", city: "Dhaka", country: "Bangladesh" }),
    prescription: "file",
  };

  const result = createPrescriptionOrderSchema.parse(payload);

  assert.equal(result.address.line1, "123 Main Street");
  assert.equal(result.address.city, "Dhaka");
  assert.equal(result.address.country, "Bangladesh");
});
