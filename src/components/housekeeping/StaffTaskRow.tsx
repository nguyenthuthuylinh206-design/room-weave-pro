import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow, format } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
  ClipboardCheck, Sparkles, DoorOpen, Package, PackageCheck, MoreHorizontal,
  Play, CheckCircle2, Clock, CornerDownRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useUpdateTaskStatus } from '@/hooks/useHousekeepingTasks'
import { DeliveryConfirmationModal } from './DeliveryConfirmationModal'
import { CleaningCompleteDialog } from '@/components/rooms/CleaningCompleteDialog'
import { useDeliveryTaskItems } from '@/hooks/useDeliveryTaskItems'
import type { HousekeepingTaskWithDetails, TaskType, TaskPriority } from '@/types/housekeeping.types'
import { TASK_TYPE_LABELS } from '@/types/housekeeping.types'

const TASK_ICONS: Record<TaskType, typeof ClipboardCheck> = {
  checkout_inspection: ClipboardCheck,
  cleaning: Sparkles,
  checkin_prep: DoorOpen,
  amenity_request: Package,
  delivery_confirmation: PackageCheck,
  other: MoreHorizontal,
}

const PRIORITY_DOT: Record<TaskPriority, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-400',
  low: 'bg-muted-foreground/40',
}

interface StaffTaskRowProps {
  task: HousekeepingTaskWithDetails
  onTap?: () => void
}

export function StaffTaskRow({ task, onTap }: StaffTaskRowProps) {
  const navigate = useNavigate()
  const [isUpdating, setIsUpdating] = useState(false)
  const [showDeliveryModal, setShowDeliveryModal] = useState(false)
  const [showCleaningComplete, setShowCleaningComplete] = useState(false)
  const { mutateAsync: updateStatus } = useUpdateTaskStatus()

  const isDeliveryTask = task.task_type === 'delivery_confirmation'
  const isCleaningTask = task.task_type === 'cleaning'
  const { data: deliveryData } = useDeliveryTaskItems(
    isDeliveryTask ? task.distribution_order_room_id : null
  )

  const Icon = TASK_ICONS[task.task_type]
  const isPending = task.status === 'pending'
  const isInProgress = task.status === 'in_progress'
  const isUrgent = task.priority === 'urgent' || task.priority === 'high'
  const roomNumber = task.room?.room_number

  const elapsedTime = task.started_at
    ? formatDistanceToNow(new Date(task.started_at), { locale: vi, addSuffix: false })
    : null

  const deadline = task.due_at ? format(new Date(task.due_at), 'HH:mm') : null

  const handleStart = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsUpdating(true)
    try {
      await updateStatus({ taskId: task.id, status: 'in_progress' })
      // Navigate based on task type
      if (task.task_type === 'checkout_inspection') {
        const ip = task.checkout_inspection_id ? `&inspection=${task.checkout_inspection_id}` : ''
        navigate(`/rooms/${task.room_id}/check?type=checkout${ip}`)
      } else if (task.task_type === 'delivery_confirmation') {
        setShowDeliveryModal(true)
      } else if (task.task_type === 'checkin_prep') {
        navigate(`/rooms/${task.room_id}/check?type=checkin`)
      } else if (task.task_type === 'amenity_request') {
        navigate(`/rooms/${task.room_id}/check?type=replenish`)
      }
    } finally {
      setIsUpdating(false)
    }
  }

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isCleaningTask) {
      setShowCleaningComplete(true)
      return
    }
    setIsUpdating(true)
    try {
      await updateStatus({ taskId: task.id, status: 'completed' })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleContinue = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (task.task_type === 'checkout_inspection') {
      const ip = task.checkout_inspection_id ? `&inspection=${task.checkout_inspection_id}` : ''
      navigate(`/rooms/${task.room_id}/check?type=checkout${ip}`)
    } else if (task.task_type === 'checkin_prep') {
      navigate(`/rooms/${task.room_id}/check?type=checkin`)
    } else if (task.task_type === 'amenity_request') {
      navigate(`/rooms/${task.room_id}/check?type=replenish`)
    } else if (task.task_type === 'cleaning') {
      navigate(`/rooms/${task.room_id}`)
    } else if (task.task_type === 'delivery_confirmation') {
      setShowDeliveryModal(true)
    }
  }

  const handleCleaningCompleted = async () => {
    setIsUpdating(true)
    try {
      await updateStatus({ taskId: task.id, status: 'completed' })
      setShowCleaningComplete(false)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <>
      <div
        onClick={onTap}
        className={cn(
          'flex items-center gap-3 px-4 py-3 border-b last:border-b-0 transition-colors active:scale-[0.98]',
          onTap && 'cursor-pointer',
          isUrgent && isPending && 'bg-red-50/60 dark:bg-red-950/20',
          isInProgress && 'bg-blue-50/60 dark:bg-blue-950/20'
        )}
      >
        {/* Left: icon + priority dot */}
        <div className="relative shrink-0">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            isUrgent ? 'bg-red-100 dark:bg-red-900/30' : 'bg-muted'
          )}>
            <Icon className={cn('h-5 w-5', isUrgent ? 'text-red-600' : 'text-muted-foreground')} />
          </div>
          <div className={cn('absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background', PRIORITY_DOT[task.priority])} />
        </div>

        {/* Center: room + task type */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold tracking-tight">
              {roomNumber ? `P.${roomNumber}` : 'N/A'}
            </span>
            <span className="text-sm text-muted-foreground truncate">
              {TASK_TYPE_LABELS[task.task_type]}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {isUrgent && (
              <span className="text-xs font-medium text-red-600">Khẩn cấp</span>
            )}
            {deadline && (
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <Clock className="h-3 w-3" />
                {deadline}
              </span>
            )}
            {isInProgress && elapsedTime && (
              <span className="text-xs text-blue-600 flex items-center gap-0.5">
                <Clock className="h-3 w-3" />
                {elapsedTime}
              </span>
            )}
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="shrink-0 flex items-center gap-1.5">
          {isPending && (
            <Button
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={handleStart}
              disabled={isUpdating}
            >
              <Play className="h-3.5 w-3.5 mr-1" />
              Bắt đầu
            </Button>
          )}
          {isInProgress && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs"
                onClick={handleContinue}
              >
                <CornerDownRight className="h-3.5 w-3.5 mr-1" />
                Tiếp
              </Button>
              <Button
                size="sm"
                variant="default"
                className="h-8 px-2.5 text-xs bg-green-600 hover:bg-green-700 text-white"
                onClick={handleComplete}
                disabled={isUpdating}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {isDeliveryTask && deliveryData && (
        <DeliveryConfirmationModal
          open={showDeliveryModal}
          onOpenChange={setShowDeliveryModal}
          taskId={task.id}
          distributionOrderRoomId={task.distribution_order_room_id || ''}
          roomNumber={roomNumber || ''}
          items={deliveryData.items}
        />
      )}

      {isCleaningTask && (
        <CleaningCompleteDialog
          open={showCleaningComplete}
          onOpenChange={setShowCleaningComplete}
          roomId={task.room_id}
          taskId={task.id}
          onMarkReady={handleCleaningCompleted}
        />
      )}
    </>
  )
}
