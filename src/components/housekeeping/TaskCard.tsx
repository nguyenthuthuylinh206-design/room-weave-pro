import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { 
  ClipboardCheck, 
  Sparkles, 
  DoorOpen, 
  Package, 
  MoreHorizontal,
  Clock,
  User,
  Play,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useUpdateTaskStatus } from '@/hooks/useHousekeepingTasks'
import type { HousekeepingTaskWithDetails, TaskType, TaskPriority } from '@/types/housekeeping.types'
import { TASK_TYPE_LABELS, PRIORITY_LABELS, PRIORITY_COLORS } from '@/types/housekeeping.types'

const TASK_ICONS: Record<TaskType, typeof ClipboardCheck> = {
  checkout_inspection: ClipboardCheck,
  cleaning: Sparkles,
  checkin_prep: DoorOpen,
  amenity_request: Package,
  other: MoreHorizontal
}

const PRIORITY_BADGE_STYLES: Record<TaskPriority, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
}

interface TaskCardProps {
  task: HousekeepingTaskWithDetails
  showActions?: boolean
}

export function TaskCard({ task, showActions = true }: TaskCardProps) {
  const navigate = useNavigate()
  const [isUpdating, setIsUpdating] = useState(false)
  const { mutateAsync: updateStatus } = useUpdateTaskStatus()

  const Icon = TASK_ICONS[task.task_type]
  const isInProgress = task.status === 'in_progress'
  const isUrgent = task.priority === 'urgent' || task.priority === 'high'

  const handleStart = async () => {
    setIsUpdating(true)
    try {
      await updateStatus({ taskId: task.id, status: 'in_progress' })
      
      // If checkout inspection, redirect to room check form
      if (task.task_type === 'checkout_inspection') {
        navigate(`/rooms/${task.room_id}/check?type=checkout&taskId=${task.id}`)
      }
    } finally {
      setIsUpdating(false)
    }
  }

  const handleComplete = async () => {
    setIsUpdating(true)
    try {
      await updateStatus({ taskId: task.id, status: 'completed' })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleContinue = () => {
    if (task.task_type === 'checkout_inspection') {
      navigate(`/rooms/${task.room_id}/check?type=checkout&taskId=${task.id}`)
    }
  }

  // Calculate elapsed time for in_progress tasks
  const elapsedTime = task.started_at 
    ? formatDistanceToNow(new Date(task.started_at), { locale: vi, addSuffix: false })
    : null

  return (
    <div 
      className={cn(
        'border rounded-lg p-3 transition-colors',
        isUrgent && task.status === 'pending' && 'border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10',
        isInProgress && 'border-blue-300 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/10'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn(
            'p-1.5 rounded-md',
            isUrgent ? 'bg-red-100 dark:bg-red-900/30' : 'bg-muted'
          )}>
            <Icon className={cn(
              'h-4 w-4',
              isUrgent ? 'text-red-600' : 'text-muted-foreground'
            )} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                P.{task.room?.room_number}
              </span>
              <Badge 
                variant="outline" 
                className={cn('text-[10px] h-5', PRIORITY_BADGE_STYLES[task.priority])}
              >
                {task.priority === 'urgent' && <AlertTriangle className="h-3 w-3 mr-0.5" />}
                {PRIORITY_LABELS[task.priority]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {task.title || TASK_TYPE_LABELS[task.task_type]}
            </p>
          </div>
        </div>
        
        {isInProgress && elapsedTime && (
          <Badge variant="secondary" className="text-[10px] h-5 shrink-0">
            <Clock className="h-3 w-3 mr-1" />
            {elapsedTime}
          </Badge>
        )}
      </div>

      {/* Details */}
      {(task.description || task.booking?.guest_name || task.requested_user) && (
        <div className="text-xs text-muted-foreground space-y-1 mb-3">
          {task.description && (
            <p className="line-clamp-2">{task.description}</p>
          )}
          {task.booking?.guest_name && (
            <p className="flex items-center gap-1">
              <User className="h-3 w-3" />
              Khách: {task.booking.guest_name}
            </p>
          )}
          {task.requested_user && (
            <p className="flex items-center gap-1 opacity-70">
              Yêu cầu bởi: {task.requested_user.full_name}
            </p>
          )}
        </div>
      )}

      {/* Time info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
        <span>
          {formatDistanceToNow(new Date(task.created_at), { 
            locale: vi, 
            addSuffix: true 
          })}
        </span>
        {task.due_at && (
          <span className={cn(
            new Date(task.due_at) < new Date() && 'text-red-600 font-medium'
          )}>
            Deadline: {new Date(task.due_at).toLocaleTimeString('vi-VN', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex gap-2">
          {task.status === 'pending' && (
            <Button 
              size="sm" 
              className="flex-1 h-8"
              onClick={handleStart}
              disabled={isUpdating}
            >
              <Play className="h-3.5 w-3.5 mr-1" />
              Bắt đầu
            </Button>
          )}
          
          {isInProgress && (
            <>
              {task.task_type === 'checkout_inspection' ? (
                <Button 
                  size="sm" 
                  className="flex-1 h-8"
                  onClick={handleContinue}
                  disabled={isUpdating}
                >
                  <ClipboardCheck className="h-3.5 w-3.5 mr-1" />
                  Kiểm tra phòng
                </Button>
              ) : (
                <Button 
                  size="sm" 
                  className="flex-1 h-8"
                  onClick={handleComplete}
                  disabled={isUpdating}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Hoàn thành
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
