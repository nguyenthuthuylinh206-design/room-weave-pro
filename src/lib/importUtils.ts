import * as XLSX from 'xlsx'

// ============= ITEM IMPORT =============

export interface ItemImportRow {
  sku?: string
  name: string
  category_name?: string
  unit: string
  unit_price: number
  quantity_total: number
  minimum_stock: number
  description?: string
}

export interface CategoryImportRow {
  name: string
  name_en?: string
  code?: string
  description?: string
  icon?: string
  color?: string
  sort_order?: number
}

export interface ImportResult<T> {
  success: boolean
  data: T[]
  errors: { row: number; message: string }[]
  totalRows: number
}

// Download template for Items
export function downloadItemsTemplate() {
  const headers = [
    'Mã SP',
    'Tên sản phẩm (*)',
    'Danh mục',
    'Đơn vị (*)',
    'Đơn giá',
    'Tồn kho (*)',
    'Tồn tối thiểu',
    'Tình trạng',
    'Ghi chú'
  ]
  
  const exampleData = [
    ['KT-001', 'Khăn tắm lớn', 'Đồ vải', 'Cái', 50000, 100, 20, 'Đủ hàng', 'Khăn tắm cotton cao cấp'],
    ['BC-001', 'Bàn chải đánh răng', 'Tiêu hao', 'Cái', 5000, 500, 100, 'Đủ hàng', 'Bàn chải dùng 1 lần'],
    ['AD-001', 'Ấm đun nước', 'Thiết bị', 'Cái', 350000, 50, 5, 'Đủ hàng', 'Ấm siêu tốc 1.8L'],
    ['BG-001', 'Bàn ghế nhà hàng', 'Nội thất', 'Bộ', 2500000, 20, 3, 'Đủ hàng', 'Bàn ghế gỗ sồi'],
    ['DP-001', 'Đồng phục nhân viên', 'Đồng phục', 'Bộ', 450000, 30, 5, 'Đủ hàng', 'Áo sơ mi + quần tây'],
  ]
  
  const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleData])
  
  ws['!cols'] = [
    { wch: 12 }, // Mã SP
    { wch: 25 }, // Tên sản phẩm
    { wch: 15 }, // Danh mục
    { wch: 10 }, // Đơn vị
    { wch: 12 }, // Đơn giá
    { wch: 12 }, // Tồn kho
    { wch: 15 }, // Tồn tối thiểu
    { wch: 12 }, // Tình trạng
    { wch: 30 }, // Ghi chú
  ]
  
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Tài sản')
  
  const instructions = [
    ['HƯỚNG DẪN IMPORT TÀI SẢN'],
    [''],
    ['1. Các cột có dấu (*) là bắt buộc'],
    ['2. Tên sản phẩm: Tối thiểu 2 ký tự, tối đa 200 ký tự'],
    ['3. Đơn vị: VD: Cái, Bộ, Kg, Lít...'],
    ['4. Đơn giá: Số nguyên >= 0'],
    ['5. Tồn kho: Số nguyên >= 0'],
    ['6. Tồn tối thiểu: Số nguyên >= 0 (ngưỡng cảnh báo)'],
    ['7. Danh mục: Nhập tên danh mục. Nếu chưa có sẽ tự động tạo mới'],
    ['8. Mã SP: Không bắt buộc, hệ thống sẽ tự tạo nếu bỏ trống'],
    ['9. Tình trạng: Hệ thống tự tính, không cần nhập'],
    ['10. Sản phẩm trùng tên sẽ được CẬP NHẬT thay vì tạo mới'],
    ['11. Xóa các dòng ví dụ trước khi import'],
  ]
  
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions)
  wsInstructions['!cols'] = [{ wch: 60 }]
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Hướng dẫn')
  
  XLSX.writeFile(wb, `template-tai-san-${Date.now()}.xlsx`)
}

// Download template for Categories
export function downloadCategoriesTemplate() {
  const headers = [
    'Tên danh mục (*)',
    'Tên tiếng Anh',
    'Mã',
    'Mô tả',
    'Icon',
    'Màu (hex)',
    'Thứ tự'
  ]
  
  const exampleData = [
    ['Đồ vải', 'Linen', 'LINEN', 'Khăn, ga, gối', '🧺', '#3B82F6', 1],
    ['Tiêu hao', 'Consumable', 'CONSUMABLE', 'Đồ dùng 1 lần', '🧴', '#10B981', 2],
    ['Thiết bị', 'Equipment', 'EQUIPMENT', 'Thiết bị điện tử', '⚡', '#F59E0B', 3],
    ['Nội thất', 'Furniture', 'FURNITURE', 'Bàn ghế, tủ', '🪑', '#8B5CF6', 4],
  ]
  
  const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleData])
  
  ws['!cols'] = [
    { wch: 20 },
    { wch: 15 },
    { wch: 12 },
    { wch: 25 },
    { wch: 8 },
    { wch: 12 },
    { wch: 10 },
  ]
  
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Danh mục')
  
  const instructions = [
    ['HƯỚNG DẪN IMPORT DANH MỤC'],
    [''],
    ['1. Cột có dấu (*) là bắt buộc'],
    ['2. Tên danh mục: Tối thiểu 2 ký tự'],
    ['3. Mã: Viết hoa, không dấu, VD: LINEN, EQUIPMENT'],
    ['4. Icon: Emoji hoặc tên icon (VD: 📦, Package)'],
    ['5. Màu: Mã hex, VD: #3B82F6'],
    ['6. Xóa các dòng ví dụ trước khi import'],
  ]
  
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions)
  wsInstructions['!cols'] = [{ wch: 50 }]
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Hướng dẫn')
  
  XLSX.writeFile(wb, `template-danh-muc-${Date.now()}.xlsx`)
}

// Parse Items from Excel file
export function parseItemsExcel(file: File): Promise<ImportResult<ItemImportRow>> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
        
        // Skip header row
        const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''))
        const items: ItemImportRow[] = []
        const errors: { row: number; message: string }[] = []
        
        rows.forEach((row, index) => {
          const rowNum = index + 2
          
          const name = String(row[1] || '').trim()
          const unit = String(row[3] || '').trim()
          
          if (!name || name.length < 2) {
            errors.push({ row: rowNum, message: 'Tên sản phẩm bắt buộc (tối thiểu 2 ký tự)' })
            return
          }
          
          if (!unit) {
            errors.push({ row: rowNum, message: 'Đơn vị bắt buộc' })
            return
          }
          
          items.push({
            sku: row[0] ? String(row[0]).trim() : undefined,
            name,
            category_name: row[2] ? String(row[2]).trim() : undefined,
            unit,
            unit_price: Number(row[4]) || 0,
            quantity_total: Number(row[5]) || 0,
            minimum_stock: Number(row[6]) || 0,
            description: row[8] ? String(row[8]).trim() : undefined,
          })
        })
        
        resolve({
          success: errors.length === 0,
          data: items,
          errors,
          totalRows: rows.length,
        })
      } catch (error: any) {
        resolve({
          success: false,
          data: [],
          errors: [{ row: 0, message: `Lỗi đọc file: ${error.message}` }],
          totalRows: 0,
        })
      }
    }
    
    reader.onerror = () => {
      resolve({
        success: false,
        data: [],
        errors: [{ row: 0, message: 'Không thể đọc file' }],
        totalRows: 0,
      })
    }
    
    reader.readAsBinaryString(file)
  })
}

// Parse Categories from Excel file
export function parseCategoriesExcel(file: File): Promise<ImportResult<CategoryImportRow>> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
        
        const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''))
        const categories: CategoryImportRow[] = []
        const errors: { row: number; message: string }[] = []
        
        rows.forEach((row, index) => {
          const rowNum = index + 2
          const name = String(row[0] || '').trim()
          
          if (!name || name.length < 2) {
            errors.push({ row: rowNum, message: 'Tên danh mục bắt buộc (tối thiểu 2 ký tự)' })
            return
          }
          
          categories.push({
            name,
            name_en: row[1] ? String(row[1]).trim() : undefined,
            code: row[2] ? String(row[2]).trim().toUpperCase() : undefined,
            description: row[3] ? String(row[3]).trim() : undefined,
            icon: row[4] ? String(row[4]).trim() : '📦',
            color: row[5] ? String(row[5]).trim() : '#6B7280',
            sort_order: row[6] ? Number(row[6]) : undefined,
          })
        })
        
        resolve({
          success: errors.length === 0,
          data: categories,
          errors,
          totalRows: rows.length,
        })
      } catch (error: any) {
        resolve({
          success: false,
          data: [],
          errors: [{ row: 0, message: `Lỗi đọc file: ${error.message}` }],
          totalRows: 0,
        })
      }
    }
    
    reader.onerror = () => {
      resolve({
        success: false,
        data: [],
        errors: [{ row: 0, message: 'Không thể đọc file' }],
        totalRows: 0,
      })
    }
    
    reader.readAsBinaryString(file)
  })
}
