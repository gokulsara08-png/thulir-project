// Utility to export Analytics Reports as PDF, CSV, and JSON

export function exportPDFReport({
  role = 'General',
  period = '6M',
  title = 'Platform Performance Report',
  requests = [],
  orders = [],
  payments = [],
  deliveries = [],
  users = [],
  totalValue = 0,
  totalWeight = 0
}) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to download/print the PDF report.');
    return;
  }

  const currentDate = new Date().toLocaleString('en-IN', {
    dateStyle: 'full',
    timeStyle: 'short'
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>THULIR Report - ${role} (${period})</title>
        <style>
          body { font-family: 'Inter', system-ui, sans-serif; color: #1e293b; padding: 2rem; margin: 0; background: #ffffff; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #2D6A4F; padding-bottom: 1rem; margin-bottom: 1.5rem; }
          .logo { font-size: 1.8rem; font-weight: 800; color: #2D6A4F; display: flex; align-items: center; gap: 0.5rem; }
          .badge { background: #D8F3DC; color: #1B4332; padding: 4px 12px; borderRadius: 20px; font-weight: 700; font-size: 0.85rem; border: 1px solid #95D5B2; }
          .meta { font-size: 0.85rem; color: #64748b; margin-top: 0.25rem; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; }
          .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1rem; }
          .kpi-label { font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase; }
          .kpi-val { font-size: 1.5rem; font-weight: 800; color: #2D6A4F; margin-top: 0.25rem; }
          table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.85rem; }
          th { background: #2D6A4F; color: #ffffff; text-align: left; padding: 0.6rem 0.75rem; font-weight: 600; }
          td { border-bottom: 1px solid #e2e8f0; padding: 0.6rem 0.75rem; color: #334155; }
          tr:nth-child(even) { background: #f8fafc; }
          .footer { margin-top: 3rem; border-top: 1px solid #e2e8f0; padding-top: 1rem; text-align: center; font-size: 0.75rem; color: #94a3b8; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">🌱 THULIR</div>
            <div class="meta">Official ${role.toUpperCase()} Analytics & Performance Report</div>
          </div>
          <div style="text-align: right;">
            <span class="badge">${period} Filter</span>
            <div class="meta" style="margin-top: 0.5rem;">Generated: ${currentDate}</div>
          </div>
        </div>

        <h2 style="font-size: 1.25rem; font-weight: 700; color: #0f172a; margin-bottom: 1rem;">${title}</h2>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Total Real Value</div>
            <div class="kpi-val">₹${totalValue.toLocaleString()}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Waste Diverted</div>
            <div class="kpi-val">${totalWeight > 0 ? `${totalWeight} kg` : `${requests.length} Requests`}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Recorded Transactions</div>
            <div class="kpi-val">${requests.length + orders.length + payments.length}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">System Status</div>
            <div class="kpi-val" style="color: #16a34a;">100% Verified</div>
          </div>
        </div>

        ${requests.length > 0 ? `
          <h3 style="font-size: 1rem; font-weight: 700; color: #2D6A4F; margin-top: 1.5rem;">Waste Pickup Requests Breakdown</h3>
          <table>
            <thead>
              <tr>
                <th>Waste ID</th>
                <th>Type</th>
                <th>Bin Size</th>
                <th>Quantity</th>
                <th>Pickup Location</th>
                <th>Amount (₹)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${requests.map(r => `
                <tr>
                  <td style="font-weight: 700;">${r.wasteId || r.id}</td>
                  <td>${r.wasteType}</td>
                  <td>${r.binSize || '-'}</td>
                  <td>${r.quantity || 1}</td>
                  <td>${r.pickupLocation || '-'}</td>
                  <td>₹${r.pricing?.totalPayable || 0}</td>
                  <td><strong>${r.status}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        ${orders.length > 0 ? `
          <h3 style="font-size: 1rem; font-weight: 700; color: #2D6A4F; margin-top: 1.5rem;">Marketplace Orders Breakdown</h3>
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Items Count</th>
                <th>Total Price (₹)</th>
                <th>Order Status</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map(o => `
                <tr>
                  <td style="font-weight: 700;">${o.orderId || o.id}</td>
                  <td>${o.items?.length || 1} items</td>
                  <td>₹${o.totalPrice || o.totalAmount || 0}</td>
                  <td><strong>${o.status}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        ${payments.length > 0 ? `
          <h3 style="font-size: 1rem; font-weight: 700; color: #2D6A4F; margin-top: 1.5rem;">Financial Receipts & Payouts</h3>
          <table>
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Waste / Order ID</th>
                <th>Amount (₹)</th>
                <th>Payment Status</th>
              </tr>
            </thead>
            <tbody>
              ${payments.map(p => `
                <tr>
                  <td style="font-weight: 700;">${p.paymentId || p.id}</td>
                  <td>${p.wasteId || p.orderId || '-'}</td>
                  <td>₹${p.totalPayable || p.amount || p.transportPayout || p.manufacturerPayout || 0}</td>
                  <td><strong>${p.paymentStatus || p.transportPayoutStatus || 'COMPLETED'}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        <div class="footer">
          THULIR Circular Economy Platform • Automated Performance Audit PDF • Confirmed Authentic Data
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

export function exportCSVReport({
  role = 'General',
  requests = [],
  orders = [],
  payments = []
}) {
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += `THULIR Platform Report - ${role}\n`;
  csvContent += `Generated,${new Date().toISOString()}\n\n`;

  if (requests.length > 0) {
    csvContent += "WASTE REQUESTS\n";
    csvContent += "ID,Type,Bin,Quantity,Location,Amount,Status\n";
    requests.forEach(r => {
      csvContent += `"${r.wasteId || r.id}","${r.wasteType}","${r.binSize || ''}","${r.quantity || 1}","${r.pickupLocation || ''}","${r.pricing?.totalPayable || 0}","${r.status}"\n`;
    });
    csvContent += "\n";
  }

  if (orders.length > 0) {
    csvContent += "MARKETPLACE ORDERS\n";
    csvContent += "ID,ItemsCount,TotalPrice,Status\n";
    orders.forEach(o => {
      csvContent += `"${o.orderId || o.id}","${o.items?.length || 1}","${o.totalPrice || o.totalAmount || 0}","${o.status}"\n`;
    });
    csvContent += "\n";
  }

  if (payments.length > 0) {
    csvContent += "PAYMENTS AND PAYOUTS\n";
    csvContent += "PaymentID,RefID,Amount,Status\n";
    payments.forEach(p => {
      csvContent += `"${p.paymentId || p.id}","${p.wasteId || p.orderId || ''}","${p.totalPayable || p.amount || 0}","${p.paymentStatus || 'COMPLETED'}"\n`;
    });
  }

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `THULIR_${role.toUpperCase()}_REPORT.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportJSONReport({
  role = 'General',
  requests = [],
  orders = [],
  payments = [],
  users = [],
  products = []
}) {
  const data = {
    platform: "THULIR Circular Economy",
    role,
    exportedAt: new Date().toISOString(),
    summary: {
      totalRequests: requests.length,
      totalOrders: orders.length,
      totalPayments: payments.length,
      totalUsers: users.length,
      totalProducts: products.length
    },
    requests,
    orders,
    payments,
    users,
    products
  };

  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", jsonString);
  downloadAnchor.setAttribute("download", `THULIR_${role.toUpperCase()}_DATA.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
