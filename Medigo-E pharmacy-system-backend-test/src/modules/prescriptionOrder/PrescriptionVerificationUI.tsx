import { useState, useEffect } from 'react';
import axios from 'axios';

interface Medicine {
  medicineId?: string;
  name: string;
  dosage: string;
  quantity: string | number;
}

interface Prescription {
  _id: string;
  extractedText: string;
  medicines: Medicine[];
  status: string;
  user: {
    name: string;
    email: string;
    phone: string;
  };
  ocrProcessedAt: string;
}

interface VerificationUIProps {
  prescriptionId?: string;
}

function PrescriptionVerificationUI({ prescriptionId: initialId }: VerificationUIProps) {
  const [prescriptionId, setPrescriptionId] = useState(initialId || '');
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [status, setStatus] = useState<'verified' | 'rejected'>('verified');

  useEffect(() => {
    if (initialId) {
      loadPrescription(initialId);
    }
  }, [initialId]);

  const loadPrescription = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`/api/prescription-orders/ocr/${id}`);
      setPrescription(data.data);
      setMedicines(data.data.suggestedMedicines || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load prescription');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchPrescription = () => {
    if (!prescriptionId.trim()) {
      setError('Please enter a prescription ID');
      return;
    }
    loadPrescription(prescriptionId);
  };

  const handleAddMedicine = () => {
    setMedicines([...medicines, { name: '', dosage: '', quantity: '' }]);
  };

  const handleRemoveMedicine = (index: number) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const handleUpdateMedicine = (index: number, field: keyof Medicine, value: string) => {
    const updated = [...medicines];
    updated[index] = { ...updated[index], [field]: value };
    setMedicines(updated);
  };

  const handleVerify = async () => {
    if (medicines.length === 0) {
      setError('At least one medicine is required');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data } = await axios.put(`/api/prescription-orders/verify/${prescription?._id}`, {
        medicines,
        status,
        verificationNotes,
      });

      setSuccess(`Prescription ${status} successfully!`);
      setPrescription(null);
      setMedicines([]);
      setVerificationNotes('');
      setStatus('verified');
      setPrescriptionId('');

      // Reset success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (!prescription) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h2>Prescription Verification Portal</h2>

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

        {success && (
          <div style={{
            backgroundColor: '#efe',
            color: '#3c3',
            padding: '10px',
            marginBottom: '15px',
            borderRadius: '4px',
            border: '1px solid #3f3'
          }}>
            ✓ {success}
          </div>
        )}

        <div style={{
          border: '1px solid #ddd',
          padding: '20px',
          borderRadius: '8px',
          backgroundColor: '#f9f9f9'
        }}>
          <label style={{ display: 'block', marginBottom: '10px' }}>
            <strong>Prescription ID:</strong>
            <input
              type="text"
              value={prescriptionId}
              onChange={(e) => setPrescriptionId(e.target.value)}
              placeholder="Enter prescription ID"
              style={{
                width: '100%',
                padding: '8px',
                marginTop: '5px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </label>
          <button
            onClick={handleFetchPrescription}
            disabled={loading}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Loading...' : 'Load Prescription'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Verify Prescription</h2>

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

      {/* Prescription Details */}
      <div style={{
        backgroundColor: '#f9f9f9',
        padding: '15px',
        marginBottom: '20px',
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <h3 style={{ marginTop: 0 }}>Prescription Details</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <div>
            <strong>Patient:</strong>
            <p style={{ margin: '5px 0' }}>{prescription.user.name}</p>
          </div>
          <div>
            <strong>Email:</strong>
            <p style={{ margin: '5px 0' }}>{prescription.user.email}</p>
          </div>
          <div>
            <strong>Phone:</strong>
            <p style={{ margin: '5px 0' }}>{prescription.user.phone}</p>
          </div>
          <div>
            <strong>Processed:</strong>
            <p style={{ margin: '5px 0' }}>
              {new Date(prescription.ocrProcessedAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <strong>OCR Extracted Text:</strong>
          <textarea
            readOnly
            value={prescription.extractedText}
            rows={5}
            style={{
              width: '100%',
              marginTop: '8px',
              padding: '10px',
              fontFamily: 'monospace',
              fontSize: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: 'white',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Medicines Verification */}
      <div style={{
        backgroundColor: '#f9f9f9',
        padding: '15px',
        marginBottom: '20px',
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <h3 style={{ marginTop: 0 }}>Medicines Verification</h3>

        <div style={{ overflowX: 'auto', marginBottom: '15px' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: 'white',
            border: '1px solid #ddd'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid #ddd' }}>Medicine Name</th>
                <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid #ddd' }}>Dosage</th>
                <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid #ddd' }}>Quantity</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map((medicine, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '10px', borderRight: '1px solid #ddd' }}>
                    <input
                      type="text"
                      value={medicine.name}
                      onChange={(e) => handleUpdateMedicine(idx, 'name', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '5px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </td>
                  <td style={{ padding: '10px', borderRight: '1px solid #ddd' }}>
                    <input
                      type="text"
                      value={medicine.dosage}
                      onChange={(e) => handleUpdateMedicine(idx, 'dosage', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '5px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </td>
                  <td style={{ padding: '10px', borderRight: '1px solid #ddd' }}>
                    <input
                      type="number"
                      value={medicine.quantity}
                      onChange={(e) => handleUpdateMedicine(idx, 'quantity', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '5px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleRemoveMedicine(idx)}
                      style={{
                        backgroundColor: '#dc3545',
                        color: 'white',
                        padding: '5px 10px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={handleAddMedicine}
          style={{
            backgroundColor: '#28a745',
            color: 'white',
            padding: '8px 15px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '15px'
          }}
        >
          + Add Medicine
        </button>
      </div>

      {/* Verification Notes */}
      <div style={{
        backgroundColor: '#f9f9f9',
        padding: '15px',
        marginBottom: '20px',
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <label style={{ display: 'block' }}>
          <strong>Verification Notes (Optional):</strong>
          <textarea
            value={verificationNotes}
            onChange={(e) => setVerificationNotes(e.target.value)}
            placeholder="Add any notes or corrections..."
            rows={4}
            style={{
              width: '100%',
              marginTop: '8px',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              boxSizing: 'border-box',
              fontFamily: 'Arial'
            }}
          />
        </label>
      </div>

      {/* Status & Actions */}
      <div style={{
        backgroundColor: '#f9f9f9',
        padding: '15px',
        marginBottom: '20px',
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <label style={{ display: 'block', marginBottom: '15px' }}>
          <strong>Verification Status:</strong>
          <div style={{ marginTop: '8px' }}>
            <label style={{ marginRight: '20px' }}>
              <input
                type="radio"
                name="status"
                value="verified"
                checked={status === 'verified'}
                onChange={(e) => setStatus(e.target.value as 'verified' | 'rejected')}
              />
              {' '}Verify Prescription
            </label>
            <label>
              <input
                type="radio"
                name="status"
                value="rejected"
                checked={status === 'rejected'}
                onChange={(e) => setStatus(e.target.value as 'verified' | 'rejected')}
              />
              {' '}Reject Prescription
            </label>
          </div>
        </label>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={handleVerify}
          disabled={loading}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            padding: '12px 30px',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            fontSize: '16px',
            flex: 1
          }}
        >
          {loading ? 'Saving...' : `${status === 'verified' ? 'Verify' : 'Reject'} Prescription`}
        </button>
        <button
          onClick={() => {
            setPrescription(null);
            setMedicines([]);
            setVerificationNotes('');
            setStatus('verified');
            setPrescriptionId('');
          }}
          disabled={loading}
          style={{
            backgroundColor: '#6c757d',
            color: 'white',
            padding: '12px 30px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default PrescriptionVerificationUI;
