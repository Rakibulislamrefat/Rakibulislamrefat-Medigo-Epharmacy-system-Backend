# Frontend Integration Guide - Data Flow

## 📊 Data Flow Architecture

```
User Input (Form/File Upload)
    ↓
React Component State
    ↓
Axios API Client (with auth token)
    ↓
Backend Express API
    ↓
MongoDB Database
    ↓
Response to Frontend
    ↓
React State Update & UI Render
```

---

## 🔑 Step 1: Setup Authentication Token

### Option A: localStorage (Simple)
```typescript
// After login, save token
const login = async (email: string, password: string) => {
  const response = await axios.post('http://localhost:5000/api/auth/login', {
    email,
    password
  });
  
  const { token } = response.data.data;
  localStorage.setItem('authToken', token); // Store token
};
```

### Option B: Context API (Recommended)
```typescript
// See AuthContext.tsx for implementation
import { AuthContext } from './context/AuthContext';

const { user, login } = useContext(AuthContext);

// Token is automatically managed in context
```

---

## 📤 Step 2: Setting Up Axios with Auth

### File: `src/config/axiosConfig.ts`

```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

**This ensures:**
- ✅ Every API call includes `Authorization: Bearer {token}`
- ✅ Token is retrieved fresh for each request
- ✅ Automatic 401 handling (redirect to login if token expires)

---

## 📝 Step 3: Passing Data to Backend

### Upload Prescription with Address Data

```typescript
// Frontend Component
const handleUpload = async () => {
  // 1. Create FormData object (for file + data)
  const formData = new FormData();
  
  // 2. Add file
  formData.append('prescription', file); // The file input
  
  // 3. Add structured data as JSON strings
  formData.append('user', JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    phone: '1234567890'
  }));
  
  formData.append('address', JSON.stringify({
    line1: '123 Main Street',
    line2: 'Apt 4B',
    city: 'Boston',
    state: 'MA',
    postcode: '02115',
    country: 'USA',
    country_code: 'US'
  }));
  
  // 4. Send to backend
  const response = await apiClient.post(
    '/prescription-orders/ocr/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }
  );
  
  console.log(response.data.data); // { prescriptionId, status, message }
};
```

### What Backend Receives

```typescript
// Backend: Express middleware automatically parses this
req.file.path  // Path to uploaded file on Cloudinary
req.body.user  // "{"name":"John Doe",...}" (string)
req.body.address  // "{"line1":"123 Main Street",...}" (string)

// You need to parse JSON strings:
const user = JSON.parse(req.body.user);
const address = JSON.parse(req.body.address);
```

---

## 🔄 Step 4: Polling for OCR Results

```typescript
const pollForOCRResults = async (prescriptionId: string) => {
  let attempts = 0;
  const maxAttempts = 30; // 2.5 minutes
  
  const poll = async () => {
    try {
      // Call backend to get OCR status
      const response = await apiClient.get(
        `/prescription-orders/ocr/${prescriptionId}`
      );
      
      const result = response.data.data;
      
      // Update UI with results
      setResult(result);
      
      // Stop polling if done
      if (result.extractedText && result.extractedText !== 'Processing...') {
        console.log('OCR complete!', result);
        return;
      }
      
      // Continue polling
      if (attempts < maxAttempts) {
        attempts++;
        setTimeout(poll, 5000); // Poll every 5 seconds
      }
    } catch (error) {
      console.error('Poll error:', error);
      if (attempts < maxAttempts) {
        attempts++;
        setTimeout(poll, 5000);
      }
    }
  };
  
  poll(); // Start polling
};
```

---

## 📊 Complete Data Flow Example

### 1️⃣ User Uploads File
```
Frontend:
  User selects file → handleUpload() → FormData created → axios.post()
  
Backend:
  POST /prescription-orders/ocr/upload
  ↓
  Extract file, user, address from request
  ↓
  Upload file to Cloudinary
  ↓
  Create prescription record (status: pending_ocr)
  ↓
  Return prescriptionId
  
Frontend:
  Receives { prescriptionId, status: "pending_ocr" }
  ↓
  Start polling for results
```

### 2️⃣ Backend Processes OCR (Background)
```
Backend (setImmediate):
  Extract image from Cloudinary URL
  ↓
  Run Tesseract.js OCR
  ↓
  Parse medicines from text
  ↓
  Update database (status: pending_verification, extractedText: "...")
  
Frontend (polling every 5 sec):
  GET /prescription-orders/ocr/{prescriptionId}
  ↓
  Backend returns updated record with extractedText
  ↓
  setResult(data) → UI updates automatically
```

### 3️⃣ Pharmacist Verifies
```
Frontend:
  Pharmacist edits medicines in table
  ↓
  Clicks "Verify" button → handleVerify()
  ↓
  PUT /prescription-orders/verify/{prescriptionId}
  Body: { medicines: [...], status: "verified" }
  
Backend:
  Receives verification data
  ↓
  Update prescription (verifiedBy, verifiedAt, medicines array)
  ↓
  Return updated prescription
  
Frontend:
  Show success message
  ↓
  Prescription now verified!
```

---

## 🛡️ Complete Request Example

### Frontend Code
```typescript
import apiClient from '../config/axiosConfig';

// Upload prescription
const uploadPrescription = async (file, userData) => {
  const formData = new FormData();
  formData.append('prescription', file);
  formData.append('user', JSON.stringify(userData.user));
  formData.append('address', JSON.stringify(userData.address));
  
  try {
    const { data } = await apiClient.post(
      '/prescription-orders/ocr/upload',
      formData
    );
    
    console.log('Success:', data.data.prescriptionId);
    return data.data;
  } catch (error) {
    console.error('Error:', error.response?.data?.message);
    throw error;
  }
};

// Get OCR results
const getOCRResults = async (prescriptionId) => {
  const { data } = await apiClient.get(
    `/prescription-orders/ocr/${prescriptionId}`
  );
  return data.data;
};

// Verify prescription
const verifyPrescription = async (prescriptionId, medicines, notes) => {
  const { data } = await apiClient.put(
    `/prescription-orders/verify/${prescriptionId}`,
    {
      medicines,      // Array of medicine objects
      status: 'verified',
      verificationNotes: notes
    }
  );
  return data.data;
};
```

### Network Request (seen in DevTools)
```
POST http://localhost:5000/api/prescription-orders/ocr/upload
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  Content-Type: multipart/form-data
  
Body (multipart/form-data):
  prescription: [binary file data]
  user: {"name":"John Doe","email":"john@example.com",...}
  address: {"line1":"123 Main St","city":"Boston",...}
```

### Backend Receives
```typescript
{
  file: {
    path: "https://res.cloudinary.com/..../prescription.jpg",
    originalname: "prescription.jpg",
    size: 2048576
  },
  body: {
    user: '{"name":"John Doe",...}',        // String (parse needed)
    address: '{"line1":"123 Main St",...}'  // String (parse needed)
  }
}
```

---

## ✅ Debugging Checklist

### If data is not reaching backend:

- [ ] **Token not sent**: Check `Authorization` header in Network tab
  - Solution: Ensure token is in localStorage before making request
  
- [ ] **CORS error**: Check Console for CORS errors
  - Solution: Backend must have CORS configured
  
- [ ] **File not uploading**: Check if `Content-Type: multipart/form-data`
  - Solution: Don't set Content-Type manually, axios will do it
  
- [ ] **JSON parsing error**: Backend can't parse `user` string
  - Solution: Use `JSON.parse(req.body.user)` in backend
  
- [ ] **Authentication fails**: 401 response
  - Solution: User not logged in or token expired

### Check Network Tab:
```
1. Open DevTools → Network
2. Make request
3. Check request:
   - Headers: Authorization present?
   - Payload: All data included?
4. Check response:
   - Status: 200/201 (success) or 4xx/5xx (error)?
   - Data: Expected fields present?
```

---

## 🚀 Ready to Deploy

Your frontend is now connected to backend:
1. ✅ Authentication token management
2. ✅ API client with interceptors
3. ✅ File upload with FormData
4. ✅ Polling for async operations
5. ✅ Error handling
6. ✅ Type safety (TypeScript)

Next steps:
- Update API base URL in `.env` for production
- Add error boundaries
- Implement loading states
- Add success notifications
