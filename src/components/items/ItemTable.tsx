import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  MoreVertical, 
  Eye, 
  Edit, 
  Copy, 
  QrCode, 
  Ban, 
  Trash2,
  Package,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
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
import { useDeleteItems, useUpdateItem } from '@/hooks/useItems'
import { toast } from '@/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCurrency } from '@/lib/utils'
import type { ItemWithCategory } from '@/types/items.types'

interface ItemTableProps {
  items: ItemWithCategory[]
  isLoading: boolean
  selectedItems: string[]
  onSelectionChange: (ids: string[]) => void
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

export function ItemTable({
  items,
  isLoading,
  selectedItems,
  onSelectionChange,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: ItemTableProps) {
  const navigate = useNavigate()
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(items.map(item => item.id))
    } else {
      onSelectionChange([])
    }
  }
  
  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedItems, itemId])
    } else {
      onSelectionChange(selectedItems.filter(id => id !== itemId))
    }
  }
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }
  
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">Không tìm thấy tài sản</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Thử thay đổi bộ lọc hoặc thêm tài sản mới
        </p>
      </div>
    )
  }
  
  const totalPages = Math.ceil(total / pageSize)
  const startIndex = (page - 1) * pageSize + 1
  const endIndex = Math.min(page * pageSize, total)
  
  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedItems.length === items.length && items.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="w-16">Ảnh</TableHead>
              <TableHead>Mã & Tên</TableHead>
              <TableHead>Danh mục</TableHead>
              <TableHead>Đơn vị</TableHead>
              <TableHead className="text-right">Giá</TableHead>
              <TableHead>Tồn kho</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/items/${item.id}`)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedItems.includes(item.id)}
                    onCheckedChange={(checked) => 
                      handleSelectItem(item.id, checked as boolean)
                    }
                  />
                </TableCell>
                <TableCell>
                  {item.item_images?.[0]?.url ? (
                    <img
                      src={item.item_images[0].url}
                      alt={item.name}
                      className="h-12 w-12 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium leading-none">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.code}</p>
                  </div>
                </TableCell>
                <TableCell>
                  {item.category_name && (
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: item.category_color || undefined,
                        color: item.category_color || undefined,
                      }}
                    >
                      {item.category_name}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{item.unit}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(item.unit_price)}
                </TableCell>
                <TableCell>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">Kho:</span>
                      <span className="font-medium">{item.quantity_in_stock}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-600">Dùng:</span>
                      <span className="font-medium">{item.quantity_in_use}</span>
                    </div>
                    {item.quantity_in_laundry > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-600">Giặt:</span>
                        <span className="font-medium">{item.quantity_in_laundry}</span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      item.stock_status === 'in_stock'
                        ? 'default'
                        : item.stock_status === 'low_stock'
                        ? 'secondary'
                        : 'destructive'
                    }
                    className={cn(
                      item.stock_status === 'low_stock' && 
                      'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                    )}
                  >
                    {item.stock_status === 'in_stock' && 'Đủ hàng'}
                    {item.stock_status === 'low_stock' && 'Thấp'}
                    {item.stock_status === 'out_of_stock' && 'Hết'}
                  </Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <ItemActions item={item} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Hiển thị</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => {
              onPageSizeChange(Number(value))
              onPageChange(1)
            }}
          >
            <SelectTrigger className="h-8 w-16">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span>
            {startIndex}-{endIndex} trong {total} tài sản
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Trước
          </Button>
          
          <div className="flex items-center gap-1">
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              let pageNum: number
              
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (page <= 3) {
                pageNum = i + 1
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = page - 2 + i
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onPageChange(pageNum)}
                >
                  {pageNum}
                </Button>
              )
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
          >
            Sau
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function ItemActions({ item }: { item: ItemWithCategory }) {
  const navigate = useNavigate()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDiscontinueDialog, setShowDiscontinueDialog] = useState(false)
  const deleteItems = useDeleteItems()
  const updateItem = useUpdateItem()
  
  const handleCopy = async () => {
    try {
      const newItem = {
        ...item,
        name: `${item.name} (Copy)`,
        code: `${item.code}-COPY-${Date.now().toString().slice(-4)}`,
      }
      // Create via the create hook would be better but we'll use a direct copy approach
      navigate('/items/new', { state: { copyFrom: item } })
      toast({
        title: 'Đang sao chép',
        description: 'Vui lòng cập nhật thông tin cho item mới',
      })
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      })
    }
  }
  
  const handlePrintQR = () => {
    // Open QR code in new window for printing
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(item.qr_code || item.code)}`
    const printWindow = window.open(qrUrl, '_blank', 'width=400,height=400')
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print()
      }
    }
  }
  
  const handleDiscontinue = async () => {
    try {
      await updateItem.mutateAsync({
        id: item.id,
        data: { status: 'discontinued' }
      })
      setShowDiscontinueDialog(false)
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      })
    }
  }
  
  const handleDelete = async () => {
    try {
      await deleteItems.mutateAsync([item.id])
      setShowDeleteDialog(false)
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      })
    }
  }
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => navigate(`/items/${item.id}`)}>
            <Eye className="mr-2 h-4 w-4" />
            Xem chi tiết
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(`/items/${item.id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Sửa
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            Sao chép
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePrintQR}>
            <QrCode className="mr-2 h-4 w-4" />
            In nhãn QR
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowDiscontinueDialog(true)}>
            <Ban className="mr-2 h-4 w-4" />
            Ngừng kinh doanh
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Xóa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa "{item.name}"? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDiscontinueDialog} onOpenChange={setShowDiscontinueDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận ngừng kinh doanh</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn ngừng kinh doanh "{item.name}"? Tài sản sẽ được đánh dấu là discontinued.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscontinue}>
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
