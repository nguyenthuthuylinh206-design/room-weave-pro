import { useState, useEffect } from 'react'
import { format, differenceInSeconds } from 'date-fns'
import { vi } from 'date-fns/locale'
import { ClipboardList, Loader2, Clock, X, Maximize2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCheckoutInspection } from '@/hooks/useCheckoutInspection'
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
import { toast } from 'sonner'
import type { BookingCostBreakdown, DamageChargeItem } from '@/lib/bookingCalculations'

export interface MinimizedCheckout {
  booking: {
    id: string
    guest_name: string
    room_id: string
    hotel_id: string
    check_out_date: string
    room?: {
      room_number: string
    }
  }
  costBreakdown: BookingCostBreakdown
  damageItems: DamageChargeItem[]
  actualCheckoutTime: string
  actualCheckoutDate: Date
  scheduledCheckoutDate: Date
}

interface MinimizedCheckoutWidgetProps {
  checkout: MinimizedCheckout
  index: number
  onRestore: (checkout: MinimizedCheckout) => void
  onClose: (bookingId: string) => void
  tenantId?: string
}

export function MinimizedCheckoutWidget({
  checkout,
  index,
  onRestore,
  onClose,
  tenantId,
}: MinimizedCheckoutWidgetProps) {
  const [showConfirmClose, setShowConfirmClose] = useState(false)
  const [elapsedTime, setElapsedTime] = useState('')
  
  const { inspection, refetch } = useCheckoutInspection(checkout.booking.id)
  
  // Timer for in_progress inspection
  useEffect(() => {
    if (!inspection || inspection.status !== 'in_progress' || !inspection.started_at) {
      setElapsedTime('')
      return
    }
    
    const updateTimer = () => {
      const startTime = new Date(inspection.started_at!)
      const now = new Date()
      const seconds = differenceInSeconds(now, startTime)
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      setElapsedTime(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`)
    }
    
    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    
    return () => clearInterval(interval)
  }, [inspection?.status, inspection?.started_at])
  
  // Polling fallback when inspection is active
  useEffect(() => {
    if (!inspection) return
    if (inspection.status === 'completed' || inspection.status === 'cancelled') return
    
    const intervalMs = inspection.status === 'in_progress' ? 2000 : 3000
    const interval = setInterval(() => {
      refetch()
    }, intervalMs)
    
    return () => clearInterval(interval)
  }, [inspection?.id, inspection?.status, refetch])
  
  // Notify when inspection completed
  useEffect(() => {
    if (inspection?.status === 'completed') {
      toast.success(`Kiểm tra phòng ${checkout.booking.room?.room_number || ''} hoàn tất`, {
        description: 'Nhấn "Mở lại" để xem kết quả và tiếp tục checkout',
        duration: 10000,
      })
    }
  }, [inspection?.status, checkout.booking.room?.room_number])
  
  const roomNumber = checkout.booking.room?.room_number || 'N/A'
  const guestName = checkout.booking.guest_name
  
  // Calculate stack position
  const bottomOffset = 16 + (index * 72) // 72px per widget (height + gap)
  
  const getStatusDisplay = () => {
    if (!inspection || inspection.status === 'cancelled') {
      return null
    }
    
    if (inspection.status === 'completed') {
      return (
        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-500">
          <CheckCircle2 className="h-3 w-3" />
          <span className="text-xs">Đã kiểm tra xong</span>
        </div>
      )
    }
    
    if (inspection.status === 'in_progress') {
      return (
        <div className="flex items-center gap-1 text-primary">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="text-xs">Đang kiểm tra: {elapsedTime}</span>
        </div>
      )
    }
    
    // pending
    return (
      <div className="flex items-center gap-1 text-orange-600 dark:text-orange-500">
        <Clock className="h-3 w-3" />
        <span className="text-xs">Chờ kiểm tra...</span>
      </div>
    )
  }
  
  const handleClose = () => {
    // If inspection is active, confirm before closing
    if (inspection && ['pending', 'in_progress'].includes(inspection.status)) {
      setShowConfirmClose(true)
    } else {
      onClose(checkout.booking.id)
    }
  }
  
  return (
    <>
      <div
        className={cn(
          "fixed right-4 z-50 w-64 rounded-lg border bg-background shadow-lg p-3",
          "animate-in slide-in-from-right-5 duration-200",
          inspection?.status === 'completed' && "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/30"
        )}
        style={{ bottom: `${bottomOffset}px` }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <ClipboardList className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-medium text-sm truncate">P.{roomNumber}</div>
              <div className="text-xs text-muted-foreground truncate">{guestName}</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={handleClose}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        
        {/* Status */}
        <div className="mb-2">
          {getStatusDisplay()}
        </div>
        
        {/* Action */}
        <Button
          variant={inspection?.status === 'completed' ? 'default' : 'outline'}
          size="sm"
          className="w-full h-7 text-xs"
          onClick={() => onRestore(checkout)}
        >
          <Maximize2 className="h-3 w-3 mr-1" />
          Mở lại
        </Button>
      </div>
      
      {/* Confirm close dialog */}
      <AlertDialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Đóng checkout?</AlertDialogTitle>
            <AlertDialogDescription>
              Phòng {roomNumber} đang có yêu cầu kiểm tra chưa hoàn tất. 
              Bạn có chắc muốn đóng? Dữ liệu checkout sẽ không được lưu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onClose(checkout.booking.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Đóng
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
