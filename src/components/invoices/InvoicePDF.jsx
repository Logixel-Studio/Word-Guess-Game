import jsPDF from 'jspdf';

const ROWS_PER_PAGE = 8;
const GREEN = '#16a34a';
const cs = (company) => company?.currency_symbol || 'Rs';

function buildInvoicePages(invoice, company) {
  const items = invoice.items || [];
  const totalPages = Math.max(1, Math.ceil(items.length / ROWS_PER_PAGE));
  return Array.from({ length: totalPages }, (_, i) => ({
    items: items.slice(i * ROWS_PER_PAGE, (i + 1) * ROWS_PER_PAGE),
    pageNum: i + 1,
    totalPages,
    isLast: i === totalPages - 1,
  }));
}

function getCompanyField(invoice, company, field) {
  return invoice[`company_${field}`] || company?.[field] || '';
}

// ─── HTML-based print/preview (existing behavior preserved) ──────────────────
export function printInvoice(invoice, companySettings) {
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) { alert('Please allow popups to print invoices.'); return; }

  const company = companySettings || {};
  const isPaid = invoice.payment_status === 'paid';
  const isPartial = invoice.payment_status === 'partial';
  const sym = cs(company);
  const pages = buildInvoicePages(invoice, company);

  const companyName = company.company_name || 'NUTRIMETH';
  const companyAddress = getCompanyField(invoice, company, 'address');
  const companyPhone = getCompanyField(invoice, company, 'phone');
  const companyEmail = getCompanyField(invoice, company, 'email');
  const companyWebsite = getCompanyField(invoice, company, 'website');

  const headerHtml = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid ${GREEN};padding-bottom:14px;margin-bottom:18px">
      <div>
        ${company.logo_url ? `<img src="${company.logo_url}" style="height:48px;margin-bottom:6px;display:block" />` : ''}
        <div style="font-size:20px;font-weight:bold;color:${GREEN}">${companyName}</div>
        ${companyAddress ? `<div style="color:#666;font-size:10px">${companyAddress}</div>` : ''}
        ${companyPhone ? `<div style="color:#666;font-size:10px">Tel: ${companyPhone}</div>` : ''}
        ${companyEmail ? `<div style="color:#666;font-size:10px">${companyEmail}</div>` : ''}
        ${companyWebsite ? `<div style="color:#666;font-size:10px">${companyWebsite}</div>` : ''}
      </div>
      <div style="text-align:right">
        <div style="font-size:18px;font-weight:bold">INVOICE</div>
        <div style="font-size:13px;font-weight:bold;color:${GREEN};margin-top:3px">${invoice.invoice_number || ''}</div>
        <div style="font-size:10px;color:#666;margin-top:6px">
          Type: <strong>${invoice.invoice_type === 'client' ? 'Client Invoice' : 'Supplier Invoice'}</strong><br/>
          Date: <strong>${invoice.invoice_date || ''}</strong>
          ${invoice.due_date ? `<br/>Due: <strong>${invoice.due_date}</strong>` : ''}
        </div>
        <div style="margin-top:6px;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:bold;display:inline-block;background:${isPaid ? '#dcfce7' : isPartial ? '#fef9c3' : '#fee2e2'};color:${isPaid ? GREEN : isPartial ? '#ca8a04' : '#dc2626'}">${(invoice.payment_status || '').toUpperCase()}</div>
      </div>
    </div>
    <div style="margin-bottom:18px">
      <div style="font-size:9px;color:#666;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">${invoice.invoice_type === 'client' ? 'Bill To' : 'From Supplier'}</div>
      <div style="font-weight:bold;font-size:13px">${invoice.party_name || ''}</div>
      ${invoice.party_address ? `<div style="color:#666;font-size:10px">${invoice.party_address}</div>` : ''}
      ${invoice.party_phone ? `<div style="color:#666;font-size:10px">Tel: ${invoice.party_phone}</div>` : ''}
      ${invoice.party_email ? `<div style="color:#666;font-size:10px">${invoice.party_email}</div>` : ''}
    </div>`;

  const tableHeader = `
    <table style="width:100%;border-collapse:collapse;margin-bottom:12px">
      <thead><tr style="background:#f0fdf4;border-bottom:2px solid ${GREEN}">
        <th style="padding:7px;text-align:left;font-size:10px;font-weight:bold;color:${GREEN};width:30px">#</th>
        <th style="padding:7px;text-align:left;font-size:10px;font-weight:bold;color:${GREEN}">Description</th>
        <th style="padding:7px;text-align:right;font-size:10px;font-weight:bold;color:${GREEN};width:50px">Qty</th>
        <th style="padding:7px;text-align:right;font-size:10px;font-weight:bold;color:${GREEN};width:100px">Unit Price</th>
        <th style="padding:7px;text-align:right;font-size:10px;font-weight:bold;color:${GREEN};width:100px">Total</th>
      </tr></thead>`;

  const totalsHtml = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
      <div style="width:240px">
        <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #e5e7eb;font-size:10px"><span style="color:#666">Subtotal</span><span>${sym} ${Number(invoice.subtotal||0).toLocaleString()}</span></div>
        ${invoice.tax_percent > 0 ? `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #e5e7eb;font-size:10px"><span style="color:#666">Tax (${invoice.tax_percent}%)</span><span>${sym} ${Number(invoice.tax_amount||0).toLocaleString()}</span></div>` : ''}
        ${invoice.discount_percent > 0 ? `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #e5e7eb;font-size:10px"><span style="color:#666">Discount (${invoice.discount_percent}%)</span><span>-${sym} ${Number(invoice.discount_amount||0).toLocaleString()}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-weight:bold;font-size:13px;border-top:2px solid ${GREEN};margin-top:3px"><span>Grand Total</span><span style="color:${GREEN}">${sym} ${Number(invoice.grand_total||0).toLocaleString()}</span></div>
        <div style="display:flex;justify-content:space-between;padding:2px 0;font-size:10px"><span style="color:${GREEN}">Paid</span><span style="color:${GREEN}">${sym} ${Number(invoice.paid_amount||0).toLocaleString()}</span></div>
        <div style="display:flex;justify-content:space-between;padding:2px 0;font-size:10px"><span style="color:#dc2626">Remaining</span><span style="color:#dc2626;font-weight:bold">${sym} ${Number(invoice.remaining_amount||0).toLocaleString()}</span></div>
      </div>
    </div>
    ${(invoice.account_number || invoice.iban) ? `<div style="background:#f0fdf4;border-radius:5px;padding:8px;margin-bottom:12px;font-size:10px"><div style="font-weight:bold;margin-bottom:3px;color:${GREEN}">Payment Details</div>${invoice.account_number ? `<div>Account No: <strong>${invoice.account_number}</strong></div>` : ''}${invoice.iban ? `<div>IBAN: <strong>${invoice.iban}</strong></div>` : ''}</div>` : ''}
    ${invoice.notes ? `<div style="margin-bottom:10px;font-size:10px"><div style="font-weight:bold;margin-bottom:2px">Notes</div><div style="color:#666">${invoice.notes}</div></div>` : ''}
    ${invoice.terms ? `<div style="margin-bottom:10px;font-size:10px"><div style="font-weight:bold;margin-bottom:2px">Terms & Conditions</div><div style="color:#666">${invoice.terms}</div></div>` : ''}`;

  const pagesHtml = pages.map(pg => {
    const rowsHtml = pg.items.map((item, i) => `
      <tr style="border-bottom:1px solid #e5e7eb;background:${i % 2 === 0 ? '#fff' : '#f9fafb'}">
        <td style="padding:6px 7px;color:#666;font-size:10px">${pg.pageNum === 1 ? i + 1 : (pg.pageNum - 1) * ROWS_PER_PAGE + i + 1}</td>
        <td style="padding:6px 7px;font-size:10px">${item.description || ''}</td>
        <td style="padding:6px 7px;text-align:right;font-size:10px">${item.qty}</td>
        <td style="padding:6px 7px;text-align:right;font-size:10px">${sym} ${Number(item.unit_price).toLocaleString()}</td>
        <td style="padding:6px 7px;text-align:right;font-weight:bold;font-size:10px">${sym} ${Number(item.total).toLocaleString()}</td>
      </tr>`).join('');

    return `
      <div style="width:210mm;min-height:297mm;padding:18mm;box-sizing:border-box;page-break-after:always;position:relative">
        ${pg.pageNum === 1 ? headerHtml : `
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid ${GREEN};padding-bottom:8px;margin-bottom:12px">
            <div style="font-size:14px;font-weight:bold;color:${GREEN}">${companyName}</div>
            <div style="font-size:11px;color:#666">${invoice.invoice_number} &mdash; ${invoice.invoice_type === 'client' ? invoice.party_name : invoice.party_name}</div>
          </div>`}
        ${tableHeader}<tbody>${rowsHtml}</tbody></table>
        ${pg.isLast ? totalsHtml : ''}
        <div style="position:absolute;bottom:12mm;left:18mm;right:18mm;border-top:1px solid #e5e7eb;padding-top:6px;font-size:9px;color:#999;display:flex;justify-content:space-between">
          <span>Generated by ${companyName} ERP</span>
          <span>Page ${pg.pageNum} of ${pg.totalPages}</span>
          <span>Printed: ${new Date().toLocaleDateString()}</span>
        </div>
      </div>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><title>${invoice.invoice_number}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;color:#1a1a1a}@media print{.no-print{display:none}@page{size:A4 portrait;margin:0}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>
    </head><body>${pagesHtml}
    <div class="no-print" style="position:fixed;top:10px;right:10px;display:flex;gap:8px;z-index:9999">
      <button onclick="window.print()" style="padding:8px 16px;background:${GREEN};color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">Print</button>
      <button onclick="window.close()" style="padding:8px 16px;background:#6b7280;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">Close</button>
    </div>
    </body></html>`;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 600);
}

// ─── Direct PDF download using jsPDF ─────────────────────────────────────────
export async function downloadInvoicePDF(invoice, companySettings) {
  const company = companySettings || {};
  const sym = cs(company);
  const isPaid = invoice.payment_status === 'paid';
  const isPartial = invoice.payment_status === 'partial';
  const pages = buildInvoicePages(invoice, company);

  const companyName = company.company_name || 'NUTRIMETH';
  const companyAddress = getCompanyField(invoice, company, 'address');
  const companyPhone = getCompanyField(invoice, company, 'phone');
  const companyEmail = getCompanyField(invoice, company, 'email');
  const companyWebsite = getCompanyField(invoice, company, 'website');

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const W = 210;
  const marginX = 18;
  const contentW = W - marginX * 2;

  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  };

  const setColor = (hex) => {
    const [r, g, b] = hexToRgb(hex);
    doc.setTextColor(r, g, b);
  };

  const setDrawColor = (hex) => {
    const [r, g, b] = hexToRgb(hex);
    doc.setDrawColor(r, g, b);
  };

  const setFillColor = (hex) => {
    const [r, g, b] = hexToRgb(hex);
    doc.setFillColor(r, g, b);
  };

  for (let pi = 0; pi < pages.length; pi++) {
    const pg = pages[pi];
    if (pi > 0) doc.addPage();

    let y = 18;

    // ── Header ──────────────────────────────────────────────────────────────
    if (pi === 0) {
      // Company info (left)
      setColor(GREEN);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(companyName, marginX, y);
      y += 6;
      setColor('#666666');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      if (companyAddress) { doc.text(companyAddress, marginX, y); y += 4; }
      if (companyPhone) { doc.text(`Tel: ${companyPhone}`, marginX, y); y += 4; }
      if (companyEmail) { doc.text(companyEmail, marginX, y); y += 4; }
      if (companyWebsite) { doc.text(companyWebsite, marginX, y); y += 4; }

      // Invoice info (right)
      const rightX = W - marginX;
      let ry = 18;
      setColor('#1a1a1a');
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('INVOICE', rightX, ry, { align: 'right' });
      ry += 6;
      setColor(GREEN);
      doc.setFontSize(11);
      doc.text(invoice.invoice_number || '', rightX, ry, { align: 'right' });
      ry += 5;
      setColor('#666666');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Type: ${invoice.invoice_type === 'client' ? 'Client Invoice' : 'Supplier Invoice'}`, rightX, ry, { align: 'right' }); ry += 4;
      doc.text(`Date: ${invoice.invoice_date || ''}`, rightX, ry, { align: 'right' }); ry += 4;
      if (invoice.due_date) { doc.text(`Due: ${invoice.due_date}`, rightX, ry, { align: 'right' }); ry += 4; }

      // Payment status badge
      const statusBg = isPaid ? '#dcfce7' : isPartial ? '#fef9c3' : '#fee2e2';
      const statusFg = isPaid ? GREEN : isPartial ? '#ca8a04' : '#dc2626';
      const statusText = (invoice.payment_status || '').toUpperCase();
      const badgeW = 22;
      setFillColor(statusBg);
      setDrawColor(statusBg);
      doc.roundedRect(rightX - badgeW, ry, badgeW, 6, 1, 1, 'F');
      setColor(statusFg);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(statusText, rightX - badgeW / 2, ry + 4, { align: 'center' });

      // Divider
      y = Math.max(y, ry) + 8;
      setDrawColor(GREEN);
      doc.setLineWidth(0.8);
      doc.line(marginX, y, W - marginX, y);
      y += 8;

      // Party info
      setColor('#999999');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text((invoice.invoice_type === 'client' ? 'BILL TO' : 'FROM SUPPLIER'), marginX, y);
      y += 4;
      setColor('#1a1a1a');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(invoice.party_name || '', marginX, y);
      y += 5;
      setColor('#666666');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      if (invoice.party_address) { doc.text(invoice.party_address, marginX, y); y += 4; }
      if (invoice.party_phone) { doc.text(`Tel: ${invoice.party_phone}`, marginX, y); y += 4; }
      if (invoice.party_email) { doc.text(invoice.party_email, marginX, y); y += 4; }
      y += 4;
    } else {
      // Compact header for continuation pages
      setColor(GREEN);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(companyName, marginX, y);
      setColor('#666666');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`${invoice.invoice_number} — ${invoice.party_name || ''}`, W - marginX, y, { align: 'right' });
      y += 4;
      setDrawColor(GREEN);
      doc.setLineWidth(0.5);
      doc.line(marginX, y, W - marginX, y);
      y += 6;
    }

    // ── Items Table Header ───────────────────────────────────────────────────
    setFillColor('#f0fdf4');
    setDrawColor(GREEN);
    doc.setLineWidth(0.5);
    doc.rect(marginX, y, contentW, 8, 'F');
    doc.line(marginX, y + 8, marginX + contentW, y + 8);

    setColor(GREEN);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const colWidths = [10, contentW - 10 - 15 - 35 - 35, 15, 35, 35];
    const colX = [marginX, marginX + 10, marginX + 10 + colWidths[1], marginX + 10 + colWidths[1] + 15, marginX + 10 + colWidths[1] + 15 + 35];
    doc.text('#', colX[0] + 1, y + 5.5);
    doc.text('Description', colX[1] + 1, y + 5.5);
    doc.text('Qty', colX[2] + colWidths[2], y + 5.5, { align: 'right' });
    doc.text('Unit Price', colX[3] + colWidths[3], y + 5.5, { align: 'right' });
    doc.text('Total', colX[4] + colWidths[4], y + 5.5, { align: 'right' });
    y += 8;

    // ── Items Rows ───────────────────────────────────────────────────────────
    pg.items.forEach((item, i) => {
      const globalIdx = (pg.pageNum - 1) * ROWS_PER_PAGE + i + 1;
      const rowBg = i % 2 === 0 ? '#ffffff' : '#f9fafb';
      setFillColor(rowBg);
      setDrawColor('#e5e7eb');
      doc.setLineWidth(0.2);
      doc.rect(marginX, y, contentW, 8, 'F');
      doc.line(marginX, y + 8, marginX + contentW, y + 8);

      setColor('#666666');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(String(globalIdx), colX[0] + 1, y + 5.5);

      setColor('#1a1a1a');
      const desc = String(item.description || '');
      const truncated = desc.length > 45 ? desc.slice(0, 42) + '...' : desc;
      doc.text(truncated, colX[1] + 1, y + 5.5);

      doc.text(String(item.qty), colX[2] + colWidths[2], y + 5.5, { align: 'right' });
      doc.text(`${sym} ${Number(item.unit_price).toLocaleString()}`, colX[3] + colWidths[3], y + 5.5, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(`${sym} ${Number(item.total).toLocaleString()}`, colX[4] + colWidths[4], y + 5.5, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      y += 8;
    });

    y += 6;

    // ── Totals (last page only) ──────────────────────────────────────────────
    if (pg.isLast) {
      const totX = W - marginX - 70;

      const addTotalRow = (label, value, bold = false, color = '#1a1a1a') => {
        setColor('#666666');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(label, totX, y);
        setColor(color);
        if (bold) doc.setFont('helvetica', 'bold');
        doc.text(value, W - marginX, y, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        y += 5;
      };

      setDrawColor('#e5e7eb');
      doc.setLineWidth(0.2);
      doc.line(totX, y, W - marginX, y);
      y += 4;

      addTotalRow('Subtotal', `${sym} ${Number(invoice.subtotal || 0).toLocaleString()}`);
      if (invoice.tax_percent > 0) addTotalRow(`Tax (${invoice.tax_percent}%)`, `${sym} ${Number(invoice.tax_amount || 0).toLocaleString()}`);
      if (invoice.discount_percent > 0) addTotalRow(`Discount (${invoice.discount_percent}%)`, `-${sym} ${Number(invoice.discount_amount || 0).toLocaleString()}`);

      setDrawColor(GREEN);
      doc.setLineWidth(0.6);
      doc.line(totX, y, W - marginX, y);
      y += 2;

      setColor(GREEN);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Grand Total', totX, y + 5);
      doc.text(`${sym} ${Number(invoice.grand_total || 0).toLocaleString()}`, W - marginX, y + 5, { align: 'right' });
      y += 10;

      addTotalRow('Paid Amount', `${sym} ${Number(invoice.paid_amount || 0).toLocaleString()}`, true, GREEN);
      addTotalRow('Remaining', `${sym} ${Number(invoice.remaining_amount || 0).toLocaleString()}`, true, '#dc2626');

      y += 4;

      // Bank details
      if (invoice.account_number || invoice.iban) {
        setFillColor('#f0fdf4');
        setDrawColor('#dcfce7');
        doc.setLineWidth(0.2);
        const bankH = (invoice.account_number ? 5 : 0) + (invoice.iban ? 5 : 0) + 10;
        doc.rect(marginX, y, contentW, bankH, 'FD');
        setColor(GREEN);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Payment Details', marginX + 2, y + 5);
        y += 8;
        setColor('#1a1a1a');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        if (invoice.account_number) { doc.text(`Account No: ${invoice.account_number}`, marginX + 2, y); y += 5; }
        if (invoice.iban) { doc.text(`IBAN: ${invoice.iban}`, marginX + 2, y); y += 5; }
        y += 4;
      }

      // Notes
      if (invoice.notes) {
        setColor('#1a1a1a');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Notes', marginX, y); y += 4;
        doc.setFont('helvetica', 'normal');
        setColor('#666666');
        const lines = doc.splitTextToSize(invoice.notes, contentW);
        doc.text(lines, marginX, y);
        y += lines.length * 4 + 4;
      }

      // Terms
      if (invoice.terms) {
        setColor('#1a1a1a');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Terms & Conditions', marginX, y); y += 4;
        doc.setFont('helvetica', 'normal');
        setColor('#666666');
        const lines = doc.splitTextToSize(invoice.terms, contentW);
        doc.text(lines, marginX, y);
      }
    }

    // ── Footer ───────────────────────────────────────────────────────────────
    setDrawColor('#e5e7eb');
    doc.setLineWidth(0.2);
    doc.line(marginX, 282, W - marginX, 282);
    setColor('#999999');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated by ${companyName} ERP`, marginX, 287);
    doc.text(`Page ${pg.pageNum} of ${pg.totalPages}`, W / 2, 287, { align: 'center' });
    doc.text(`Printed: ${new Date().toLocaleDateString()}`, W - marginX, 287, { align: 'right' });
  }

  // Build filename
  const partySlug = (invoice.party_name || 'Party').replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30);
  const typeSlug = invoice.invoice_type === 'client' ? 'CLIENT' : 'SUPPLIER';
  const filename = `${typeSlug}-${invoice.invoice_number || 'INV'}-${partySlug}.pdf`;

  doc.save(filename);
}