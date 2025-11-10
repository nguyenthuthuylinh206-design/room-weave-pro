import { useState } from 'react'
import { useToast } from './use-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import html2canvas from 'html2canvas'

export function useReportExport() {
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()
  
  const exportToPDF = async (
    reportData: any,
    reportType: string,
    chartElements?: HTMLElement[]
  ) => {
    setIsExporting(true)
    
    try {
      const doc = new jsPDF('l', 'mm', 'a4')
      
      // Header
      doc.setFontSize(18)
      doc.text(reportData.title || 'Báo cáo', 148, 20, { align: 'center' })
      
      doc.setFontSize(10)
      doc.text(
        `Kỳ báo cáo: ${reportData.dateRange}`,
        148,
        28,
        { align: 'center' }
      )
      
      // Summary section
      let y = 40
      doc.setFontSize(14)
      doc.text('Tóm tắt', 20, y)
      y += 10
      
      doc.setFontSize(10)
      if (reportData.summary) {
        Object.entries(reportData.summary).forEach(([key, value]) => {
          doc.text(`${formatLabel(key)}: ${formatValue(value)}`, 20, y)
          y += 6
        })
      }
      
      // Tables
      if (reportData.tables) {
        for (const table of reportData.tables) {
          y += 10
          doc.setFontSize(12)
          doc.text(table.title, 20, y)
          y += 5
          
          autoTable(doc, {
            startY: y,
            head: [table.headers],
            body: table.rows,
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [66, 139, 202] },
            margin: { left: 20, right: 20 },
          })
          
          y = (doc as any).lastAutoTable.finalY + 10
          
          if (y > 180) {
            doc.addPage()
            y = 20
          }
        }
      }
      
      // Charts as images
      if (chartElements && chartElements.length > 0) {
        for (const chartElement of chartElements) {
          doc.addPage()
          const canvas = await html2canvas(chartElement, {
            scale: 2,
            backgroundColor: '#ffffff',
          })
          const imgData = canvas.toDataURL('image/png')
          const imgWidth = 257
          const imgHeight = (canvas.height * imgWidth) / canvas.width
          doc.addImage(imgData, 'PNG', 20, 20, imgWidth, imgHeight)
        }
      }
      
      // Footer with page numbers
      const pageCount = doc.internal.pages.length - 1
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.text(
          `Trang ${i} / ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        )
        doc.text(
          `Xuất lúc: ${new Date().toLocaleString('vi-VN')}`,
          20,
          doc.internal.pageSize.getHeight() - 10
        )
      }
      
      const filename = `${reportType}_${formatDate(new Date())}.pdf`
      doc.save(filename)
      
      toast({
        title: 'Thành công',
        description: 'Đã xuất báo cáo PDF',
      })
    } catch (error) {
      console.error('PDF export error:', error)
      toast({
        title: 'Lỗi',
        description: 'Không thể xuất PDF',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }
  
  const exportToExcel = (reportData: any, reportType: string) => {
    setIsExporting(true)
    
    try {
      const wb = XLSX.utils.book_new()
      
      // Summary sheet
      if (reportData.summary) {
        const summaryData = Object.entries(reportData.summary).map(([k, v]) => ({
          'Chỉ số': formatLabel(k),
          'Giá trị': formatValue(v),
        }))
        const ws1 = XLSX.utils.json_to_sheet(summaryData)
        
        // Set column widths
        ws1['!cols'] = [{ wch: 30 }, { wch: 20 }]
        
        XLSX.utils.book_append_sheet(wb, ws1, 'Tóm tắt')
      }
      
      // Detail sheets
      if (reportData.tables) {
        reportData.tables.forEach((table: any) => {
          const ws = XLSX.utils.aoa_to_sheet([
            table.headers,
            ...table.rows,
          ])
          
          // Auto-size columns
          const maxWidth = table.headers.map((_: any, i: number) => {
            const columnData = [
              table.headers[i],
              ...table.rows.map((row: any[]) => row[i]),
            ]
            return Math.max(
              ...columnData.map((cell: any) => 
                cell ? cell.toString().length : 10
              )
            )
          })
          
          ws['!cols'] = maxWidth.map((w: number) => ({ wch: Math.min(w + 2, 50) }))
          
          XLSX.utils.book_append_sheet(
            wb,
            ws,
            table.title.substring(0, 31) // Excel sheet name limit
          )
        })
      }
      
      // Chart data sheet
      if (reportData.chartData) {
        const ws = XLSX.utils.json_to_sheet(reportData.chartData)
        XLSX.utils.book_append_sheet(wb, ws, 'Dữ liệu biểu đồ')
      }
      
      const filename = `${reportType}_${formatDate(new Date())}.xlsx`
      XLSX.writeFile(wb, filename)
      
      toast({
        title: 'Thành công',
        description: 'Đã xuất báo cáo Excel',
      })
    } catch (error) {
      console.error('Excel export error:', error)
      toast({
        title: 'Lỗi',
        description: 'Không thể xuất Excel',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }
  
  return {
    exportToPDF,
    exportToExcel,
    isExporting,
  }
}

function formatLabel(key: string): string {
  const labels: Record<string, string> = {
    total_value: 'Tổng giá trị',
    total_items: 'Tổng items',
    total_types: 'Tổng loại',
    low_stock_count: 'Tồn kho thấp',
    utilization_rate: 'Tỷ lệ sử dụng',
    total_cost: 'Tổng chi phí',
    purchase_cost: 'Chi phí mua sắm',
    laundry_cost: 'Chi phí giặt là',
    maintenance_cost: 'Chi phí bảo trì',
  }
  
  return labels[key] || key
}

function formatValue(value: any): string {
  if (typeof value === 'number') {
    if (value > 1000000) {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(value)
    }
    return value.toLocaleString('vi-VN')
  }
  return String(value)
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}
