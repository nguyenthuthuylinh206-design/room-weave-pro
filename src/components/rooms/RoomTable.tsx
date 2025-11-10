import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreVertical, Eye, Edit, ClipboardCheck, Trash2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { RoomStatusBadge } from './RoomStatusBadge'
import { formatCurrency } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useDeleteRoom } from '@/hooks/useRooms'
import type { RoomWithStats } from '@/types/rooms.types'

interface RoomTableProps {
  rooms: RoomWithStats[]
  isLoading: boolean
}

export function RoomTable({ rooms, isLoading }: RoomTableProps) {
  const navigate = useNavigate()
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox />
            </TableHead>
            <TableHead>Số phòng</TableHead>
            <TableHead>Tầng</TableHead>
            <TableHead>Loại phòng</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Diện tích</TableHead>
            <TableHead className="text-right">Giá</TableHead>
            <TableHead>Đồ dùng</TableHead>
            <TableHead>Kiểm tra cuối</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rooms.map((room) => (
            <TableRow
              key={room.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => navigate(`/rooms/${room.id}`)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox />
              </TableCell>
              <TableCell className="font-medium">{room.room_number}</TableCell>
              <TableCell>Tầng {room.floor}</TableCell>
              <TableCell className="capitalize">{room.room_type}</TableCell>
              <TableCell>
                <RoomStatusBadge status={room.status as import('@/types/rooms.types').RoomStatus} />
              </TableCell>
              <TableCell>{room.area_sqm ? `${room.area_sqm} m²` : '-'}</TableCell>
              <TableCell className="text-right">
                {room.base_price ? formatCurrency(room.base_price) : '-'}
              </TableCell>
              <TableCell>
                <div className="space-y-1 text-xs">
                  <div>Tổng: {room.total_items}</div>
                  {room.missing_items > 0 && (
                    <div className="text-red-600">
                      Thiếu: {room.missing_items}
                    </div>
                  )}
                  {room.items_in_laundry > 0 && (
                    <div className="text-cyan-600">
                      Giặt: {room.items_in_laundry}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {room.last_check_at ? (
                  <div className="space-y-1 text-xs">
                    <div>{formatDistanceToNow(new Date(room.last_check_at), { addSuffix: true, locale: vi })}</div>
                    {room.last_check_score && (
                      <div className="text-muted-foreground">
                        Điểm: {room.last_check_score}/5
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs">Chưa kiểm tra</span>
                )}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <RoomActions room={room} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function RoomActions({ room }: { room: RoomWithStats }) {
  const navigate = useNavigate()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const deleteRoom = useDeleteRoom()
  
  const handleDelete = () => {
    deleteRoom.mutate(room.id, {
      onSuccess: () => setShowDeleteDialog(false)
    })
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
          <DropdownMenuItem onClick={() => navigate(`/rooms/${room.id}`)}>
            <Eye className="mr-2 h-4 w-4" />
            Xem chi tiết
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(`/rooms/${room.id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Sửa
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(`/rooms/${room.id}/check`)}>
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Kiểm tra phòng
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="text-destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Xóa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa phòng</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa phòng <strong>{room.room_number}</strong>? 
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteRoom.isPending}
            >
              {deleteRoom.isPending ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
