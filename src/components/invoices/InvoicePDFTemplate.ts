import { GuestInvoice } from '@/hooks/useGuestInvoices'

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

/**
 * Generate invoice PDF using html2canvas + jsPDF for proper Vietnamese Unicode support.
 * vat_rate and service_fee_rate are stored as decimals (0.1 = 10%)
 */
export async function generateInvoicePDF(
  invoice: GuestInvoice,
  hotelInfo?: { name?: string; address?: string; phone?: string; taxCode?: string }
) {
  const lineItems = invoice.line_items || []
  const remaining = invoice.total_amount - invoice.amount_paid

  // Build HTML template
  const html = `
    <div id="invoice-pdf" style="width:794px;padding:40px 50px;font-family:'Segoe UI',Roboto,Arial,sans-serif;font-size:13px;color:#111;background:#fff;">
      <div style="text-align:center;margin-bottom:8px;">
        <div style="font-size:18px;font-weight:700;">${hotelInfo?.name || 'KHÁCH SẠN'}</div>
        ${hotelInfo?.address ? `<div style="font-size:11px;color:#555;">${hotelInfo.address}</div>` : ''}
        ${hotelInfo?.phone ? `<div style="font-size:11px;color:#555;">ĐT: ${hotelInfo.phone}</div>` : ''}
        ${hotelInfo?.taxCode ? `<div style="font-size:11px;color:#555;">MST: ${hotelInfo.taxCode}</div>` : ''}
      </div>
      <div style="text-align:center;margin:16px 0 12px;">
        <div style="font-size:20px;font-weight:700;">HÓA ĐƠN THANH TOÁN</div>
        <div style="font-size:12px;color:#555;">Số: ${invoice.invoice_number}</div>
      </div>

      <div style="margin-bottom:12px;line-height:1.8;">
        <div><b>Khách hàng:</b> ${invoice.guest_name}</div>
        ${invoice.guest_phone ? `<div><b>SĐT:</b> ${invoice.guest_phone}</div>` : ''}
        ${invoice.guest_address ? `<div><b>Địa chỉ:</b> ${invoice.guest_address}</div>` : ''}
        ${invoice.guest_tax_code ? `<div><b>MST:</b> ${invoice.guest_tax_code}</div>` : ''}
        ${invoice.company_name ? `<div><b>Công ty:</b> ${invoice.company_name}</div>` : ''}
        ${invoice.room_number ? `<div><b>Phòng:</b> ${invoice.room_number}</div>` : ''}
        ${invoice.check_in_date && invoice.check_out_date ? `<div><b>Thời gian:</b> ${invoice.check_in_date} → ${invoice.check_out_date}</div>` : ''}
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
        <thead>
          <tr style="border-bottom:2px solid #333;">
            <th style="text-align:left;padding:6px 4px;width:40px;">STT</th>
            <th style="text-align:left;padding:6px 4px;">Nội dung</th>
            <th style="text-align:right;padding:6px 4px;width:50px;">SL</th>
            <th style="text-align:right;padding:6px 4px;width:110px;">Đơn giá</th>
            <th style="text-align:right;padding:6px 4px;width:120px;">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          ${lineItems.map((item, i) => `
            <tr style="border-bottom:1px solid #ddd;">
              <td style="padding:5px 4px;">${i + 1}</td>
              <td style="padding:5px 4px;">${item.description || ''}</td>
              <td style="text-align:right;padding:5px 4px;">${item.quantity}</td>
              <td style="text-align:right;padding:5px 4px;font-family:monospace;">${formatVND(item.unit_price)}</td>
              <td style="text-align:right;padding:5px 4px;font-family:monospace;">${formatVND(item.amount)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="display:flex;justify-content:flex-end;">
        <div style="width:300px;">
          <div style="display:flex;justify-content:space-between;padding:3px 0;">
            <span>Tạm tính:</span><span style="font-family:monospace;">${formatVND(invoice.subtotal)}</span>
          </div>
          ${invoice.vat_amount > 0 ? `
            <div style="display:flex;justify-content:space-between;padding:3px 0;">
              <span>VAT (${Math.round(invoice.vat_rate * 100)}%):</span><span style="font-family:monospace;">${formatVND(invoice.vat_amount)}</span>
            </div>` : ''}
          ${invoice.service_fee_amount > 0 ? `
            <div style="display:flex;justify-content:space-between;padding:3px 0;">
              <span>Phí dịch vụ (${Math.round(invoice.service_fee_rate * 100)}%):</span><span style="font-family:monospace;">${formatVND(invoice.service_fee_amount)}</span>
            </div>` : ''}
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-top:2px solid #333;font-size:15px;font-weight:700;">
            <span>TỔNG CỘNG:</span><span style="font-family:monospace;">${formatVND(invoice.total_amount)}</span>
          </div>
          ${invoice.deposit_amount > 0 ? `
            <div style="display:flex;justify-content:space-between;padding:3px 0;">
              <span>Đã cọc:</span><span style="font-family:monospace;">${formatVND(invoice.deposit_amount)}</span>
            </div>` : ''}
          ${invoice.amount_paid > 0 ? `
            <div style="display:flex;justify-content:space-between;padding:3px 0;">
              <span>Đã thanh toán:</span><span style="font-family:monospace;">${formatVND(invoice.amount_paid)}</span>
            </div>` : ''}
          ${remaining > 0 ? `
            <div style="display:flex;justify-content:space-between;padding:3px 0;color:#c00;font-weight:600;">
              <span>Còn lại:</span><span style="font-family:monospace;">${formatVND(remaining)}</span>
            </div>` : ''}
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;margin-top:50px;text-align:center;">
        <div style="width:200px;">
          <div style="font-weight:600;">Thu ngân</div>
          <div style="font-size:11px;color:#888;margin-top:4px;">(Ký, ghi rõ họ tên)</div>
        </div>
        <div style="width:200px;">
          <div style="font-weight:600;">Khách hàng</div>
          <div style="font-size:11px;color:#888;margin-top:4px;">(Ký, ghi rõ họ tên)</div>
        </div>
      </div>
    </div>
  `

  // Create off-screen container
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.innerHTML = html
  document.body.appendChild(container)

  try {
    const { default: html2canvas } = await import('html2canvas')
    const { default: jsPDF } = await import('jspdf')

    const element = container.querySelector('#invoice-pdf') as HTMLElement
    const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#fff' })

    const imgWidth = 210 // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight)
    doc.save(`${invoice.invoice_number}.pdf`)
  } finally {
    document.body.removeChild(container)
  }
}
