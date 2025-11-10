import { Vendor } from '@/types/vendor.types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, Eye } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface VendorTableProps {
  vendors: Vendor[];
  selectedVendors: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function VendorTable({ vendors, selectedVendors, onSelectionChange }: VendorTableProps) {
  const navigate = useNavigate();

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(vendors.map(v => v.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedVendors, id]);
    } else {
      onSelectionChange(selectedVendors.filter(v => v !== id));
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedVendors.length === vendors.length}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead>Nhà cung cấp</TableHead>
            <TableHead>Loại</TableHead>
            <TableHead>Liên hệ</TableHead>
            <TableHead className="text-center">Rating</TableHead>
            <TableHead className="text-right">Số đơn</TableHead>
            <TableHead className="text-right">Tổng GT</TableHead>
            <TableHead className="text-center">On-time</TableHead>
            <TableHead className="text-center">Trạng thái</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendors.map((vendor) => (
            <TableRow key={vendor.id}>
              <TableCell>
                <Checkbox
                  checked={selectedVendors.includes(vendor.id)}
                  onCheckedChange={(checked) => handleSelectOne(vendor.id, checked as boolean)}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={vendor.logo_url} />
                    <AvatarFallback>
                      {vendor.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{vendor.name}</div>
                    <div className="text-xs text-muted-foreground">{vendor.code}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={
                  vendor.category === 'supplier' ? 'default' :
                  vendor.category === 'service_provider' ? 'secondary' : 'outline'
                }>
                  {vendor.category === 'supplier' ? 'NCC' :
                   vendor.category === 'service_provider' ? 'DV' : 'Thầu'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>{vendor.contact_person}</div>
                  <div className="text-muted-foreground">{vendor.phone}</div>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{vendor.rating.toFixed(1)}</span>
                </div>
              </TableCell>
              <TableCell className="text-right font-medium">
                {vendor.total_orders}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(vendor.total_value)}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={
                  vendor.on_time_delivery_rate >= 95 ? 'default' :
                  vendor.on_time_delivery_rate >= 90 ? 'secondary' : 'destructive'
                }>
                  {vendor.on_time_delivery_rate}%
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={
                  vendor.status === 'active' ? 'default' :
                  vendor.status === 'inactive' ? 'secondary' : 'destructive'
                }>
                  {vendor.status === 'active' ? 'Hoạt động' :
                   vendor.status === 'inactive' ? 'Tạm dừng' : 'Khóa'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/vendors/${vendor.id}`)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
