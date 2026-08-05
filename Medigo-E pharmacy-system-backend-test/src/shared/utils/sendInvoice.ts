import { sendEmail } from "./sendEmail";

interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
}

interface InvoiceData {
  orderId: string;
  orderNumber: string;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
  };
  items: InvoiceItem[];
  totalAmount: number;
  pharmacistNotes?: string;
  status: string;
  createdAt: Date;
}

const generateInvoiceHTML = (invoiceData: InvoiceData): string => {
  const { orderNumber, customerInfo, items, totalAmount, pharmacistNotes, status, createdAt } = invoiceData;
  
  const itemsHTML = items
    .map(
      (item) => `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">${item.name}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.quantity}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">BDT ${item.price?.toFixed(2) || "N/A"}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">BDT ${((item.price || 0) * item.quantity).toFixed(2)}</td>
      </tr>
    `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Invoice - ${orderNumber}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #333;
          line-height: 1.6;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9f9f9;
        }
        .header {
          background-color: #2c3e50;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 5px 5px 0 0;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .invoice-details {
          background-color: white;
          padding: 20px;
          border: 1px solid #ddd;
        }
        .invoice-meta {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .invoice-meta-item {
          margin-bottom: 10px;
        }
        .invoice-meta-label {
          font-weight: bold;
          color: #2c3e50;
        }
        .customer-info {
          margin-bottom: 20px;
          padding: 15px;
          background-color: #f0f0f0;
          border-radius: 5px;
        }
        .customer-info h3 {
          margin-top: 0;
          color: #2c3e50;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th {
          background-color: #34495e;
          color: white;
          padding: 10px;
          text-align: left;
        }
        .total-row {
          font-weight: bold;
          background-color: #ecf0f1;
          font-size: 16px;
        }
        .status-badge {
          display: inline-block;
          padding: 5px 10px;
          border-radius: 3px;
          font-size: 12px;
          font-weight: bold;
          margin-top: 10px;
        }
        .status-pending {
          background-color: #f39c12;
          color: white;
        }
        .status-confirmed {
          background-color: #27ae60;
          color: white;
        }
        .status-cancelled {
          background-color: #e74c3c;
          color: white;
        }
        .pharmacist-notes {
          margin-top: 20px;
          padding: 15px;
          background-color: #fff3cd;
          border-left: 4px solid #f39c12;
          border-radius: 3px;
        }
        .pharmacist-notes h4 {
          margin-top: 0;
          color: #856404;
        }
        .footer {
          background-color: #2c3e50;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 0 0 5px 5px;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 Order Invoice</h1>
          <p>${orderNumber}</p>
        </div>
        
        <div class="invoice-details">
          <div class="invoice-meta">
            <div class="invoice-meta-item">
              <span class="invoice-meta-label">Order ID:</span>
              <span>${orderNumber}</span>
            </div>
            <div class="invoice-meta-item">
              <span class="invoice-meta-label">Date:</span>
              <span>${new Date(createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}</span>
            </div>
          </div>

          <div class="customer-info">
            <h3>📍 Delivery Information</h3>
            <p><strong>Name:</strong> ${customerInfo.name}</p>
            <p><strong>Email:</strong> ${customerInfo.email}</p>
            <p><strong>Phone:</strong> ${customerInfo.phone}</p>
            <p><strong>Address:</strong> ${customerInfo.address}, ${customerInfo.city}</p>
            <span class="status-badge status-${status}">${status.toUpperCase()}</span>
          </div>

          <h3 style="color: #2c3e50;">Order Items</h3>
          <table>
            <thead>
              <tr>
                <th>Product Name</th>
                <th style="text-align: center;">Quantity</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
              <tr class="total-row">
                <td colspan="3" style="border: 1px solid #ddd; padding: 8px; text-align: right;">Total Amount:</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">BDT ${totalAmount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          ${
            pharmacistNotes
              ? `
            <div class="pharmacist-notes">
              <h4>💊 Pharmacist Notes</h4>
              <p>${pharmacistNotes}</p>
            </div>
          `
              : ""
          }

          <div style="margin-top: 20px; padding: 15px; background-color: #e8f4f8; border-radius: 5px;">
            <h4 style="margin-top: 0; color: #0c5460;">Next Steps</h4>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Our pharmacist will review your order</li>
              <li>You'll receive a confirmation update via email</li>
              <li>Your order will be prepared and dispatched</li>
              <li>Delivery will be arranged as per your address</li>
            </ul>
          </div>
        </div>

        <div class="footer">
          <p>&copy; 2026 Medigo E-Pharmacy. All rights reserved.</p>
          <p>If you have any questions, please contact us at support@medigo.com</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return html;
};

export const sendInvoice = async (invoiceData: InvoiceData): Promise<void> => {
  const { customerInfo, orderNumber } = invoiceData;

  const html = generateInvoiceHTML(invoiceData);

  await sendEmail({
    to: customerInfo.email,
    subject: `Order Invoice - ${orderNumber}`,
    html,
  });
};
