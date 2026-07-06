# Pharmacist Portal API Documentation

## Overview

The Pharmacist module provides a complete REST API for managing the pharmacist dashboard, prescription verification workflow, and order fulfillment process.

## Base URL

```
http://localhost:5000/api/v1/pharmacist
```

## Authentication

All endpoints require:
- **Authentication Header**: `Authorization: Bearer <JWT_TOKEN>`
- **Role**: `pharmacist` or `admin`

## Endpoints

### 1. Dashboard Statistics

**GET** `/dashboard`

Get pharmacist dashboard statistics.

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Dashboard stats fetched",
  "data": {
    "totalOrdersToday": 15,
    "pendingVerification": 8,
    "verifiedToday": 5,
    "ordersReady": 3,
    "recentOrders": [
      {
        "_id": "order_id",
        "user": "user_id",
        "medicines": [],
        "status": "pending",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "totalAmount": 2500
      }
    ]
  }
}
```

---

### 2. Get Requested Orders (Pending Verification)

**GET** `/requested-orders?status=pending_verification&page=1&limit=10`

Get prescriptions pending pharmacist verification.

**Query Parameters:**
- `status` (optional): `pending_verification`, `verified`, or `rejected` (default: `pending_verification`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Requested orders fetched",
  "data": {
    "items": [
      {
        "_id": "prescription_id",
        "user": {
          "_id": "user_id",
          "name": "John Doe",
          "email": "john@example.com",
          "phone": "1234567890"
        },
        "medicines": [
          {
            "name": "Aspirin",
            "dosage": "500mg",
            "quantity": 30
          }
        ],
        "status": "pending_verification",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 8,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

---

### 3. Get Single Prescription Order

**GET** `/requested-orders/:id`

Get detailed information about a specific prescription order.

**Parameters:**
- `id` (required): Prescription order ID

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Prescription fetched",
  "data": {
    "_id": "prescription_id",
    "user": {
      "_id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "1234567890",
      "address": {
        "line1": "123 Main St",
        "city": "New York",
        "country": "USA"
      }
    },
    "extractedText": "Doctor's notes and medicines list...",
    "medicines": [
      {
        "_id": "medicine_id",
        "name": "Aspirin",
        "dosage": "500mg",
        "quantity": 30
      }
    ],
    "status": "pending_verification",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "ocrProcessedAt": "2024-01-15T10:31:00.000Z"
  }
}
```

---

### 4. Verify Prescription

**PUT** `/requested-orders/:id/verify`

Verify a prescription and approve medicines for fulfillment.

**Parameters:**
- `id` (required): Prescription order ID

**Request Body:**
```json
{
  "medicines": [
    {
      "name": "Aspirin",
      "dosage": "500mg",
      "quantity": 30
    },
    {
      "name": "Paracetamol",
      "dosage": "650mg",
      "quantity": 20
    }
  ],
  "verificationNotes": "All medicines in stock. Patient should take one tablet daily after meals."
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Prescription verified",
  "data": {
    "_id": "prescription_id",
    "status": "verified",
    "verifiedBy": "pharmacist_id",
    "verifiedAt": "2024-01-15T10:35:00.000Z",
    "verificationNotes": "All medicines in stock. Patient should take one tablet daily after meals."
  }
}
```

---

### 5. Reject Prescription

**PUT** `/requested-orders/:id/reject`

Reject a prescription with a reason.

**Parameters:**
- `id` (required): Prescription order ID

**Request Body:**
```json
{
  "reason": "Medicine X is out of stock. Please contact the patient and ask for alternative prescription."
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Prescription rejected",
  "data": {
    "_id": "prescription_id",
    "status": "rejected",
    "verifiedBy": "pharmacist_id",
    "verifiedAt": "2024-01-15T10:36:00.000Z",
    "verificationNotes": "REJECTED: Medicine X is out of stock. Please contact the patient and ask for alternative prescription."
  }
}
```

---

### 6. Get Prescribed Orders (Fulfillment Queue)

**GET** `/prescribed-orders?status=pending_pickup&page=1&limit=10`

Get orders in the fulfillment workflow.

**Query Parameters:**
- `status` (optional): Filter by status
  - `pending_pickup`
  - `picked`
  - `packed`
  - `ready_for_delivery`
  - (default: all non-completed orders)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Prescribed orders fetched",
  "data": {
    "items": [
      {
        "_id": "order_id",
        "user": {
          "_id": "user_id",
          "name": "John Doe",
          "email": "john@example.com",
          "phone": "1234567890"
        },
        "medicines": [
          {
            "medicineId": "medicine_id",
            "name": "Aspirin",
            "price": 100,
            "salePrice": 80
          }
        ],
        "status": "pending_pickup",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 25,
      "page": 1,
      "limit": 10,
      "totalPages": 3
    }
  }
}
```

---

### 7. Get Single Order Details

**GET** `/prescribed-orders/:id`

Get detailed information about a specific order.

**Parameters:**
- `id` (required): Order ID

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Order fetched",
  "data": {
    "_id": "order_id",
    "orderNumber": "MDG-20240115-ABC123",
    "user": {
      "_id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "1234567890",
      "address": {
        "line1": "123 Main St",
        "city": "New York",
        "country": "USA"
      }
    },
    "medicines": [
      {
        "medicineId": "medicine_id",
        "name": "Aspirin",
        "quantity": 30,
        "price": 100,
        "salePrice": 80
      }
    ],
    "status": "pending_pickup",
    "totalAmount": 2400,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 8. Update Order Status

**PUT** `/prescribed-orders/:id/status`

Progress order through the fulfillment workflow.

**Parameters:**
- `id` (required): Order ID

**Request Body:**
```json
{
  "status": "picked"
}
```

**Valid Status Transitions:**
- `pending_pickup` → `picked`
- `picked` → `packed`
- `packed` → `ready_for_delivery`
- `ready_for_delivery` → `delivered`

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Order status updated",
  "data": {
    "_id": "order_id",
    "status": "picked",
    "updatedAt": "2024-01-15T10:40:00.000Z"
  }
}
```

---

### 9. Generate Invoice

**POST** `/prescribed-orders/:id/invoice`

Generate an invoice for an order.

**Parameters:**
- `id` (required): Order ID

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Invoice generated",
  "data": {
    "success": true,
    "message": "Invoice generated",
    "invoiceData": {
      "invoiceId": "INV-order_id",
      "invoiceDate": "2024-01-15T10:45:00.000Z",
      "order": { /* full order details */ },
      "totalAmount": 2400
    }
  }
}
```

---

### 10. Search Prescriptions

**GET** `/search/prescriptions?q=john&limit=20`

Search prescriptions by patient name, email, phone, or prescription ID.

**Query Parameters:**
- `q` (required): Search query (minimum 2 characters)
- `limit` (optional): Maximum results (default: 20)

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Search results",
  "data": [
    {
      "_id": "prescription_id",
      "user": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "1234567890"
      },
      "medicines": [ /* medicines array */ ],
      "status": "verified",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "statusCode": 401,
  "message": "Invalid access token",
  "error": "Invalid access token"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "statusCode": 403,
  "message": "Access denied. Insufficient permissions.",
  "error": "Access denied"
}
```

### 404 Not Found
```json
{
  "success": false,
  "statusCode": 404,
  "message": "Prescription not found",
  "error": "Prescription not found"
}
```

### 400 Bad Request
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation error",
  "error": "At least one medicine is required"
}
```

### 500 Server Error
```json
{
  "success": false,
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Failed to fetch dashboard stats"
}
```

---

## Example Usage with cURL

### Get Dashboard Stats
```bash
curl -X GET http://localhost:5000/api/v1/pharmacist/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Get Pending Prescriptions
```bash
curl -X GET "http://localhost:5000/api/v1/pharmacist/requested-orders?status=pending_verification&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Verify Prescription
```bash
curl -X PUT http://localhost:5000/api/v1/pharmacist/requested-orders/PRESCRIPTION_ID/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "medicines": [
      {
        "name": "Aspirin",
        "dosage": "500mg",
        "quantity": 30
      }
    ],
    "verificationNotes": "All medicines available"
  }'
```

### Update Order Status
```bash
curl -X PUT http://localhost:5000/api/v1/pharmacist/prescribed-orders/ORDER_ID/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "picked"
  }'
```

---

## Status Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | User lacks required permissions |
| 404 | Not Found | Resource not found |
| 500 | Internal Server Error | Server-side error |

---

## Workflow

### Prescription Verification Workflow
1. Pharmacist views dashboard → `/dashboard`
2. Views pending prescriptions → `/requested-orders?status=pending_verification`
3. Reviews single prescription → `/requested-orders/:id`
4. Verifies and approves medicines → `PUT /requested-orders/:id/verify`
5. System creates order automatically (TODO)

### Order Fulfillment Workflow
1. View orders to pick → `/prescribed-orders?status=pending_pickup`
2. Mark as picked → `PUT /prescribed-orders/:id/status` (status: "picked")
3. Mark as packed → `PUT /prescribed-orders/:id/status` (status: "packed")
4. Mark ready for delivery → `PUT /prescribed-orders/:id/status` (status: "ready_for_delivery")
5. Generate invoice → `POST /prescribed-orders/:id/invoice`
6. Mark as delivered → `PUT /prescribed-orders/:id/status` (status: "delivered")

---

## Notes

- All timestamps are in UTC ISO 8601 format
- Pagination is 1-indexed
- Maximum limit per request is 100 items
- All endpoints validate input using Zod schemas
- Status transitions are strict (can only progress forward)
