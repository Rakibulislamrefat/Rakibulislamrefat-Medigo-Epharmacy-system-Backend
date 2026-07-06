/**
 * COMPLETE WORKING EXAMPLE
 * Copy-paste this entire section into your React project
 */

// ============================================
// 1. API Client Configuration
// ============================================
// File: src/api/client.ts

import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to every request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle unauthorized errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================
// 2. API Service Methods
// ============================================
// File: src/api/prescriptionService.ts

export interface UserData {
  name: string;
  email: string;
  phone: string;
}

export interface AddressData {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postcode?: string;
  country: string;
}

export interface Medicine {
  name: string;
  dosage: string;
  quantity: string | number;
  medicineId?: string;
}

export interface OCRResult {
  prescriptionId: string;
  status: string;
  extractedText: string;
  suggestedMedicines: Medicine[];
  ocrProcessedAt: string;
  verificationStatus: string;
}

// Upload and process prescription
export const uploadPrescriptionOCR = async (
  file: File,
  userData: UserData,
  addressData: AddressData
): Promise<{ prescriptionId: string; status: string }> => {
  const formData = new FormData();
  formData.append('prescription', file);
  formData.append('user', JSON.stringify(userData));
  formData.append('address', JSON.stringify(addressData));

  const { data } = await apiClient.post('/prescription-orders/ocr/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data.data;
};

// Get OCR results
export const getOCRResults = async (prescriptionId: string): Promise<OCRResult> => {
  const { data } = await apiClient.get(`/prescription-orders/ocr/${prescriptionId}`);
  return data.data;
};

// Verify prescription (pharmacist)
export const verifyPrescription = async (
  prescriptionId: string,
  medicines: Medicine[],
  verificationNotes?: string
): Promise<any> => {
  const { data } = await apiClient.put(
    `/prescription-orders/verify/${prescriptionId}`,
    {
      medicines,
      status: 'verified',
      verificationNotes: verificationNotes || '',
    }
  );
  return data.data;
};

// ============================================
// 3. Complete React Component
// ============================================
// File: src/pages/PrescriptionUploadPage.tsx

import { useState, useRef } from 'react';
import {
  uploadPrescriptionOCR,
  getOCRResults,
  UserData,
  AddressData,
  Medicine,
  OCRResult,
} from '../api/prescriptionService';

export function PrescriptionUploadPage() {
  // File upload
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form data
  const [userData, setUserData] = useState<UserData>({
    name: '',
    email: '',
    phone: '',
  });

  const [addressData, setAddressData] = useState<AddressData>({
    line1: '',
    city: '',
    country: '',
  });

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [polling, setPolling] = useState(false);

  // Validation
  const validateForm = (): boolean => {
    if (!file) {
      setError('Please select a prescription file');
      return false;
    }

    if (!userData.name.trim()) {
      setError('Name is required');
      return false;
    }

    if (!userData.email.trim()) {
      setError('Email is required');
      return false;
    }

    if (!userData.phone.trim()) {
      setError('Phone number is required');
      return false;
    }

    if (!addressData.line1.trim()) {
      setError('Address line 1 is required');
      return false;
    }

    if (!addressData.city.trim()) {
      setError('City is required');
      return false;
    }

    if (!addressData.country.trim()) {
      setError('Country is required');
      return false;
    }

    return true;
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Only JPEG, PNG, and PDF files are supported');
      setFile(null);
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError('File must be smaller than 5MB');
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setError(null);
  };

  // Upload prescription
  const handleUpload = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await uploadPrescriptionOCR(
        file!,
        userData,
        addressData
      );

      // Set initial result
      setResult({
        prescriptionId: response.prescriptionId,
        status: response.status,
        extractedText: 'Processing OCR...',
        suggestedMedicines: [],
        ocrProcessedAt: '',
        verificationStatus: 'pending',
      });

      // Start polling
      pollForResults(response.prescriptionId);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Upload failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Poll for OCR results
  const pollForResults = (prescriptionId: string) => {
    setPolling(true);
    let attempts = 0;
    const maxAttempts = 30;

    const poll = async () => {
      try {
        const ocrData = await getOCRResults(prescriptionId);
        setResult(ocrData);

        // Stop polling if complete
        if (
          ocrData.extractedText &&
          ocrData.extractedText !== 'Processing OCR...'
        ) {
          setPolling(false);
          return;
        }

        // Continue polling
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 5000);
        } else {
          setPolling(false);
          setError('OCR processing timeout. Please try again.');
        }
      } catch (err) {
        console.error('Poll error:', err);
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 5000);
        }
      }
    };

    poll();
  };

  // Reset form
  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setPolling(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <h1>Upload Your Prescription</h1>

      {/* Error Message */}
      {error && (
        <div
          style={{
            backgroundColor: '#fee',
            color: '#c33',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '20px',
            border: '1px solid #fcc',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Form - Show when no result yet */}
      {!result ? (
        <>
          {/* User Information Section */}
          <div
            style={{
              backgroundColor: '#f9f9f9',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '20px',
              border: '1px solid #ddd',
            }}
          >
            <h3>Your Information</h3>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                Full Name *
              </label>
              <input
                type="text"
                value={userData.name}
                onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                placeholder="John Doe"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                Email *
              </label>
              <input
                type="email"
                value={userData.email}
                onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                placeholder="john@example.com"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                Phone Number *
              </label>
              <input
                type="tel"
                value={userData.phone}
                onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                placeholder="1234567890"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Address Section */}
          <div
            style={{
              backgroundColor: '#f9f9f9',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '20px',
              border: '1px solid #ddd',
            }}
          >
            <h3>Delivery Address</h3>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                Address Line 1 *
              </label>
              <input
                type="text"
                value={addressData.line1}
                onChange={(e) => setAddressData({ ...addressData, line1: e.target.value })}
                placeholder="123 Main Street"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                Address Line 2 (Optional)
              </label>
              <input
                type="text"
                value={addressData.line2 || ''}
                onChange={(e) => setAddressData({ ...addressData, line2: e.target.value })}
                placeholder="Apt, Suite, etc."
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                  City *
                </label>
                <input
                  type="text"
                  value={addressData.city}
                  onChange={(e) => setAddressData({ ...addressData, city: e.target.value })}
                  placeholder="Boston"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                  Country *
                </label>
                <input
                  type="text"
                  value={addressData.country}
                  onChange={(e) => setAddressData({ ...addressData, country: e.target.value })}
                  placeholder="USA"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div
            style={{
              border: '2px dashed #007bff',
              padding: '40px',
              borderRadius: '8px',
              textAlign: 'center',
              backgroundColor: '#f0f8ff',
              marginBottom: '20px',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>📄</div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              disabled={loading}
              style={{
                cursor: 'pointer',
                marginBottom: '15px',
              }}
            />
            <p style={{ color: '#666', fontSize: '14px', margin: '10px 0' }}>
              Supported formats: JPEG, PNG, PDF (Max 5MB)
            </p>
            {file && (
              <p style={{ color: '#28a745', fontSize: '16px', fontWeight: 'bold' }}>
                ✓ {file.name}
              </p>
            )}
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            style={{
              width: '100%',
              padding: '15px',
              backgroundColor: loading ? '#ccc' : '#007bff',
              color: 'white',
              fontSize: '16px',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '⏳ Processing...' : '📤 Upload Prescription'}
          </button>
        </>
      ) : (
        // Results View
        <div style={{ backgroundColor: '#f5f5f5', padding: '25px', borderRadius: '8px' }}>
          <h2>✅ Prescription Received</h2>

          <div style={{ marginBottom: '20px' }}>
            <strong>Status:</strong>{' '}
            <span
              style={{
                marginLeft: '10px',
                padding: '8px 15px',
                backgroundColor: '#d4edda',
                color: '#155724',
                borderRadius: '4px',
              }}
            >
              {result.status === 'pending_ocr' ? '⏳ Processing' : '✓ Ready for Review'}
            </span>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <strong>Extracted Text:</strong>
            <textarea
              readOnly
              value={result.extractedText}
              rows={8}
              style={{
                width: '100%',
                marginTop: '10px',
                padding: '12px',
                fontFamily: 'monospace',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {result.suggestedMedicines.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <strong>Detected Medicines:</strong>
              <table style={{
                width: '100%',
                marginTop: '10px',
                borderCollapse: 'collapse',
                backgroundColor: 'white',
                border: '1px solid #ddd',
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f0f0f0' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                      Medicine
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                      Dosage
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                      Qty
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.suggestedMedicines.map((med, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '12px' }}>{med.name}</td>
                      <td style={{ padding: '12px' }}>{med.dosage}</td>
                      <td style={{ padding: '12px' }}>{med.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div
            style={{
              backgroundColor: '#e7f3ff',
              padding: '15px',
              borderRadius: '4px',
              border: '1px solid #b3d9ff',
              marginBottom: '20px',
            }}
          >
            <strong>ℹ️ Next Step:</strong> A pharmacist will verify and confirm your prescription
            within 1-2 hours. You'll receive an email notification once it's approved.
          </div>

          <button
            onClick={handleReset}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#6c757d',
              color: 'white',
              fontSize: '16px',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            ➕ Upload Another Prescription
          </button>
        </div>
      )}

      {polling && (
        <div style={{ marginTop: '20px', textAlign: 'center', color: '#666' }}>
          ⏳ Processing OCR... (Usually 30-60 seconds)
        </div>
      )}
    </div>
  );
}
