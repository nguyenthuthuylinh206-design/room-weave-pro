import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
import { vi, enUS } from 'date-fns/locale'
import { useDeleteRoom } from '@/hooks/useRooms'
import type { RoomWithStats } from '@/types/rooms.types'

interface RoomTableProps {
  rooms: RoomWithStats[]
  isLoading: boolean
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
}

export function RoomTable({ rooms, isLoading, selectedIds, onSelectionChange }: RoomTableProps) {
  const { t, i18n } = useTranslation(['rooms', 'common'])
  const navigate = useNavigate()
  const dateLocale = i18n.language === 'vi' ? vi : enUS

  const isAllSelected = rooms.length > 0 && selectedIds.length === rooms.length
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < rooms.length

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(rooms.map((r) => r.id))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectRoom = (roomId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, roomId])
    } else {
      onSelectionChange(selectedIds.filter((id) => id !== roomId))
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
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={isAllSelected}
                ref={(el) => {
                  if (el) (el as any).indeterminate = isSomeSelected
                }}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead>{t('table.roomNumber')}</TableHead>
            <TableHead>{t('table.floor')}</TableHead>
            <TableHead>{t('table.roomType')}</TableHead>
            <TableHead>{t('table.status')}</TableHead>
            <TableHead>{t('table.area')}</TableHead>
            <TableHead className="text-right">{t('table.price')}</TableHead>
            <TableHead>{t('table.items')}</TableHead>
            <TableHead>{t('table.lastCheck')}</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rooms.map((room) => (
            <TableRow
              key={room.id}
              className={`cursor-pointer hover:bg-muted/50 ${
                selectedIds.includes(room.id) ? 'bg-primary/5' : ''
              }`}
              onClick={() => navigate(`/rooms/${room.id}`)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.includes(room.id)}
                  onCheckedChange={(checked) => handleSelectRoom(room.id, !!checked)}
                />
              </TableCell>
              <TableCell className="font-medium">{room.room_number}</TableCell>
              <TableCell>{t('detail.floorNumber', { number: room.floor })}</TableCell>
              <TableCell className="capitalize">{t(`roomTypes.${room.room_type}`, { defaultValue: room.room_type })}</TableCell>
              <TableCell>
                <RoomStatusBadge status={room.status as import('@/types/rooms.types').RoomStatus} />
              </TableCell>
              <TableCell>{room.area_sqm ? `${room.area_sqm} m²` : '-'}</TableCell>
              <TableCell className="text-right">
                {room.base_price ? formatCurrency(room.base_price) : '-'}
              </TableCell>
              <TableCell>
                <div className="space-y-1 text-xs">
                  <div>{t('table.total')}: {room.total_items}</div>
                  {room.missing_items > 0 && (
                    <div className="text-red-600">
                      {t('table.missing')}: {room.missing_items}
                    </div>
                  )}
                  {room.items_in_laundry > 0 && (
                    <div className="text-cyan-600">
                      {t('table.laundry')}: {room.items_in_laundry}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {room.last_check_at ? (
                  <div className="space-y-1 text-xs">
                    <div>{formatDistanceToNow(new Date(room.last_check_at), { addSuffix: true, locale: dateLocale })}</div>
                    {room.last_check_score && (
                      <div className="text-muted-foreground">
                        {t('table.score', { score: room.last_check_score })}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs">{t('table.notChecked')}</span>
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
  const { t } = useTranslation(['rooms', 'common'])
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
            {t('actions.viewDetail')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(`/rooms/${room.id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            {t('actions.edit')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(`/rooms/${room.id}/check`)}>
            <ClipboardCheck className="mr-2 h-4 w-4" />
            {t('actions.checkRoom')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="text-destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t('actions.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialog.description', { roomNumber: room.room_number })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteRoom.isPending}
            >
              {deleteRoom.isPending ? t('deleteDialog.deleting') : t('deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}