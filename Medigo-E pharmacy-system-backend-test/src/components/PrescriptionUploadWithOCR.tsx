/**
 * Updated Prescription Upload Component with proper data passing
 * src/components/PrescriptionUploadWithOCR.tsx
 */

import { useState, useContext } from 'react';
import apiClient from '../config/axiosConfig';
import { AuthContext } from '../context/AuthContext'; // Or your auth context

interface MedicineExtracted {
  id?: string | null;
  medicineId?: string | null;
  name: string;
  genericName?: string;
  brandName?: string;
  strength?: string;
  dosage: string;
  quantity: string | number;
  price?: number | null;
  salePrice?: number | null;
  stockQty?: number;
  available?: boolean;
  matchConfidence?: number;
  productInfo?: Record<string, any> | null;
  rawText?: string;
}

interface OCRResult {
  prescriptionId: string;
  status: string;
  extractedText: string;
  suggestedMedicines: MedicineExtracted[];
  ocrProcessedAt: string;
  verificationStatus: string;
}

interface FormData {
  user: {
    name: string;
    email: string;
    phone: string;
  };
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    country_code: string;
  };
}

function PrescriptionUploadWithOCR() {
  const { user: authUser } = useContext(AuthContext) || {}; // Get user from auth context

  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  // Form data state - pre-filled from user context
  const [formData, setFormData] = useState<FormData>({
    user: {
      name: authUser?.name || '',
      email: authUser?.email || '',
      phone: authUser?.phone || '',
    },
    address: {
      line1: authUser?.address?.line1 || '',
      line2: authUser?.address?.line2 || '',
      city: authUser?.address?.city || '',
      state: authUser?.address?.state || '',
      postcode: authUser?.address?.postcode || '',
      country: authUser?.address?.country || '',
      country_code: authUser?.address?.country_code || '',
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Only JPEG, PNG, and PDF files are allowed');
        setFile(null);
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleAddressChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value,
      },
    }));
  };

  const validateFormData = (): boolean => {
    const { user, address } = formData;

    if (!user.name?.trim()) {
      setError('User name is required');
      return false;
    }
    if (!user.email?.trim()) {
      setError('User email is required');
      return false;
    }
    if (!user.phone?.trim()) {
      setError('User phone is required');
      return false;
    }

    if (!address.line1?.trim()) {
      setError('Address line 1 is required');
      return false;
    }
    if (!address.city?.trim()) {
      setError('City is required');
      return false;
    }
    if (!address.country?.trim()) {
      setError('Country is required');
      return false;
    }

    return true;
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    if (!validateFormData()) {
      return;
    }

    // Create FormData object to send file and other data
    const uploadFormData = new FormData();
    uploadFormData.append('prescription', file); // File input
    uploadFormData.append('user', JSON.stringify(formData.user));
    uploadFormData.append('address', JSON.stringify(formData.address));

    setLoading(true);
    setError(null);

    try {
      // POST to backend - endpoint handles multipart/form-data automatically
      const { data } = await apiClient.post(
        '/prescription-orders/ocr/upload',
        uploadFormData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (data.data?.prescriptionId) {
        setResult({
          prescriptionId: data.data.prescriptionId,
          status: data.data.status,
          extractedText: 'Processing...',
          suggestedMedicines: [],
          ocrProcessedAt: '',
          verificationStatus: 'pending',
        });

        // Start polling for OCR results
        pollForOCRResults(data.data.prescriptionId);
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(
        err.response?.data?.message ||
        err.message ||
        'Upload failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const pollForOCRResults = async (prescriptionId: string) => {
    setPolling(true);
    const maxAttempts = 30; // Poll for 2.5 minutes
    let attempts = 0;

    const poll = async () => {
      try {
        const { data } = await apiClient.get(
          `/prescription-orders/ocr/${prescriptionId}`
        );
        const ocrData = data.data;

        setResult(ocrData);

        // Stop polling if OCR is done
        if (
          ocrData.status === 'pending_verification' &&
          ocrData.extractedText &&
          ocrData.extractedText !== 'Processing...'
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
          setError('OCR processing took too long. Please try again.');
        }
      } catch (err: any) {
        console.error('Poll error:', err);
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 5000);
        } else {
          setPolling(false);
          setError('Error fetching OCR results');
        }
      }
    };

    poll();
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Upload Prescription for OCR Processing</h2>

      {error && (
        <div style={{
          backgroundColor: '#fee',
          color: '#c33',
          padding: '10px',
          marginBottom: '15px',
          borderRadius: '4px',
          border: '1px solid #fcc',
        }}>
          ⚠️ {error}
        </div>
      )}

      {!result ? (
        <>
          {/* Address Form Section */}
          <div style={{
            backgroundColor: '#f9f9f9',
            padding: '15px',
            marginBottom: '20px',
            borderRadius: '8px',
            border: '1px solid #ddd',
          }}>
            <h3 style={{ marginTop: 0 }}>Delivery Address</h3>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Address Line 1 *
              </label>
              <input
                type="text"
                value={formData.address.line1}
                onChange={(e) => handleAddressChange('line1', e.target.value)}
                placeholder="123 Main Street"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Address Line 2 (Optional)
              </label>
              <input
                type="text"
                value={formData.address.line2}
                onChange={(e) => handleAddressChange('line2', e.target.value)}
                placeholder="Apt, Suite, etc."
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  City *
                </label>
                <input
                  type="text"
                  value={formData.address.city}
                  onChange={(e) => handleAddressChange('city', e.target.value)}
                  placeholder="Boston"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  State/Province
                </label>
                <input
                  type="text"
                  value={formData.address.state}
                  onChange={(e) => handleAddressChange('state', e.target.value)}
                  placeholder="MA"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Postal Code
                </label>
                <input
                  type="text"
                  value={formData.address.postcode}
                  onChange={(e) => handleAddressChange('postcode', e.target.value)}
                  placeholder="02115"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Country *
                </label>
                <input
                  type="text"
                  value={formData.address.country}
                  onChange={(e) => handleAddressChange('country', e.target.value)}
                  placeholder="USA"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          {/* File Upload Section */}
          <div style={{
            border: '2px dashed #ccc',
            padding: '30px',
            borderRadius: '8px',
            textAlign: 'center',
            backgroundColor: '#fafafa',
          }}>
            <div style={{ marginBottom: '15px', fontSize: '40px' }}>📄</div>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              disabled={loading}
              style={{ marginBottom: '10px', cursor: 'pointer' }}
            />
            <p style={{ color: '#666', fontSize: '12px', margin: '10px 0' }}>
              📋 Supported: JPEG, PNG, PDF (Max 5MB)
            </p>
            {file && (
              <p style={{ color: '#007bff', fontSize: '14px', marginBottom: '15px' }}>
                ✓ Selected: {file.name}
              </p>
            )}
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                padding: '12px 30px',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: !file || loading ? 0.6 : 1,
                fontSize: '16px',
                fontWeight: 'bold',
              }}
            >
              {loading ? '⏳ Uploading & Processing...' : '📤 Upload Prescription'}
            </button>
          </div>
        </>
      ) : (
        <div style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '8px' }}>
          <h3>✅ Prescription Processing Results</h3>

          <div style={{ marginBottom: '15px' }}>
            <strong>Status:</strong>
            <span
              style={{
                marginLeft: '10px',
                padding: '6px 12px',
                backgroundColor: result.status === 'pending_verification' ? '#fff3cd' : '#d4edda',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
            >
              {result.status === 'pending_ocr' ? '⏳ Processing OCR...' : '✓ Ready for Verification'}
            </span>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <strong>📝 Extracted Text:</strong>
            <textarea
              readOnly
              value={result.extractedText}
              rows={6}
              style={{
                width: '100%',
                marginTop: '8px',
                padding: '10px',
                fontFamily: 'monospace',
                fontSize: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {result.suggestedMedicines && result.suggestedMedicines.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <strong>💊 Suggested Medicines:</strong>
              <table style={{
                width: '100%',
                marginTop: '8px',
                borderCollapse: 'collapse',
                backgroundColor: 'white',
                border: '1px solid #ddd',
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f0f0f0', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '8px', textAlign: 'left', borderRight: '1px solid #ddd' }}>Medicine</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderRight: '1px solid #ddd' }}>Details</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderRight: '1px solid #ddd' }}>Qty</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {result.suggestedMedicines.map((med, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '8px', borderRight: '1px solid #ddd' }}>
                        <div style={{ fontWeight: '600' }}>
                          {med.productInfo?.name || med.name}
                        </div>
                        {(med.productInfo?.brandName || med.productInfo?.genericName) && (
                          <div style={{ color: '#555', fontSize: '13px' }}>
                            {med.productInfo?.brandName ? `${med.productInfo.brandName}` : ''}
                            {med.productInfo?.brandName && med.productInfo?.genericName ? ' · ' : ''}
                            {med.productInfo?.genericName ? `${med.productInfo.genericName}` : ''}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px', borderRight: '1px solid #ddd' }}>
                        {med.productInfo?.strength || med.dosage || '—'}
                        {med.productInfo?.dosageForm ? ` · ${med.productInfo.dosageForm}` : ''}
                        {med.available === false && (
                          <div style={{ color: '#999', fontSize: '12px', marginTop: '4px' }}>No match found in inventory</div>
                        )}
                      </td>
                      <td style={{ padding: '8px', borderRight: '1px solid #ddd' }}>{med.quantity}</td>
                      <td style={{ padding: '8px' }}>
                        BDT {Number(med.salePrice ?? med.price ?? 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{
            backgroundColor: '#e7f3ff',
            padding: '12px',
            borderRadius: '4px',
            border: '1px solid #b3d9ff',
            color: '#004085',
            fontSize: '13px',
            marginBottom: '15px',
          }}>
            <strong>ℹ️ Next Step:</strong> A pharmacist will review this prescription within 1-2 hours.
          </div>

          <button
            onClick={() => {
              setResult(null);
              setFile(null);
              setError(null);
            }}
            style={{
              backgroundColor: '#6c757d',
              color: 'white',
              padding: '10px 20px',
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
        <div style={{
          marginTop: '15px',
          textAlign: 'center',
          color: '#666',
          fontSize: '14px',
          fontStyle: 'italic',
        }}>
          ⏳ Waiting for OCR processing... (This usually takes 30-60 seconds)
        </div>
      )}
    </div>
  );
}

export default PrescriptionUploadWithOCR;
