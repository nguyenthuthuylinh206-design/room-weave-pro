import { useState } from 'react'
import { Vendor } from '@/types/vendor.types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, Eye, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useUpdateVendor, useDeleteVendor } from '@/hooks/useVendors'

interface VendorTableProps {
  vendors: Vendor[];
  selectedVendors: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function VendorTable({ vendors, selectedVendors, onSelectionChange }: VendorTableProps) {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const updateVendor = useUpdateVendor()
  const deleteVendor = useDeleteVendor()

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
  
  const handleToggleStatus = (vendor: Vendor) => {
    setSelectedVendor(vendor)
    setShowStatusDialog(true)
  }
  
  const confirmStatusToggle = () => {
    if (!selectedVendor) return
    
    const newStatus = selectedVendor.status === 'active' ? 'inactive' : 'active'
    updateVendor.mutate(
      { id: selectedVendor.id, status: newStatus },
      {
        onSuccess: () => {
          setShowStatusDialog(false)
          setSelectedVendor(null)
        }
      }
    )
  }
  
  const handleDelete = (vendor: Vendor) => {
    setSelectedVendor(vendor)
    setShowDeleteDialog(true)
  }
  
  const confirmDelete = () => {
    if (!selectedVendor) return
    
    deleteVendor.mutate(selectedVendor.id, {
      onSuccess: () => {
        setShowDeleteDialog(false)
        setSelectedVendor(null)
      }
    })
  }

  return (
    <>
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/vendors/${vendor.id}`)}>
                      <Eye className="mr-2 w-4 h-4" />
                      Xem chi tiết
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/vendors/${vendor.id}/edit`)}>
                      <Edit className="mr-2 w-4 h-4" />
                      Sửa
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleStatus(vendor)}>
                      {vendor.status === 'active' ? 'Vô hiệu hóa' : 'Kích hoạt'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleDelete(vendor)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 w-4 h-4" />
                      Xóa
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
    <AlertDialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xác nhận thay đổi trạng thái</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn có chắc chắn muốn {selectedVendor?.status === 'active' ? 'vô hiệu hóa' : 'kích hoạt'} nhà cung cấp <strong>{selectedVendor?.name}</strong>?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Hủy</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmStatusToggle}
            disabled={updateVendor.isPending}
          >
            {updateVendor.isPending ? 'Đang xử lý...' : 'Xác nhận'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    
    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xác nhận xóa nhà cung cấp</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn có chắc chắn muốn xóa nhà cung cấp <strong>{selectedVendor?.name}</strong>? 
            Hành động này không thể hoàn tác.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Hủy</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteVendor.isPending}
          >
            {deleteVendor.isPending ? 'Đang xóa...' : 'Xóa'}
          </AlertDialogAction>
        </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
