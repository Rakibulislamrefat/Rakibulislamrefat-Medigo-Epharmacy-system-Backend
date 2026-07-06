/**
 * Example 1: Using the component in a page
 * src/pages/OrderPage.tsx or src/pages/CreateOrder.tsx
 */

import PrescriptionUploadWithOCR from '../components/PrescriptionUploadWithOCR';

function OrderPage() {
  return (
    <div>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
        <h1>Place Your Medicine Order</h1>
        <p style={{ color: '#666' }}>
          Upload your prescription and we'll process it immediately.
        </p>

        {/* Main upload component */}
        <PrescriptionUploadWithOCR />

        {/* Additional info */}
        <div style={{
          marginTop: '40px',
          padding: '20px',
          backgroundColor: '#f0f8ff',
          borderRadius: '8px',
          border: '1px solid #b3d9ff',
        }}>
          <h3>📋 How it works:</h3>
          <ol style={{ lineHeight: '1.8' }}>
            <li>Upload a clear photo or PDF of your prescription</li>
            <li>Our OCR system automatically extracts the medicines</li>
            <li>A pharmacist verifies the prescription within 1-2 hours</li>
            <li>Once verified, your order is confirmed and shipped</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default OrderPage;

/**
 * Example 2: Using with React Router
 * src/routes/index.tsx
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import OrderPage from '../pages/OrderPage';

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/order" element={<OrderPage />} />
        {/* Other routes */}
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
