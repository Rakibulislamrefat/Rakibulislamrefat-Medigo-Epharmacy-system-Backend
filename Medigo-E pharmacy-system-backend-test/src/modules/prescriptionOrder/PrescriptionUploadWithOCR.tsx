import { useState } from 'react';
import axios from 'axios';

interface MedicineExtracted {
  name: string;
  dosage: string;
  quantity: string;
}

interface OCRResult {
  prescriptionId: string;
  status: string;
  extractedText: string;
  suggestedMedicines: MedicineExtracted[];
  ocrProcessedAt: string;
  verificationStatus: string;
}

function PrescriptionUploadWithOCR() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Only JPEG, PNG, and PDF files are allowed');
        setFile(null);
        return;
      }
      // Validate file size (5MB max)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('prescription', file);
    // Add any additional required fields from your schema
    formData.append('user', JSON.stringify({
      name: 'User Name', // Get from auth context
      email: 'user@example.com',
      phone: '123456789'
    }));
    formData.append('address', JSON.stringify({
      line1: 'Address line 1',
      city: 'City',
      country: 'Country'
    }));

    setLoading(true);
    setError(null);

    try {
      const { data } = await axios.post('/api/prescription-orders/ocr/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (data.data.prescriptionId) {
        setResult({
          prescriptionId: data.data.prescriptionId,
          status: data.data.status,
          extractedText: 'Processing...',
          suggestedMedicines: [],
          ocrProcessedAt: '',
          verificationStatus: 'pending'
        });
        
        // Poll for OCR results
        pollForOCRResults(data.data.prescriptionId);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pollForOCRResults = async (prescriptionId: string) => {
    setPolling(true);
    const maxAttempts = 30; // Poll for up to 2.5 minutes
    let attempts = 0;

    const poll = async () => {
      try {
        const { data } = await axios.get(`/api/prescription-orders/ocr/${prescriptionId}`);
        const ocrData = data.data;

        setResult(ocrData);

        // If still processing, poll again
        if (ocrData.status === 'pending_verification' && ocrData.extractedText && ocrData.extractedText !== 'Processing...') {
          setPolling(false);
          return;
        }

        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 5000); // Poll every 5 seconds
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
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Upload Prescription for OCR Processing</h2>

      {error && (
        <div style={{
          backgroundColor: '#fee',
          color: '#c33',
          padding: '10px',
          marginBottom: '15px',
          borderRadius: '4px',
          border: '1px solid #fcc'
        }}>
          {error}
        </div>
      )}

      {!result ? (
        <div style={{ border: '2px dashed #ccc', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            disabled={loading}
            style={{ marginBottom: '10px' }}
          />
          <p style={{ color: '#666', fontSize: '12px' }}>
            Supported formats: JPEG, PNG, PDF (Max 5MB)
          </p>
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: !file || loading ? 0.6 : 1,
              fontSize: '16px'
            }}
          >
            {loading ? 'Uploading...' : 'Upload Prescription'}
          </button>
        </div>
      ) : (
        <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '8px' }}>
          <h3>Prescription Processing Results</h3>

          <div style={{ marginBottom: '15px' }}>
            <strong>Status:</strong> 
            <span style={{
              marginLeft: '10px',
              padding: '4px 8px',
              backgroundColor: result.status === 'pending_verification' ? '#fff3cd' : '#d4edda',
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              {result.status === 'pending_ocr' ? '⏳ Processing OCR...' : '✓ Ready for Verification'}
            </span>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <strong>Extracted Text:</strong>
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
                backgroundColor: 'white'
              }}
            />
          </div>

          {result.suggestedMedicines && result.suggestedMedicines.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <strong>Suggested Medicines:</strong>
              <table style={{
                width: '100%',
                marginTop: '8px',
                borderCollapse: 'collapse',
                backgroundColor: 'white',
                border: '1px solid #ddd'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f0f0f0', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '8px', textAlign: 'left', borderRight: '1px solid #ddd' }}>Medicine</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderRight: '1px solid #ddd' }}>Dosage</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {result.suggestedMedicines.map((med, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '8px', borderRight: '1px solid #ddd' }}>{med.name}</td>
                      <td style={{ padding: '8px', borderRight: '1px solid #ddd' }}>{med.dosage}</td>
                      <td style={{ padding: '8px' }}>{med.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{
            backgroundColor: '#e7f3ff',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #b3d9ff',
            color: '#004085',
            fontSize: '14px'
          }}>
            <strong>ℹ️ Next Step:</strong> A pharmacist will review and verify this prescription data before your order is confirmed. This typically takes 1-2 hours.
          </div>

          <button
            onClick={() => {
              setResult(null);
              setFile(null);
              setError(null);
            }}
            style={{
              marginTop: '15px',
              backgroundColor: '#6c757d',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Upload Another Prescription
          </button>
        </div>
      )}

      {polling && (
        <div style={{
          marginTop: '15px',
          textAlign: 'center',
          color: '#666',
          fontSize: '14px'
        }}>
          ⏳ Waiting for OCR processing... (This may take a few moments)
        </div>
      )}
    </div>
  );
}

export default PrescriptionUploadWithOCR;
