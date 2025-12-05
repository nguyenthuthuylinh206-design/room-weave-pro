import { useState } from 'react'
import { X, Trash2, RefreshCw, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { useBulkDeleteRooms, useBulkUpdateRoomStatus } from '@/hooks/useBulkRoomActions'
import type { RoomStatus } from '@/types/rooms.types'

interface RoomBulkActionsBarProps {
  selectedIds: string[]
  onClearSelection: () => void
}

const statusOptions: { value: RoomStatus; label: string }[] = [
  { value: 'vacant', label: 'Trống' },
  { value: 'occupied', label: 'Có khách' },
  { value: 'cleaning', label: 'Đang dọn' },
  { value: 'maintenance', label: 'Bảo trì' },
  { value: 'out_of_order', label: 'Không sử dụng' },
  { value: 'check_in', label: 'Check-in' },
  { value: 'check_out', label: 'Check-out' },
]

export function RoomBulkActionsBar({ selectedIds, onClearSelection }: RoomBulkActionsBarProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<RoomStatus | ''>('')
  
  const bulkDelete = useBulkDeleteRooms()
  const bulkUpdateStatus = useBulkUpdateRoomStatus()

  const handleDelete = () => {
    bulkDelete.mutate(selectedIds, {
      onSuccess: () => {
        setShowDeleteDialog(false)
        onClearSelection()
      },
    })
  }

  const handleStatusChange = (status: RoomStatus) => {
    setSelectedStatus(status)
    bulkUpdateStatus.mutate(
      { roomIds: selectedIds, status },
      {
        onSuccess: () => {
          setSelectedStatus('')
          onClearSelection()
        },
      }
    )
  }

  if (selectedIds.length === 0) return null

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 rounded-lg border bg-primary/5 p-3 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            <span className="font-medium">
              Đã chọn <span className="text-primary">{selectedIds.length}</span> phòng
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-8 px-2"
          >
            <X className="h-4 w-4" />
            <span className="ml-1">Bỏ chọn</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Status change */}
          <Select
            value={selectedStatus}
            onValueChange={(value) => handleStatusChange(value as RoomStatus)}
            disabled={bulkUpdateStatus.isPending}
          >
            <SelectTrigger className="w-[160px] bg-background">
              <RefreshCw className={`mr-2 h-4 w-4 ${bulkUpdateStatus.isPending ? 'animate-spin' : ''}`} />
              <SelectValue placeholder="Đổi trạng thái" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Delete button */}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            disabled={bulkDelete.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Xóa ({selectedIds.length})
          </Button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa {selectedIds.length} phòng</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa <strong>{selectedIds.length}</strong> phòng đã chọn?
              <br />
              <span className="text-destructive">Hành động này không thể hoàn tác.</span>
              <br />
              <span className="text-muted-foreground text-sm">
                Lưu ý: Phòng có đồ dùng hoặc lịch sử kiểm tra sẽ không thể xóa.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDelete.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDelete.isPending}
            >
              {bulkDelete.isPending ? 'Đang xóa...' : `Xóa ${selectedIds.length} phòng`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
