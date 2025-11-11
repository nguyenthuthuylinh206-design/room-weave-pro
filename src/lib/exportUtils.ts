import * as XLSX from 'xlsx'
import { ItemWithCategory } from '@/types/items.types'

export function exportItemsToExcel(items: any[], filename: string = 'items-export') {
  if (!items || items.length === 0) {
    throw new Error('Không có dữ liệu để xuất')
  }

  // Format data for Excel
  const excelData = items.map((item, index) => ({
    'STT': index + 1,
    'Mã': item.code,
    'Tên tài sản': item.name,
    'Danh mục': item.category_name || item.item_categories?.name || 'N/A',
    'Đơn vị': item.unit,
    'Đơn giá': item.unit_price,
    'Tổng SL': item.quantity_total || 0,
    'SL khả dụng': item.quantity_available || 0,
    'SL đã phân bổ': item.quantity_allocated || 0,
    'Tồn kho tối thiểu': item.minimum_stock || 0,
    'Trạng thái kho': getStockStatusLabel(item.stock_status),
    'Trạng thái': item.status === 'active' ? 'Đang sử dụng' : 'Ngừng sử dụng',
    'Thương hiệu': item.brand || '',
    'Model': item.model || '',
    'Ngày tạo': new Date(item.created_at).toLocaleDateString('vi-VN'),
  }))

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(excelData)

  // Set column widths
  const columnWidths = [
    { wch: 5 },  // STT
    { wch: 15 }, // Mã
    { wch: 30 }, // Tên
    { wch: 20 }, // Danh mục
    { wch: 10 }, // Đơn vị
    { wch: 12 }, // Đơn giá
    { wch: 10 }, // Tổng SL
    { wch: 12 }, // SL khả dụng
    { wch: 15 }, // SL phân bổ
    { wch: 15 }, // Tồn kho tối thiểu
    { wch: 15 }, // Trạng thái kho
    { wch: 15 }, // Trạng thái
    { wch: 15 }, // Thương hiệu
    { wch: 15 }, // Model
    { wch: 15 }, // Ngày tạo
  ]
  worksheet['!cols'] = columnWidths

  // Create workbook
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách tài sản')

  // Add summary sheet
  const summary = {
    'Tổng số tài sản': items.length,
    'Tổng giá trị': items.reduce((sum, item) => sum + (item.unit_price * (item.quantity_total || 0)), 0),
    'Số lượng tổng': items.reduce((sum, item) => sum + (item.quantity_total || 0), 0),
    'Số lượng khả dụng': items.reduce((sum, item) => sum + (item.quantity_available || 0), 0),
    'Ngày xuất': new Date().toLocaleString('vi-VN'),
  }

  const summarySheet = XLSX.utils.json_to_sheet([summary])
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Tóm tắt')

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const finalFilename = `${filename}_${timestamp}.xlsx`

  // Download file
  XLSX.writeFile(workbook, finalFilename)

  return finalFilename
}

function getStockStatusLabel(status: string): string {
  switch (status) {
    case 'in_stock':
      return 'Đủ hàng'
    case 'low_stock':
      return 'Thấp'
    case 'out_of_stock':
      return 'Hết hàng'
    default:
      return status || 'N/A'
  }
}

// Export for other data types (can be extended)
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  filename: string,
  sheetName: string = 'Sheet1'
) {
  if (!data || data.length === 0) {
    throw new Error('Không có dữ liệu để xuất')
  }

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const finalFilename = `${filename}_${timestamp}.xlsx`

  XLSX.writeFile(workbook, finalFilename)

  return finalFilename
}

