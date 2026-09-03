import { useState, useEffect } from 'react';
import axios from 'axios';

interface MedicineSuggestion {
  _id: string;
  name: string;
  price: number;
  stock: number;
  score: number;
}

interface Medicine {
  medicineId?: string;
  name: string;
  dosage: string;
  quantity: string | number;
  price?: number;
  salePrice?: number;
  suggestions?: MedicineSuggestion[];
  manualReview?: boolean;
  ocrLine?: string;
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
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [status, setStatus] = useState<'verified' | 'rejected'>('verified');
  const [pricing, setPricing] = useState<any>(null);

  const sanitizeName = (value?: string) => {
    if (!value) return '';
    const text = String(value)
      .replace(/\\([()[\]{}])/g, '$1')
      .replace(/[()[\]{}]/g, '')
      .replace(/\s*(?:~{1,}|\b(?:as needed|after|before|morning|at night|daily)\b).*$/i, '');
    const name = text;
    return name.replace(/^[^a-zA-Z0-9]+/, '').replace(/[^a-zA-Z0-9. -]+$/g, '').trim();
  };

  const sanitizeOcrText = (value?: string) => String(value || '')
    .replace(/\\([()[\]{}])/g, '$1')
    .replace(/[~`]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  useEffect(() => {
    if (initialId) {
      loadPrescription(initialId);
    }
  }, [initialId]);

  const loadPrescription = async (id: string) => {
    setLoading(true);
    setError(null);
    setPricing(null);
    try {
      const { data } = await axios.get(`/api/prescription-orders/ocr/${id}`);
      const rawPrescription = data.data;
      const baseMedicines = rawPrescription.suggestedMedicines || [];
      const matches = rawPrescription.suggestedMatches || [];

      const mappedMedicines = baseMedicines.map((item: any, index: number) => {
        const match = matches[index] || null;
        const suggested = (match?.suggestions && match.suggestions.length > 0) ? match.suggestions : (item.suggestions || []);
        const selected = suggested?.find((suggestion: MedicineSuggestion) =>
          String(suggestion._id) === String(match?.selectedMedicineId || item.medicineId || item.id)
        );

        return {
          ...item,
          medicineId: match?.selectedMedicineId || item.medicineId || item.id || '',
          name: sanitizeName(selected?.name || item.name || match?.parsedName || ''),
          dosage: item.dosage || '',
          quantity: Number(item.quantity || 1),
          price: Number(selected?.price ?? item.price ?? item.salePrice ?? 0),
          suggestions: suggested || [],
          manualReview: Boolean(match?.manualReview),
          ocrLine: match?.ocrLine || '',
        };
      });

      setPrescription(rawPrescription);
      setMedicines(mappedMedicines);
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
    const newVal: any = field === 'quantity' ? Math.max(Number(value || 0), 0) : value;
    updated[index] = { ...updated[index], [field]: newVal };
    setMedicines(updated);
  };

  // Recalculate pricing locally whenever medicines change so UI shows updated totals immediately
  useEffect(() => {
    if (!medicines || medicines.length === 0) {
      setPricing(null);
      return;
    }

    const subtotal = medicines.reduce((sum, m) => {
      const unit = Number(m.price ?? m.salePrice ?? 0);
      const qty = Math.max(Number(m.quantity || 1), 0);
      return sum + unit * qty;
    }, 0);

    setPricing({ subtotal, deliveryFee, discount: 0, finalTotal: subtotal + deliveryFee });
  }, [medicines, deliveryFee]);

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
        deliveryFee,
      });

      setPricing(data.data?.pricing || null);
      setSuccess(`Prescription ${status} successfully!`);
      setPrescription(null);
      setMedicines([]);
      setVerificationNotes('');
      setDeliveryFee(0);
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
            value={sanitizeOcrText(prescription.extractedText)}
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
                <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid #ddd' }}>Unit Price</th>
                <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid #ddd' }}>Line Total</th>
                <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid #ddd' }}>Auto-match</th>
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
                      value={sanitizeOcrText(medicine.dosage)}
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
                      value={medicine.quantity as number}
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
                  <td style={{ padding: '10px', borderRight: '1px solid #ddd' }}>
                    BDT {Number(medicine.price ?? medicine.salePrice ?? 0).toFixed(2)}
                  </td>
                  <td style={{ padding: '10px', borderRight: '1px solid #ddd' }}>
                    BDT {(Number(medicine.price ?? medicine.salePrice ?? 0) * Math.max(Number(medicine.quantity || 1), 0)).toFixed(2)}
                  </td>
                  <td style={{ padding: '10px', borderRight: '1px solid #ddd' }}>
                    {medicine.suggestions && medicine.suggestions.length > 0 ? (
                      <div>
                        <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                          {medicine.manualReview ? '⚠ Manual review recommended' : '✅ Auto-matched'}
                        </div>
                        <select
                          value={medicine.medicineId || ''}
                          onChange={(e) => {
                            const selected = medicine.suggestions?.find((suggestion) => suggestion._id === e.target.value);
                            const updated = [...medicines];
                            updated[idx] = {
                              ...updated[idx],
                              medicineId: e.target.value,
                              name: sanitizeName(selected?.name || updated[idx].name),
                              price: Number(selected?.price ?? updated[idx].price ?? 0),
                            };
                            setMedicines(updated);
                          }}
                          style={{ width: '100%', padding: '5px', borderRadius: '4px', border: '1px solid #ddd' }}
                        >
                          {medicine.suggestions.map((suggestion) => (
                            <option key={suggestion._id} value={suggestion._id}>
                              {sanitizeName(suggestion.name)} · BDT {suggestion.price} · stock {suggestion.stock}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <span style={{ color: '#888' }}>No auto-match found</span>
                    )}
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

      {pricing && (
        <div style={{
          backgroundColor: '#f0f8ff',
          padding: '15px',
          marginBottom: '20px',
          borderRadius: '8px',
          border: '1px solid #b8d8ff'
        }}>
          <h3 style={{ marginTop: 0 }}>Calculated Pricing</h3>
          <label style={{ display: 'block', marginBottom: '8px' }}>
            <strong>Delivery Fee (BDT):</strong>
            <input
              type="number"
              min="0"
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(Math.max(Number(e.target.value || 0), 0))}
              style={{ marginLeft: '8px', padding: '5px', border: '1px solid #ddd', borderRadius: '4px', width: '100px' }}
            />
          </label>
          <p style={{ margin: '4px 0' }}><strong>Subtotal:</strong> BDT {pricing.subtotal}</p>
          <p style={{ margin: '4px 0' }}><strong>Delivery Fee:</strong> BDT {pricing.deliveryFee}</p>
          <p style={{ margin: '4px 0' }}><strong>Discount:</strong> BDT {pricing.discount}</p>
          <p style={{ margin: '4px 0' }}><strong>Final Total:</strong> BDT {pricing.finalTotal}</p>
        </div>
      )}

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
