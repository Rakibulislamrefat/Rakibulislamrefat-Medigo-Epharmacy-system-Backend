# Frontend Integration - Quick Reference

## 1️⃣ Basic Setup (Copy-Paste Ready)

### Install Dependencies
```bash
npm install axios
```

### Create API Client
**File: `src/config/axiosConfig.ts`**
```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

### Create .env
**File: `.env`**
```
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 2️⃣ Upload Prescription

```typescript
import apiClient from '../config/axiosConfig';

const handleUpload = async (file, user, address) => {
  const formData = new FormData();
  formData.append('prescription', file);
  formData.append('user', JSON.stringify(user));
  formData.append('address', JSON.stringify(address));

  const response = await apiClient.post('/prescription-orders/ocr/upload', formData);
  return response.data.data.prescriptionId;
};
```

---

## 3️⃣ Poll for OCR Results

```typescript
const pollOCR = (prescriptionId, onUpdate, onComplete) => {
  const poll = async () => {
    const response = await apiClient.get(`/prescription-orders/ocr/${prescriptionId}`);
    const data = response.data.data;
    
    onUpdate(data);
    
    if (data.extractedText && data.extractedText !== 'Processing...') {
      onComplete(data);
    } else {
      setTimeout(poll, 5000);
    }
  };
  poll();
};
```

---

## 4️⃣ Verify Prescription

```typescript
const verifyPrescription = async (prescriptionId, medicines, notes) => {
  const response = await apiClient.put(
    `/prescription-orders/verify/${prescriptionId}`,
    {
      medicines,
      status: 'verified',
      verificationNotes: notes
    }
  );
  return response.data.data;
};
```

---

## 5️⃣ User Data Structure

### User Object
```typescript
{
  name: string,           // "John Doe"
  email: string,          // "john@example.com"
  phone: string           // "1234567890"
}
```

### Address Object
```typescript
{
  line1: string,          // "123 Main Street"
  line2?: string,         // "Apt 4B"
  city: string,           // "Boston"
  state?: string,         // "MA"
  postcode?: string,      // "02115"
  country: string,        // "USA"
  country_code?: string   // "US"
}
```

### Medicine Object
```typescript
{
  name: string,           // "Aspirin"
  dosage: string,         // "500mg"
  quantity: string,       // "10"
  medicineId?: string     // ObjectId (optional)
}
```

---

## 6️⃣ Common Patterns

### Handle Errors
```typescript
try {
  const response = await apiClient.post('/endpoint', data);
  console.log('Success:', response.data);
} catch (error: any) {
  const message = error.response?.data?.message || error.message;
  console.error('Error:', message);
}
```

### File Validation
```typescript
const validateFile = (file: File) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type');
  }
  if (file.size > maxSize) {
    throw new Error('File too large');
  }
};
```

### Loading States
```typescript
const [loading, setLoading] = useState(false);

const handleAction = async () => {
  setLoading(true);
  try {
    const result = await apiClient.post('/endpoint', data);
    // Handle success
  } catch (error) {
    // Handle error
  } finally {
    setLoading(false);
  }
};
```

---

## 7️⃣ Response Formats

### Success Response
```typescript
{
  success: true,
  message: "Prescription uploaded successfully",
  data: {
    prescriptionId: "507f1f77bcf86cd799439011",
    status: "pending_ocr",
    message: "Processing..."
  }
}
```

### Error Response
```typescript
{
  success: false,
  message: "File is required",
  data: null
}
```

---

## 8️⃣ Use in Components

### Simple Component
```tsx
import { useState } from 'react';
import apiClient from '../config/axiosConfig';

function PrescriptionForm() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) return;
    
    const formData = new FormData();
    formData.append('prescription', file);
    formData.append('user', JSON.stringify({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '1234567890'
    }));
    formData.append('address', JSON.stringify({
      line1: '123 Main St',
      city: 'Boston',
      country: 'USA'
    }));

    setLoading(true);
    try {
      const response = await apiClient.post(
        '/prescription-orders/ocr/upload',
        formData
      );
      console.log('Prescription ID:', response.data.data.prescriptionId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button type="submit" disabled={loading}>
        {loading ? 'Uploading...' : 'Upload'}
      </button>
    </form>
  );
}

export default PrescriptionForm;
```

---

## 9️⃣ Environment Variables

### `.env`
```
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_NAME=Medigo E-Pharmacy
```

### Access in Code
```typescript
const apiUrl = import.meta.env.VITE_API_BASE_URL;
const appName = import.meta.env.VITE_APP_NAME;
```

---

## 🔟 Troubleshooting

| Issue | Solution |
|-------|----------|
| `401 Unauthorized` | Check token in localStorage |
| `CORS error` | Backend CORS not configured |
| `File not uploading` | Use `multipart/form-data` header |
| `Network error` | Check API URL in `.env` |
| `Empty response` | Check backend status codes |

---

## 📋 Checklist Before Deployment

- [ ] API base URL correct in `.env`
- [ ] Authentication token in localStorage
- [ ] CORS configured on backend
- [ ] File upload size limits
- [ ] Error handling in UI
- [ ] Loading states implemented
- [ ] Network requests visible in DevTools
