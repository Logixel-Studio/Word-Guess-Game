import jsPDF from 'jspdf';

function formatMoney(val, symbol = 'Rs') {
  return `${symbol} ${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatMonthLabel(month) {
  if (!month) return '';
  const [y, m] = month.split('-');
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${months[parseInt(m) - 1]} ${y}`;
}

export function downloadPayslipPDF(payroll, companySettings = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 18;
  const contentW = pageW - margin * 2;
  const symbol = companySettings.currency_symbol || 'Rs';
  const companyName = companySettings.company_name || 'NUTRIMETH';
  const companyAddress = companySettings.address || '';
  const companyPhone = companySettings.phone || '';
  const companyEmail = companySettings.email || '';

  let y = 0;

  // Header background
  doc.setFillColor(22, 163, 74); // primary green
  doc.rect(0, 0, pageW, 38, 'F');

  // Company Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, margin, 16);

  // PAYSLIP label
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('SALARY PAYSLIP', pageW - margin, 12, { align: 'right' });
  doc.setFontSize(9);
  doc.text(formatMonthLabel(payroll.month), pageW - margin, 19, { align: 'right' });

  // Company info line
  doc.setFontSize(8);
  const infoLine = [companyAddress, companyPhone, companyEmail].filter(Boolean).join('  |  ');
  if (infoLine) doc.text(infoLine, margin, 26);

  y = 46;
  doc.setTextColor(30, 30, 30);

  // Two-column info section
  const colL = margin;
  const colR = margin + contentW / 2 + 4;

  // Employee Info box
  doc.setFillColor(245, 247, 250);
  doc.setDrawColor(220, 220, 225);
  doc.roundedRect(colL, y, contentW / 2 - 4, 36, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 110);
  doc.text('EMPLOYEE INFORMATION', colL + 4, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(8.5);
  const empLines = [
    ['Name', payroll.employee_name || '—'],
    ['Department', payroll.employee_department || '—'],
    ['Role', payroll.employee_role || '—'],
    ['Email', payroll.employee_email || '—'],
  ];
  empLines.forEach(([label, val], idx) => {
    const ey = y + 14 + idx * 6;
    doc.setFont('helvetica', 'bold');
    doc.text(label + ':', colL + 4, ey);
    doc.setFont('helvetica', 'normal');
    doc.text(String(val), colL + 26, ey);
  });

  // Payroll Info box
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(colR, y, contentW / 2 - 4, 36, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 110);
  doc.text('PAYROLL INFORMATION', colR + 4, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);
  const payInfo = [
    ['Month', formatMonthLabel(payroll.month)],
    ['Status', (payroll.payment_status || 'pending').toUpperCase()],
    ['Paid Date', payroll.paid_date || '—'],
    ['Generated', new Date().toLocaleDateString()],
  ];
  payInfo.forEach(([label, val], idx) => {
    const py = y + 14 + idx * 6;
    doc.setFont('helvetica', 'bold');
    doc.text(label + ':', colR + 4, py);
    doc.setFont('helvetica', 'normal');
    doc.text(String(val), colR + 26, py);
  });

  y += 44;

  // Salary Breakdown Table
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFillColor(22, 163, 74);
  doc.rect(margin, y, contentW, 8, 'F');
  doc.text('SALARY BREAKDOWN', margin + 4, y + 5.5);
  y += 8;

  const tableRows = [
    ['Basic Salary', '', formatMoney(payroll.basic_salary, symbol), 'earnings'],
    ['Overtime Pay', `(${payroll.overtime_hours || 0} hrs)`, formatMoney(payroll.overtime_amount || payroll.overtime_pay || 0, symbol), 'earnings'],
    ['Bonus', '', formatMoney(payroll.bonus_amount || payroll.bonus || 0, symbol), 'earnings'],
    ['Late Deduction', `(${payroll.late_days || 0} days, ${payroll.late_minutes || 0} min)`, `-${formatMoney(payroll.late_deduction || 0, symbol)}`, 'deduction'],
    ['Leave Deduction', '', `-${formatMoney(payroll.leave_deduction || 0, symbol)}`, 'deduction'],
    ['Other Deductions', '', `-${formatMoney(payroll.deductions || 0, symbol)}`, 'deduction'],
  ];

  tableRows.forEach((row, idx) => {
    const rowY = y + idx * 9;
    doc.setFillColor(idx % 2 === 0 ? 255 : 249, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(margin, rowY, contentW, 9, 'F');
    doc.setDrawColor(230, 230, 235);
    doc.line(margin, rowY + 9, margin + contentW, rowY + 9);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 60);
    doc.text(row[0], margin + 4, rowY + 6);

    if (row[1]) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(120, 120, 130);
      doc.text(row[1], margin + 52, rowY + 6);
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(row[3] === 'deduction' ? 200 : 22, row[3] === 'deduction' ? 50 : 163, row[3] === 'deduction' ? 50 : 74);
    doc.text(row[2], margin + contentW - 4, rowY + 6, { align: 'right' });
  });

  y += tableRows.length * 9;

  // Gross Salary row
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(22, 163, 74);
  doc.rect(margin, y, contentW, 9, 'FD');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74);
  doc.text('Gross Salary', margin + 4, y + 6);
  doc.text(formatMoney(payroll.gross_salary || ((payroll.basic_salary || 0) + (payroll.overtime_amount || payroll.overtime_pay || 0) + (payroll.bonus_amount || payroll.bonus || 0)), symbol), margin + contentW - 4, y + 6, { align: 'right' });
  y += 9;

  // Net Salary highlight
  doc.setFillColor(22, 163, 74);
  doc.rect(margin, y, contentW, 12, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('NET SALARY', margin + 4, y + 8.5);
  doc.text(formatMoney(payroll.net_salary, symbol), margin + contentW - 4, y + 8.5, { align: 'right' });
  y += 18;

  // Attendance Summary
  doc.setFillColor(245, 247, 250);
  doc.setDrawColor(220, 220, 225);
  doc.roundedRect(margin, y, contentW, 26, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 110);
  doc.text('ATTENDANCE SUMMARY', margin + 4, y + 7);

  const attStats = [
    ['Total Days', payroll.total_days || 0],
    ['Present Days', payroll.present_days || 0],
    ['Absent Days', payroll.absent_days || 0],
    ['Late Days', payroll.late_days || 0],
    ['Overtime Hours', `${payroll.overtime_hours || 0}h`],
  ];
  const colWidth = contentW / attStats.length;
  attStats.forEach(([label, val], i) => {
    const ax = margin + i * colWidth + colWidth / 2;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74);
    doc.text(String(val), ax, y + 17, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 110);
    doc.text(label, ax, y + 23, { align: 'center' });
  });
  y += 33;

  // Footer
  doc.setDrawColor(200, 200, 205);
  doc.line(margin, y, margin + contentW, y);
  y += 6;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(140, 140, 150);
  doc.text(`Generated on ${new Date().toLocaleString()} by ${companyName}`, margin, y);
  doc.text('This is a computer-generated payslip and does not require a signature.', margin + contentW, y, { align: 'right' });

  const fileName = `Payslip_${payroll.employee_name?.replace(/\s+/g, '_') || 'Employee'}_${payroll.month}.pdf`;
  doc.save(fileName);
}

export function printPayslip(payroll, companySettings = {}) {
  const symbol = companySettings.currency_symbol || 'Rs';
  const companyName = companySettings.company_name || 'NUTRIMETH';
  const fmt = (v) => `${symbol} ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const html = `<!DOCTYPE html><html><head><title>Payslip - ${payroll.employee_name} - ${payroll.month}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a2e;background:#fff}
    .page{max-width:700px;margin:0 auto;padding:20px}
    .header{background:#16a34a;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:flex-start}
    .header h1{font-size:18px;font-weight:700}
    .header .right{text-align:right;font-size:11px}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-top:none}
    .info-box h3{font-size:9px;font-weight:700;color:#6b7280;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:8px}
    .info-row{display:flex;justify-content:space-between;margin-bottom:4px;font-size:11px}
    .info-row span:first-child{color:#6b7280}
    .info-row span:last-child{font-weight:600}
    .section-title{background:#16a34a;color:#fff;padding:6px 14px;font-size:10px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase}
    .breakdown table{width:100%;border-collapse:collapse}
    .breakdown tr:nth-child(even){background:#f9fafb}
    .breakdown td{padding:7px 14px;border-bottom:1px solid #f0f0f0;font-size:11.5px}
    .breakdown td:last-child{text-align:right;font-weight:600}
    .deduction{color:#dc2626!important}
    .earning{color:#16a34a!important}
    .gross-row{background:#f0fdf4!important;color:#16a34a;font-weight:700}
    .net-row{background:#16a34a!important;color:#fff!important;font-size:13px}
    .net-row td{color:#fff!important;padding:10px 14px!important}
    .attendance{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;padding:14px;background:#f8fafc;border:1px solid #e2e8f0;text-align:center}
    .att-item .val{font-size:18px;font-weight:700;color:#16a34a}
    .att-item .lbl{font-size:9px;color:#6b7280;margin-top:2px}
    .footer{padding:10px 14px;font-size:9px;color:#9ca3af;border-top:1px solid #e2e8f0;text-align:center}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body>
  <div class="page">
    <div class="header">
      <div><h1>${companyName}</h1><div style="font-size:10px;margin-top:4px;opacity:.85">${companySettings.address || ''}</div></div>
      <div class="right"><div style="font-size:14px;font-weight:700">SALARY PAYSLIP</div><div style="margin-top:4px">${payroll.month}</div></div>
    </div>
    <div class="info-grid">
      <div class="info-box">
        <h3>Employee Information</h3>
        <div class="info-row"><span>Name</span><span>${payroll.employee_name || '—'}</span></div>
        <div class="info-row"><span>Department</span><span>${payroll.employee_department || '—'}</span></div>
        <div class="info-row"><span>Role</span><span>${payroll.employee_role || '—'}</span></div>
        <div class="info-row"><span>Email</span><span>${payroll.employee_email || '—'}</span></div>
      </div>
      <div class="info-box">
        <h3>Payroll Information</h3>
        <div class="info-row"><span>Month</span><span>${payroll.month}</span></div>
        <div class="info-row"><span>Status</span><span style="color:${payroll.payment_status==='paid'?'#16a34a':'#d97706'};text-transform:uppercase">${payroll.payment_status || 'Pending'}</span></div>
        <div class="info-row"><span>Paid Date</span><span>${payroll.paid_date || '—'}</span></div>
        <div class="info-row"><span>Generated</span><span>${new Date().toLocaleDateString()}</span></div>
      </div>
    </div>
    <div class="section-title">Salary Breakdown</div>
    <div class="breakdown">
      <table>
        <tr><td>Basic Salary</td><td class="earning">${fmt(payroll.basic_salary)}</td></tr>
        <tr><td>Overtime Pay (${payroll.overtime_hours || 0} hrs)</td><td class="earning">+ ${fmt(payroll.overtime_amount || payroll.overtime_pay || 0)}</td></tr>
        <tr><td>Bonus</td><td class="earning">+ ${fmt(payroll.bonus_amount || payroll.bonus || 0)}</td></tr>
        <tr><td>Late Deduction (${payroll.late_days || 0} days, ${payroll.late_minutes || 0} min)</td><td class="deduction">- ${fmt(payroll.late_deduction || 0)}</td></tr>
        <tr><td>Leave Deduction</td><td class="deduction">- ${fmt(payroll.leave_deduction || 0)}</td></tr>
        <tr><td>Other Deductions</td><td class="deduction">- ${fmt(payroll.deductions || 0)}</td></tr>
        <tr class="gross-row"><td>Gross Salary</td><td>${fmt(payroll.gross_salary || 0)}</td></tr>
        <tr class="net-row"><td><strong>NET SALARY</strong></td><td><strong>${fmt(payroll.net_salary)}</strong></td></tr>
      </table>
    </div>
    <div class="section-title" style="margin-top:12px">Attendance Summary</div>
    <div class="attendance">
      <div class="att-item"><div class="val">${payroll.total_days || 0}</div><div class="lbl">Total Days</div></div>
      <div class="att-item"><div class="val">${payroll.present_days || 0}</div><div class="lbl">Present</div></div>
      <div class="att-item"><div class="val">${payroll.absent_days || 0}</div><div class="lbl">Absent</div></div>
      <div class="att-item"><div class="val">${payroll.late_days || 0}</div><div class="lbl">Late Days</div></div>
      <div class="att-item"><div class="val">${payroll.overtime_hours || 0}h</div><div class="lbl">Overtime</div></div>
    </div>
    <div class="footer">Generated on ${new Date().toLocaleString()} &nbsp;|&nbsp; ${companyName} &nbsp;|&nbsp; This is a computer-generated payslip and does not require a signature.</div>
  </div>
  <script>window.onload=()=>{window.print();}</script>
  </body></html>`;

  const w = window.open('', '_blank', 'width=780,height=900');
  if (w) { w.document.write(html); w.document.close(); }
}