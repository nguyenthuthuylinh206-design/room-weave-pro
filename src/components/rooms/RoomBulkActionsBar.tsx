import { useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'
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

const statusKeys: RoomStatus[] = [
  'vacant',
  'occupied', 
  'cleaning',
  'maintenance',
  'out_of_order',
  'check_in',
  'check_out',
]

export function RoomBulkActionsBar({ selectedIds, onClearSelection }: RoomBulkActionsBarProps) {
  const { t } = useTranslation('rooms')
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
              <Trans 
                i18nKey="bulkActions.selected" 
                ns="rooms"
                values={{ count: selectedIds.length }}
                components={{ 1: <span className="text-primary" /> }}
              />
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-8 px-2"
          >
            <X className="h-4 w-4" />
            <span className="ml-1">{t('bulkActions.clear')}</span>
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
              <SelectValue placeholder={t('bulkActions.changeStatus')} />
            </SelectTrigger>
            <SelectContent>
              {statusKeys.map((statusKey) => (
                <SelectItem key={statusKey} value={statusKey}>
                  {t(`status.${statusKey}`)}
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
            {t('bulkActions.delete', { count: selectedIds.length })}
          </Button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('bulkActions.deleteTitle', { count: selectedIds.length })}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <Trans 
                  i18nKey="bulkActions.deleteDescription" 
                  ns="rooms"
                  values={{ count: selectedIds.length }}
                  components={{ 1: <strong /> }}
                />
                <br />
                <span className="text-destructive">{t('bulkActions.deleteWarning')}</span>
                <br />
                <span className="text-muted-foreground text-sm">
                  {t('bulkActions.deleteNote')}
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDelete.isPending}>
              {t('bulkActions.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDelete.isPending}
            >
              {bulkDelete.isPending 
                ? t('bulkActions.deleting') 
                : t('bulkActions.deleteConfirm', { count: selectedIds.length })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
