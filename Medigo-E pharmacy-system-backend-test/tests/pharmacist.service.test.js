const test = require('node:test');
const assert = require('node:assert/strict');

require('ts-node/register/transpile-only');
const { buildFulfillmentOrderData } = require('../src/modules/pharmacist/pharmacist.service');

test('buildFulfillmentOrderData maps verified medicines into a fulfillment payload', () => {
  const prescription = {
    _id: '64f000000000000000000001',
    user: {
      userId: '64f000000000000000000002',
      name: 'Jane Doe',
      phone: '01712345678',
      email: 'jane@example.com',
    },
    address: {
      line1: 'House 1',
      city: 'Dhaka',
      country: 'Bangladesh',
    },
  };

  const medicines = [
    { name: 'Aspirin', dosage: '500mg', quantity: 2, price: 50 },
    { name: 'Paracetamol', dosage: '650mg', quantity: 1, price: 30 },
  ];

  const payload = buildFulfillmentOrderData(prescription, medicines, 'Approved by pharmacist');

  assert.equal(payload.status, 'pending_pickup');
  assert.equal(payload.totalAmount, 130);
  assert.equal(payload.prescriptionOrderId.toString(), prescription._id);
  assert.equal(payload.customerName, 'Jane Doe');
  assert.equal(payload.medicines[0].name, 'Aspirin');
  assert.equal(payload.medicines[1].quantity, 1);
});
