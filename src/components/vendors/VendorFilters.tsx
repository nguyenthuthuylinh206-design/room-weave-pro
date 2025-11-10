import { VendorFilters as VendorFiltersType } from '@/types/vendor.types';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

interface VendorFiltersProps {
  filters: VendorFiltersType;
  onChange: (filters: Partial<VendorFiltersType>) => void;
}

export function VendorFilters({ filters, onChange }: VendorFiltersProps) {
  return (
    <div className="flex gap-4 flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Tìm theo tên hoặc mã..."
          value={filters.search || ''}
          onChange={(e) => onChange({ search: e.target.value })}
          className="pl-9"
        />
      </div>

      <Select
        value={filters.status || 'all'}
        onValueChange={(value) => onChange({ status: value as any })}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Trạng thái" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả</SelectItem>
          <SelectItem value="active">Hoạt động</SelectItem>
          <SelectItem value="inactive">Không hoạt động</SelectItem>
          <SelectItem value="suspended">Tạm ngưng</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.sort_by || 'name'}
        onValueChange={(value) => onChange({ sort_by: value as any })}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Sắp xếp" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name">Tên</SelectItem>
          <SelectItem value="rating">Đánh giá</SelectItem>
          <SelectItem value="orders">Số đơn</SelectItem>
          <SelectItem value="value">Giá trị</SelectItem>
          <SelectItem value="recent">Mới nhất</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
