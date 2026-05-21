# Request Order Payment Flow - Backend Implementation

## Overview

This document outlines the complete backend implementation for handling request order payments, including both SSLCommerz (online) and Cash on Delivery (COD) payment methods.

---

## Data Flow

### 1. Frontend Sends Payment Data

The frontend sends a JSON payload to the backend:

```json
{
  "orderId": "abc123",
  "status": "confirmed",
  "pharmacistNotes": "Some note",
  "customerInfo": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+8801234567890"
  },
  "items": [
    {
      "name": "Paracetamol",
      "quantity": 2,
      "price": 100
    }
  ],
  "totalAmount": 200,
  "method": "online",
  "paymentMethod": "sslcommerz"
}
```

---

## API Endpoints

### 1. Update Payment Method
**POST** `/api/request-orders/:id/payment`

**Purpose:** Update the request order with payment method and total amount.

**Request Body:**
```json
{
  "orderId": "string (required)",
  "status": "string (pending|confirmed|cancelled)",
  "pharmacistNotes": "string",
  "customerInfo": {
    "name": "string",
    "email": "string",
    "phone": "string"
  },
  "items": "array (required)",
  "totalAmount": "number (required, > 0)",
  "method": "string (online|cash_on_delivery)",
  "paymentMethod": "string (sslcommerz|cod)"
}
```

**Response (Success):**
```json
{
  "status": 200,
  "message": "Payment method updated and ready for SSLCommerz",
  "data": {
    "order": {
      "_id": "...",
      "fullName": "...",
      "paymentMethod": "sslcommerz",
      "totalAmount": 200,
      "status": "confirmed"
    },
    "paymentGateway": "sslcommerz",
    "paymentUrl": null
  }
}
```

---

### 2. Send Invoice
**POST** `/api/request-orders/:id/invoice`

**Purpose:** Send an invoice email to the customer.

**Request Body:**
```json
{
  "orderId": "string",
  "status": "string",
  "pharmacistNotes": "string",
  "customerInfo": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "address": "string",
    "city": "string"
  },
  "items": "array",
  "totalAmount": "number"
}
```

**Response (Success):**
```json
{
  "status": 200,
  "message": "Invoice sent successfully",
  "data": {
    "invoiceSent": true,
    "orderNumber": "ORD-ABC123",
    "email": "john@example.com"
  }
}
```

---

## Database Schema Updates

The `RequestOrder` schema includes new fields for payment tracking:

```typescript
{
  // Existing fields...
  
  // Payment fields
  paymentMethod: {
    type: String,
    enum: ["sslcommerz", "cod"],
    default: null,
    index: true,
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  },
  totalAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  pharmacistNotes: {
    type: String,
    default: "",
    trim: true,
  },
  transactionId: {
    type: String,
    default: null,
    index: true,
  }
}
```

---

## Implementation Details

### Service Layer (`requestOrder.service.ts`)

#### `updatePayment(id, payload)`
- Validates the request order exists
- Validates payment method (sslcommerz or cod)
- Validates totalAmount is present and > 0
- Updates the document with payment information
- Returns updated order

#### `initiateSSLCommerzPayment(id, payload)`
- Validates payment method is sslcommerz
- Validates customer email and phone
- Prepares payment initiation data
- Returns ready-to-send SSLCommerz payload

### Controller Layer (`requestOrder.controller.ts`)

#### `updateRequestOrderPayment(req, res)`
- Extracts and validates incoming payload
- Calls service to update payment
- For SSLCommerz: Prepares payment gateway response
- For COD: Returns confirmation

#### `sendRequestOrderInvoice(req, res)`
- Retrieves order from database
- Prepares invoice data with customer info and items
- Calls `sendInvoice()` utility to send email
- Returns success/failure response

### Email Utility (`shared/utils/sendInvoice.ts`)

#### `generateInvoiceHTML(invoiceData)`
- Creates professional HTML invoice email
- Includes order details, items, and total
- Adds pharmacist notes if present
- Includes next steps and contact information

#### `sendInvoice(invoiceData)`
- Calls the nodemailer `sendEmail()` utility
- Sends HTML invoice to customer email
- Handles errors appropriately

---

## Payment Flows

### Flow 1: SSLCommerz (Online Payment)

```
Frontend                    Backend                  SSLCommerz
   |                           |                          |
   |--POST /payment---------->  |                          |
   |    (sslcommerz, amount)    |                          |
   |                           |                          |
   |                    updatePayment()                   |
   |                           |                          |
   |<--200 response-----------  |                          |
   |  (payment ready)          |                          |
   |                           |                          |
   |--redirect to payment gate---------------------------------------->|
   |                           |                          |
   |   (After payment)         |                          |
   |   SSLCommerz redirects back to success URL           |
   |                                                      |
   |--callback payload----------> handlePaymentSuccess()  |
   |                           |
   |<--200 response-----------  |
```

### Flow 2: Cash on Delivery (COD)

```
Frontend                    Backend
   |                           |
   |--POST /payment---------->  |
   |    (cod, amount)          |
   |                           |
   |                    updatePayment()
   |                           |
   |<--200 response-----------  |
   |                           |
   |--POST /invoice----------->  |
   |    (send invoice)         |
   |                           |
   |                   sendInvoice()
   |                           |
   |<--200 response-----------  |
   |  (invoice sent)           |
```

---

## Error Handling

### Validation Errors (400)
- Invalid order ID format
- Missing required fields
- Invalid payment method
- Invalid totalAmount

### Not Found Errors (404)
- Order doesn't exist

### Server Errors (500)
- Email service unavailable
- Database connection issues

---

## Email Invoice Features

The invoice email includes:
- Professional HTML template
- Order number and date
- Customer delivery information
- Itemized order details with pricing
- Total amount
- Pharmacist notes (if available)
- Order status badge
- Next steps
- Contact information

---

## Integration Points

### 1. SSLCommerz Integration
The payment endpoint prepares data for SSLCommerz. In production, you'll need to:
- Add SSLCommerz service integration
- Handle payment gateway responses
- Update order status based on payment result

### 2. Email Service
Uses existing `sendEmail()` utility from `shared/utils/sendEmail.ts`
- Requires SMTP configuration in env
- Supports HTML templates
- Handles errors gracefully

### 3. Database
Uses MongoDB with Mongoose ODM
- Indexed fields for performance
- Validation through schema
- Timestamps for audit trail

---

## Testing Endpoints

### 1. Test Payment Update (COD)
```bash
curl -X POST http://localhost:5000/api/request-orders/ORDER_ID/payment \
  -H "Content-Type: application/json" \
  -d '{
    "method": "cash_on_delivery",
    "paymentMethod": "cod",
    "totalAmount": 500,
    "status": "confirmed",
    "items": []
  }'
```

### 2. Test Invoice Sending
```bash
curl -X POST http://localhost:5000/api/request-orders/ORDER_ID/invoice \
  -H "Content-Type: application/json" \
  -d '{
    "status": "confirmed",
    "customerInfo": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+8801234567890",
      "address": "123 Main St",
      "city": "Dhaka"
    },
    "items": [{"name": "Paracetamol", "quantity": 2, "price": 100}],
    "totalAmount": 200
  }'
```

---

## Future Enhancements

1. **Payment Verification:** Add order payment verification after SSLCommerz callback
2. **Invoice PDF:** Generate PDF invoices instead of HTML emails
3. **Payment Retry Logic:** Implement retry mechanism for failed payments
4. **SMS Notifications:** Add SMS updates for order status changes
5. **Webhooks:** Implement webhook system for payment status updates
6. **Analytics:** Track payment success rates and metrics
7. **Refund Handling:** Implement refund process for cancelled orders

---

## Notes

- All timestamps are stored in UTC
- Currency is in Bangladeshi Taka (৳)
- Payment status defaults to "pending" until confirmed
- Customer info can be overridden via API or fetched from order
- Pharmacist notes are optional but useful for special instructions
