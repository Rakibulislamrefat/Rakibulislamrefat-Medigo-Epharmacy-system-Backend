import test from "node:test";
import assert from "node:assert/strict";
import { formatPrescriptionOrderForPharmacist, formatOrderForPharmacist } from "../src/modules/pharmacist/pharmacist.service";

test("formatPrescriptionOrderForPharmacist returns frontend-friendly pharmacist fields", () => {
  const input = {
    _id: "presc123",
    prescriptionFile: "https://example.com/prescription.jpg",
    extractedText: "Take aspirin",
    suggestedMedicines: [{ name: "Aspirin" }],
    medicines: [{ name: "Aspirin" }],
    user: {
      name: "John Doe",
      phone: "01700000000",
      email: "john@example.com",
    },
    address: {
      line1: "123 Main Street",
      city: "Dhaka",
      country: "Bangladesh",
    },
    status: "pending_verification",
    pharmacistNotes: "Needs review",
    createdAt: "2026-07-17T10:00:00.000Z",
  };

  const result = formatPrescriptionOrderForPharmacist(input);

  assert.equal(result.customerName, "John Doe");
  assert.equal(result.customerPhone, "01700000000");
  assert.equal(result.status, "pending_verification");
  assert.equal(result.prescriptionImageUrl, "https://example.com/prescription.jpg");
  assert.equal(result.pharmacistNotes, "Needs review");
});

test("formatOrderForPharmacist returns pharmacist-friendly order fields", () => {
  const input = {
    _id: "order123",
    user: { name: "Jane Doe", phone: "01800000000" },
    deliveryAddress: {
      line1: "456 Road",
      city: "Chittagong",
      country: "Bangladesh",
    },
    status: "ready_for_delivery",
    grandTotal: 250,
    medicines: [{ name: "Paracetamol" }],
    createdAt: "2026-07-17T11:00:00.000Z",
  };

  const result = formatOrderForPharmacist(input);

  assert.equal(result.customerName, "Jane Doe");
  assert.equal(result.customerPhone, "01800000000");
  assert.equal(result.totalAmount, 250);
  assert.equal(result.deliveryAddress, "456 Road");
});
