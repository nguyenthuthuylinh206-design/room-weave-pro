import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Search } from 'lucide-react'

interface MaintenanceFiltersProps {
  filters: any
  onFiltersChange: (filters: any) => void
}

export const MaintenanceFilters = ({ filters, onFiltersChange }: MaintenanceFiltersProps) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm mã, mô tả, phòng..."
              className="pl-10"
              value={filters.search || ''}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            />
          </div>

          <Select
            value={filters.priority || 'all'}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, priority: value === 'all' ? undefined : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Độ ưu tiên" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả độ ưu tiên</SelectItem>
              <SelectItem value="urgent">🔴 Khẩn cấp</SelectItem>
              <SelectItem value="high">🟠 Cao</SelectItem>
              <SelectItem value="medium">🟡 Trung bình</SelectItem>
              <SelectItem value="low">🟢 Thấp</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.issue_type || 'all'}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, issue_type: value === 'all' ? undefined : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Loại" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại</SelectItem>
              <SelectItem value="repair">🔧 Sửa chữa</SelectItem>
              <SelectItem value="replace">🔄 Thay thế</SelectItem>
              <SelectItem value="inspection">🔍 Kiểm tra</SelectItem>
              <SelectItem value="cleaning">🧹 Vệ sinh</SelectItem>
              <SelectItem value="other">➕ Khác</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.status || 'all'}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, status: value === 'all' ? undefined : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="pending">Chờ xử lý</SelectItem>
              <SelectItem value="assigned">Đã gán</SelectItem>
              <SelectItem value="in_progress">Đang xử lý</SelectItem>
              <SelectItem value="completed">Hoàn thành</SelectItem>
              <SelectItem value="cancelled">Đã hủy</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
