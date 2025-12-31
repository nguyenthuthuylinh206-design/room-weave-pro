import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, TrendingUp, TrendingDown, Package, ClipboardCheck, Clock, CheckCircle, AlertTriangle, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const MobileOperationsReportPage = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Compact Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/reports')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-sm font-semibold">Báo cáo vận hành</h1>
              <p className="text-[10px] text-muted-foreground">30 ngày gần nhất</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs">
            <Download className="h-3 w-3 mr-1" />
            Excel
          </Button>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Transaction Summary - Compact Grid */}
        <div className="border rounded-lg p-3">
          <h3 className="text-xs font-medium text-muted-foreground mb-2">Tổng quan giao dịch</h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                <span className="text-lg font-bold">125</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Nhập kho</p>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center justify-center gap-1">
                <TrendingDown className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-lg font-bold">98</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Xuất kho</p>
            </div>
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <div className="flex items-center justify-center gap-1">
                <Package className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-lg font-bold">15</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Điều chỉnh</p>
            </div>
          </div>
        </div>

        {/* Top Items - List Style */}
        <div className="border rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b bg-muted/30 flex items-center justify-between">
            <h3 className="text-xs font-medium">Top giao dịch nhiều nhất</h3>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="divide-y">
            {[
              { name: 'Khăn tắm trắng', code: 'KTT-001', in: 45, out: 38 },
              { name: 'Chăn ga gối đệm', code: 'CGGD-001', in: 32, out: 28 },
              { name: 'Dầu gội đầu', code: 'DGD-001', in: 28, out: 25 },
              { name: 'Nước rửa tay', code: 'NRT-001', in: 25, out: 22 },
            ].map((item, index) => (
              <div key={item.code} className="flex items-center gap-2.5 px-3 py-2">
                <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">{item.code}</p>
                </div>
                <div className="flex gap-2.5 text-xs font-medium">
                  <span className="text-green-600">+{item.in}</span>
                  <span className="text-blue-600">-{item.out}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stocktake Results - Compact List */}
        <div className="border rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b bg-muted/30 flex items-center gap-2">
            <ClipboardCheck className="h-3.5 w-3.5 text-blue-600" />
            <h3 className="text-xs font-medium">Kết quả kiểm kê</h3>
          </div>
          <div className="divide-y">
            <div className="flex justify-between items-center px-3 py-2">
              <span className="text-xs text-muted-foreground">Tổng mặt hàng kiểm</span>
              <span className="text-sm font-semibold">125</span>
            </div>
            <div className="flex justify-between items-center px-3 py-2">
              <span className="text-xs text-muted-foreground">Khớp đúng</span>
              <span className="text-sm font-semibold text-green-600">118</span>
            </div>
            <div className="flex justify-between items-center px-3 py-2">
              <span className="text-xs text-muted-foreground">Chênh lệch thừa</span>
              <span className="text-sm font-semibold text-blue-600">4</span>
            </div>
            <div className="flex justify-between items-center px-3 py-2">
              <span className="text-xs text-muted-foreground">Chênh lệch thiếu</span>
              <span className="text-sm font-semibold text-red-600">3</span>
            </div>
          </div>
        </div>

        {/* Efficiency Metrics - Progress Bars */}
        <div className="border rounded-lg p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-purple-600" />
            <h3 className="text-xs font-medium">Hiệu suất vận hành</h3>
          </div>
          
          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  Độ chính xác
                </span>
                <span className="font-semibold text-green-600">94.4%</span>
              </div>
              <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                <div className="bg-green-500 h-full rounded-full" style={{ width: '94.4%' }} />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3 text-blue-600" />
                  Đúng hạn
                </span>
                <span className="font-semibold text-blue-600">88%</span>
              </div>
              <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: '88%' }} />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-600" />
                  Tỷ lệ lỗi
                </span>
                <span className="font-semibold text-amber-600">1.2%</span>
              </div>
              <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: '1.2%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Summary */}
        <div className="border rounded-lg p-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center p-2 bg-muted/30 rounded">
              <p className="text-lg font-bold">2.5h</p>
              <p className="text-[10px] text-muted-foreground">Thời gian xử lý TB</p>
            </div>
            <div className="text-center p-2 bg-muted/30 rounded">
              <p className="text-lg font-bold">85%</p>
              <p className="text-[10px] text-muted-foreground">Năng suất nhân viên</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
