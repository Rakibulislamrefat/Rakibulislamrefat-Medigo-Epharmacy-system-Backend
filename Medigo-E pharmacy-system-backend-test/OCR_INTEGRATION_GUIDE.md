# Prescription OCR Integration Guide

## Overview

This implementation adds Optical Character Recognition (OCR) to your prescription order system. Users can upload prescription images, the system automatically extracts text using Tesseract.js, and pharmacists verify the extracted medicines before order confirmation.

## Architecture & Flow

```
User Upload (image/PDF)
    ↓
Cloudinary Storage
    ↓
Tesseract.js OCR Processing
    ↓
Extract Text & Parse Medicines
    ↓
Status: pending_verification
    ↓
Pharmacist Review & Verification
    ↓
Status: verified/rejected
    ↓
Order Confirmation (if verified)
```

## Database Schema Updates

### New PrescriptionOrder Fields

```typescript
// OCR extraction results
extractedText: string           // Raw OCR text output
ocrProcessedAt: Date           // When OCR was completed
suggestedMedicines: Array      // Extracted medicines from text

// Pharmacist verification
verifiedBy: ObjectId           // Reference to pharmacist user
verifiedAt: Date               // When verification occurred
verificationNotes: string      // Pharmacist comments

// New statuses
status: 'pending_ocr' 
      | 'pending_verification' 
      | 'verified' 
      | 'confirmed' 
      | 'processing' 
      | 'delivered' 
      | 'cancelled'
      | 'rejected'
```

## API Endpoints

### 1. Upload & Process Prescription
**POST** `/api/prescription-orders/ocr/upload`

**Headers:** Authorization required (user)

**Body:**
```json
{
  "prescription": "<file>",
  "user": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890"
  },
  "address": {
    "line1": "123 Main St",
    "city": "Boston",
    "country": "USA"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Prescription uploaded successfully. Processing OCR...",
  "data": {
    "prescriptionId": "507f1f77bcf86cd799439011",
    "status": "pending_ocr",
    "message": "The prescription is being processed. Check back shortly for extracted text."
  }
}
```

**Status Codes:**
- `201` - Successfully uploaded (OCR processing in background)
- `400` - Missing file or validation error
- `401` - Not authenticated
- `500` - Upload failed

---

### 2. Get OCR Details
**GET** `/api/prescription-orders/ocr/:id`

**Headers:** Authorization required

**Response:**
```json
{
  "success": true,
  "message": "Prescription OCR details fetched",
  "data": {
    "prescriptionId": "507f1f77bcf86cd799439011",
    "status": "pending_verification",
    "extractedText": "Aspirin 500mg x 10 tablets\nParacetamol 1000mg x 20...",
    "suggestedMedicines": [
      { "name": "Aspirin", "dosage": "500mg", "quantity": "10" },
      { "name": "Paracetamol", "dosage": "1000mg", "quantity": "20" }
    ],
    "ocrProcessedAt": "2024-01-15T10:30:00Z",
    "verificationStatus": "pending",
    "verifiedBy": null,
    "verificationNotes": ""
  }
}
```

---

### 3. Pharmacist Verification
**PUT** `/api/prescription-orders/verify/:id`

**Headers:** Authorization required (pharmacist/admin)

**Body:**
```json
{
  "medicines": [
    {
      "name": "Aspirin",
      "dosage": "500mg",
      "quantity": "10",
      "medicineId": "507f1f77bcf86cd799439012"
    },
    {
      "name": "Paracetamol",
      "dosage": "1000mg",
      "quantity": "20",
      "medicineId": "507f1f77bcf86cd799439013"
    }
  ],
  "status": "verified",
  "verificationNotes": "All medicines verified. No interactions found."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Prescription verified by pharmacist",
  "data": {
    "prescriptionId": "507f1f77bcf86cd799439011",
    "status": "verified",
    "medicines": [...],
    "verifiedBy": "507f1f77bcf86cd799439050",
    "verifiedAt": "2024-01-15T11:00:00Z"
  }
}
```

---

## React Components

### 1. PrescriptionUploadWithOCR

Used by patients to upload prescriptions.

```tsx
import PrescriptionUploadWithOCR from './modules/prescriptionOrder/PrescriptionUploadWithOCR';

function App() {
  return <PrescriptionUploadWithOCR />;
}
```

**Features:**
- File upload with validation (JPEG, PNG, PDF)
- Real-time file size checking (max 5MB)
- Automatic OCR processing
- Polling for extraction results
- Displays extracted text and suggested medicines
- Shows pharmacist review status

---

### 2. PrescriptionVerificationUI

Used by pharmacists to verify prescriptions.

```tsx
import PrescriptionVerificationUI from './modules/prescriptionOrder/PrescriptionVerificationUI';

function PharmacistDashboard() {
  return <PrescriptionVerificationUI />;
}

// Or with a specific prescription ID
function VerifyPrescription() {
  return <PrescriptionVerificationUI prescriptionId="507f1f77bcf86cd799439011" />;
}
```

**Features:**
- Search prescriptions by ID
- Display OCR extracted text
- Edit and verify medicines
- Add/remove medicines
- Add verification notes
- Mark as verified or rejected
- Real-time feedback

---

## OCR Service

Located in: `src/modules/prescriptionOrder/ocr.service.ts`

### Methods

#### `OCRService.extractTextFromPrescription(imagePath)`
Extracts text from prescription image using Tesseract.js

**Parameters:**
- `imagePath` (string) - URL to image on Cloudinary or local path

**Returns:** Promise<string> - Extracted text

**Example:**
```typescript
const text = await OCRService.extractTextFromPrescription(
  'https://res.cloudinary.com/..../prescription.jpg'
);
```

---

#### `OCRService.parseMedicinesFromText(text)`
Parses extracted text to identify medicines

**Patterns recognized:**
- "Aspirin 500mg x 10 tablets"
- "Paracetamol 1000mg x 20"
- "Amoxicillin 250mg 3x daily"

**Returns:** Array<{ name, dosage, quantity }>

**Example:**
```typescript
const medicines = OCRService.parseMedicinesFromText(extractedText);
// Output: [
//   { name: 'Aspirin', dosage: '500mg', quantity: '10' },
//   { name: 'Paracetamol', dosage: '1000mg', quantity: '20' }
// ]
```

---

#### `OCRService.validateExtractionQuality(text)`
Validates OCR extraction quality

**Returns:** { isValid: boolean, confidence: number (0-100) }

**Example:**
```typescript
const { isValid, confidence } = OCRService.validateExtractionQuality(text);
// Output: { isValid: true, confidence: 75 }
```

---

## Integration Steps

### 1. **Database Migration** (if needed)
Existing prescriptions will automatically use new fields with defaults:
- `extractedText`: ""
- `ocrProcessedAt`: null
- `verifiedBy`: null
- etc.

### 2. **Frontend Integration**

#### User Upload Page
```tsx
import PrescriptionUploadWithOCR from './modules/prescriptionOrder/PrescriptionUploadWithOCR';

export default function OrderPage() {
  return (
    <div>
      <h1>New Order</h1>
      <PrescriptionUploadWithOCR />
    </div>
  );
}
```

#### Pharmacist Dashboard
```tsx
import PrescriptionVerificationUI from './modules/prescriptionOrder/PrescriptionVerificationUI';

export default function PharmacistDashboard() {
  return (
    <div>
      <h1>Verify Prescriptions</h1>
      <PrescriptionVerificationUI />
    </div>
  );
}
```

### 3. **API Integration**

All endpoints are automatically protected by existing middleware:
- `protect` - Requires authentication
- `authorize` - Role-based access control (user, pharmacist, admin)
- `upload.prescriptionFile` - Cloudinary file upload
- `validate` - Input validation using Zod schemas

---

## File Size & Performance

### Tesseract.js Performance
- **Small images** (< 1MB): 10-30 seconds
- **Large images** (1-5MB): 30-60 seconds
- **PDFs**: Similar to images depending on content density

### Optimization Tips
1. **Compress images** before upload
2. **Process OCR asynchronously** - Don't block API response
3. **Cache Tesseract models** - First load includes model download
4. **Use worker threads** - Tesseract.js can run in Web Workers

### Server-Side Optimization
```typescript
// OCR runs in setImmediate (background)
setImmediate(async () => {
  const text = await OCRService.extractTextFromPrescription(filePath);
  // Update database after extraction
});
```

---

## Error Handling

### Common Issues

#### 1. **No text extracted**
- **Cause:** Image quality too poor, non-medical document
- **Solution:** Request user re-upload with better lighting

#### 2. **Incorrect medicine parsing**
- **Cause:** Prescription format not recognized
- **Solution:** Pharmacist manually adds/edits medicines

#### 3. **Upload fails**
- **Cause:** File size > 5MB, unsupported format
- **Solution:** Frontend validation prevents this

#### 4. **OCR takes too long**
- **Cause:** Large file, system load
- **Solution:** Frontend polls for 2.5 minutes, then times out

---

## Security Considerations

### Data Protection
✅ **PHI Compliance:**
- All prescription data encrypted at rest
- Cloudinary is HIPAA-compliant
- Logs don't store sensitive medical data
- User must be authenticated to view their prescriptions

✅ **Access Control:**
- Users can only upload/view their own prescriptions
- Only pharmacists/admins can verify
- Audit trail via `verifiedBy` and `verifiedAt`

✅ **File Validation:**
- Only approved image/PDF formats
- Max 5MB file size
- Cloudinary virus scanning enabled

---

## Testing

### Manual Testing Checklist

**Upload Flow:**
- [ ] Upload valid image - ✅ Creates prescription
- [ ] Upload oversized file - ❌ Shows error
- [ ] Upload unsupported format - ❌ Shows error
- [ ] Check OCR processing - ⏳ Shows status
- [ ] View extracted text - ✅ Displays extracted text

**Verification Flow:**
- [ ] Load prescription by ID - ✅ Shows details
- [ ] Edit medicines - ✅ Updates table
- [ ] Add new medicine - ✅ Adds row
- [ ] Remove medicine - ✅ Deletes row
- [ ] Submit verification - ✅ Updates status

---

## Future Enhancements

### Planned Features
1. **ML-based validation** - Detect fake/invalid prescriptions
2. **Multi-language OCR** - Support non-English prescriptions
3. **Barcode scanning** - Extract medicine codes directly
4. **Insurance integration** - Auto-check coverage
5. **Drug interaction checker** - Alert on conflicts
6. **Template recognition** - Different prescription formats

---

## Troubleshooting

### Q: OCR returns empty text?
**A:** Check image quality. Try uploading a different angle or with better lighting.

### Q: Component won't load?
**A:** Verify:
- React version compatible (v17+)
- axios installed and configured
- API endpoints accessible
- User has proper authentication token

### Q: Medicines don't parse correctly?
**A:** Currently supports common patterns. For custom formats, pharmacist can manually add medicines.

### Q: How long does OCR take?
**A:** Typically 30-60 seconds. Component polls for updates every 5 seconds for 2.5 minutes.

---

## Support

For issues or questions, check:
1. Console for error messages
2. Network tab for failed API requests
3. Server logs at `/api/prescription-orders` endpoints
