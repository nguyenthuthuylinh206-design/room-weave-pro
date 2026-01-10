import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MobileDetailHeader } from '@/components/layout/MobileDetailHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Package, TrendingUp, AlertCircle, Download, ClipboardCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

const REPORT_TYPES = [
  { id: 'current', label: 'Tồn kho hiện tại' },
  { id: 'abc', label: 'Phân tích ABC' },
  { id: 'turnover', label: 'Vòng quay kho' },
  { id: 'stock-audit', label: 'Kiểm kê' },
]

export const MobileInventoryReportPage = () => {
  const navigate = useNavigate()
  const [reportType, setReportType] = useState('current')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const handleExport = () => {
    console.log('Export inventory report')
  }

  const handleReportTypeChange = (typeId: string) => {
    if (typeId === 'stock-audit') {
      navigate('/reports/stock-audit')
    } else {
      setReportType(typeId)
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileDetailHeader
        title="Báo cáo tồn kho"
        showBack
      />

      <div className="p-4 space-y-4">
        {/* Date Range */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-2">
              <Label>Từ ngày</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Đến ngày</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Report Type Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {REPORT_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => handleReportTypeChange(type.id)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                reportType === type.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground'
              )}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <Package className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">125</p>
              <p className="text-xs text-muted-foreground">Tổng mặt hàng</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold">8.5K</p>
              <p className="text-xs text-muted-foreground">Tổng số lượng</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <AlertCircle className="h-5 w-5 mx-auto mb-1 text-red-500" />
              <p className="text-2xl font-bold">12</p>
              <p className="text-xs text-muted-foreground">Dưới tối thiểu</p>
            </CardContent>
          </Card>
        </div>

        {/* Report Content */}
        {reportType === 'current' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tồn kho hiện tại theo danh mục</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              {['Đồ dùng phòng', 'Đồ giặt là', 'Vật tư'].map((category) => (
                <div key={category} className="flex justify-between items-center py-2 border-b last:border-0">
                  <span className="font-medium">{category}</span>
                  <span className="text-primary font-semibold">250</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {reportType === 'abc' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Phân tích ABC</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Nhóm A (80% giá trị)</span>
                  <span className="text-primary">25 mặt hàng</span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div className="bg-primary h-full" style={{ width: '20%' }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Nhóm B (15% giá trị)</span>
                  <span className="text-blue-500">50 mặt hàng</span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full" style={{ width: '40%' }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Nhóm C (5% giá trị)</span>
                  <span className="text-gray-500">50 mặt hàng</span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div className="bg-gray-500 h-full" style={{ width: '40%' }} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {reportType === 'turnover' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vòng quay kho</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span>Vòng quay trung bình</span>
                <span className="text-primary font-semibold">4.2 lần/năm</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span>Thời gian tồn kho TB</span>
                <span className="font-semibold">87 ngày</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span>Hiệu suất sử dụng</span>
                <span className="text-green-500 font-semibold">85%</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Export Button */}
        <Button
          className="w-full"
          variant="outline"
          onClick={handleExport}
        >
          <Download className="h-4 w-4 mr-2" />
          Xuất báo cáo Excel
        </Button>
      </div>
    </div>
  )
}
