import jsPDF from 'jspdf'
import { GuestInvoice } from '@/hooks/useGuestInvoices'

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

export function generateInvoicePDF(invoice: GuestInvoice, hotelInfo?: { name?: string; address?: string; phone?: string; taxCode?: string }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 15

  // Header - Hotel Info
  doc.setFontSize(14)
  doc.text(hotelInfo?.name || 'KHÁCH SẠN', pageWidth / 2, y, { align: 'center' })
  y += 6
  doc.setFontSize(8)
  if (hotelInfo?.address) { doc.text(hotelInfo.address, pageWidth / 2, y, { align: 'center' }); y += 4 }
  if (hotelInfo?.phone) { doc.text(`DT: ${hotelInfo.phone}`, pageWidth / 2, y, { align: 'center' }); y += 4 }
  if (hotelInfo?.taxCode) { doc.text(`MST: ${hotelInfo.taxCode}`, pageWidth / 2, y, { align: 'center' }); y += 4 }

  y += 4
  doc.setFontSize(16)
  doc.text('HOA DON THANH TOAN', pageWidth / 2, y, { align: 'center' })
  y += 5
  doc.setFontSize(9)
  doc.text(`So: ${invoice.invoice_number}`, pageWidth / 2, y, { align: 'center' })
  y += 8

  // Guest Info
  doc.setFontSize(10)
  const leftX = 15
  const rightX = pageWidth - 15

  doc.text(`Khach hang: ${invoice.guest_name}`, leftX, y)
  y += 5
  if (invoice.guest_phone) { doc.text(`SDT: ${invoice.guest_phone}`, leftX, y); y += 5 }
  if (invoice.guest_address) { doc.text(`Dia chi: ${invoice.guest_address}`, leftX, y); y += 5 }
  if (invoice.guest_tax_code) { doc.text(`MST: ${invoice.guest_tax_code}`, leftX, y); y += 5 }
  if (invoice.company_name) { doc.text(`Cong ty: ${invoice.company_name}`, leftX, y); y += 5 }
  if (invoice.room_number) { doc.text(`Phong: ${invoice.room_number}`, leftX, y); y += 5 }

  if (invoice.check_in_date && invoice.check_out_date) {
    doc.text(`Thoi gian: ${invoice.check_in_date} -> ${invoice.check_out_date}`, leftX, y)
    y += 5
  }

  y += 3
  // Line separator
  doc.line(leftX, y, rightX, y)
  y += 5

  // Table header
  doc.setFontSize(9)
  doc.text('STT', leftX, y)
  doc.text('Noi dung', leftX + 12, y)
  doc.text('SL', leftX + 100, y, { align: 'right' })
  doc.text('Don gia', leftX + 130, y, { align: 'right' })
  doc.text('Thanh tien', rightX, y, { align: 'right' })
  y += 3
  doc.line(leftX, y, rightX, y)
  y += 5

  // Line items
  const lineItems = invoice.line_items || []
  lineItems.forEach((item, index) => {
    doc.text(`${index + 1}`, leftX, y)
    doc.text(item.description || '', leftX + 12, y)
    doc.text(`${item.quantity}`, leftX + 100, y, { align: 'right' })
    doc.text(formatVND(item.unit_price), leftX + 130, y, { align: 'right' })
    doc.text(formatVND(item.amount), rightX, y, { align: 'right' })
    y += 5
  })

  y += 2
  doc.line(leftX, y, rightX, y)
  y += 5

  // Totals
  const labelX = leftX + 90
  doc.text('Tam tinh:', labelX, y); doc.text(formatVND(invoice.subtotal), rightX, y, { align: 'right' }); y += 5
  if (invoice.vat_amount > 0) {
    doc.text(`VAT (${(invoice.vat_rate * 100).toFixed(0)}%):`, labelX, y); doc.text(formatVND(invoice.vat_amount), rightX, y, { align: 'right' }); y += 5
  }
  if (invoice.service_fee_amount > 0) {
    doc.text(`Phi dich vu (${(invoice.service_fee_rate * 100).toFixed(0)}%):`, labelX, y); doc.text(formatVND(invoice.service_fee_amount), rightX, y, { align: 'right' }); y += 5
  }

  doc.setFontSize(11)
  doc.text('TONG CONG:', labelX, y); doc.text(formatVND(invoice.total_amount), rightX, y, { align: 'right' }); y += 6
  doc.setFontSize(9)

  if (invoice.deposit_amount > 0) {
    doc.text('Da coc:', labelX, y); doc.text(formatVND(invoice.deposit_amount), rightX, y, { align: 'right' }); y += 5
  }
  if (invoice.amount_paid > 0) {
    doc.text('Da thanh toan:', labelX, y); doc.text(formatVND(invoice.amount_paid), rightX, y, { align: 'right' }); y += 5
  }
  const remaining = invoice.total_amount - invoice.amount_paid
  if (remaining > 0) {
    doc.text('Con lai:', labelX, y); doc.text(formatVND(remaining), rightX, y, { align: 'right' }); y += 5
  }

  // Footer signatures
  y += 10
  doc.text('Thu ngan', leftX + 20, y, { align: 'center' })
  doc.text('Khach hang', rightX - 20, y, { align: 'center' })

  // Save
  doc.save(`${invoice.invoice_number}.pdf`)
}
