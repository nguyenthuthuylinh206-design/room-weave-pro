import { useState, useEffect } from 'react'
import { CheckCircle2, Clock, AlertTriangle, Inbox, Plus, Users } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { TaskCard } from './TaskCard'
import { RoomSelectDialog } from './RoomSelectDialog'
import { CreateTaskDialog } from './CreateTaskDialog'
import { TaskDetailDialog } from './TaskDetailDialog'
import { useMyTasks, useUnassignedTasks } from '@/hooks/useHousekeepingTasks'
import { useUser } from '@/hooks/useUser'
import { canCreateHousekeepingTask } from '@/lib/userAccess'
import { cn } from '@/lib/utils'

type FilterType = 'all' | 'pending' | 'in_progress'

interface StaffTasksTabProps {
  initialTaskId?: string | null
}

export function StaffTasksTab({ initialTaskId }: StaffTasksTabProps) {
  const { data: myTasks, isLoading: isLoadingMyTasks } = useMyTasks()
  const { data: unassignedTasks, isLoading: isLoadingUnassigned } = useUnassignedTasks()
  const { user } = useUser()
  const canCreateTask = canCreateHousekeepingTask(user)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  
  // Dialog states
  const [showRoomSelect, setShowRoomSelect] = useState(false)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTaskId || null)
  const [selectedRoom, setSelectedRoom] = useState<{
    id: string
    room_number: string
    floor: number
    hotel_id: string
  } | null>(null)

  // Auto-open dialog when initialTaskId changes (from URL)
  useEffect(() => {
    if (initialTaskId) {
      setSelectedTaskId(initialTaskId)
    }
  }, [initialTaskId])

  // Separate my tasks by status
  const pendingTasks = myTasks?.filter(t => t.status === 'pending') || []
  const inProgressTasks = myTasks?.filter(t => t.status === 'in_progress') || []
  const urgentTasks = pendingTasks.filter(t => t.priority === 'urgent' || t.priority === 'high')

  // Total count for display
  const totalMyTasks = (myTasks?.length || 0)
  const totalUnassigned = (unassignedTasks?.length || 0)

  const isLoading = isLoadingMyTasks || isLoadingUnassigned

  // Handle room selection for creating new task
  const handleRoomSelect = (room: {
    id: string
    room_number: string
    floor: number
    hotel_id: string
  }) => {
    setSelectedRoom(room)
    setShowRoomSelect(false)
    setShowCreateTask(true)
  }

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  // Empty state - no tasks at all
  if (!myTasks?.length && !unassignedTasks?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-6">
        <div className="w-20 h-20 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-4">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
        </div>
        <h3 className="font-semibold text-lg mb-1">Tuyệt vời!</h3>
        <p className="text-sm text-muted-foreground max-w-xs mb-6">
          {canCreateTask 
            ? 'Không có công việc nào cần xử lý. Bạn có thể tạo yêu cầu mới nếu cần.'
            : 'Không có công việc nào cần xử lý. Chờ công việc mới được giao.'
          }
        </p>
        {canCreateTask && (
          <Button onClick={() => setShowRoomSelect(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tạo yêu cầu công việc
          </Button>
        )}

        <RoomSelectDialog
          open={showRoomSelect}
          onOpenChange={setShowRoomSelect}
          onSelectRoom={handleRoomSelect}
        />

        {selectedRoom && (
          <CreateTaskDialog
            open={showCreateTask}
            onOpenChange={setShowCreateTask}
            roomId={selectedRoom.id}
            roomNumber={selectedRoom.room_number}
            hotelId={selectedRoom.hotel_id}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 px-4 pt-4">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={cn(
            'flex flex-col items-center p-3 rounded-lg border transition-colors',
            activeFilter === 'all' 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:bg-muted/50'
          )}
        >
          <span className="text-2xl font-bold">{totalMyTasks}</span>
          <span className="text-xs text-muted-foreground">Của tôi</span>
        </button>
        
        <button
          type="button"
          onClick={() => setActiveFilter('pending')}
          className={cn(
            'flex flex-col items-center p-3 rounded-lg border transition-colors',
            activeFilter === 'pending' 
              ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' 
              : 'border-border hover:bg-muted/50'
          )}
        >
          <span className={cn(
            'text-2xl font-bold',
            urgentTasks.length > 0 ? 'text-red-600' : 'text-amber-600'
          )}>
            {pendingTasks.length}
          </span>
          <span className="text-xs text-muted-foreground">Chờ xử lý</span>
        </button>
        
        <button
          type="button"
          onClick={() => setActiveFilter('in_progress')}
          className={cn(
            'flex flex-col items-center p-3 rounded-lg border transition-colors',
            activeFilter === 'in_progress' 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
              : 'border-border hover:bg-muted/50'
          )}
        >
          <span className="text-2xl font-bold text-blue-600">
            {inProgressTasks.length}
          </span>
          <span className="text-xs text-muted-foreground">Đang làm</span>
        </button>
      </div>

      {/* Urgent Alert */}
      {urgentTasks.length > 0 && activeFilter !== 'in_progress' && (
        <div className="mx-4 p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {urgentTasks.length} công việc cần xử lý gấp
            </span>
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="px-4 space-y-4 pb-24">
        {/* In Progress Section */}
        {inProgressTasks.length > 0 && (activeFilter === 'all' || activeFilter === 'in_progress') && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
              <Clock className="h-4 w-4" />
              Đang thực hiện ({inProgressTasks.length})
            </div>
            {inProgressTasks.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                onClick={() => setSelectedTaskId(task.id)}
              />
            ))}
          </div>
        )}

        {/* Pending Section */}
        {pendingTasks.length > 0 && (activeFilter === 'all' || activeFilter === 'pending') && (
          <div className="space-y-2">
            {(activeFilter === 'all' && inProgressTasks.length > 0) && (
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mt-4">
                <Inbox className="h-4 w-4" />
                Chờ xử lý ({pendingTasks.length})
              </div>
            )}
            {pendingTasks.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                onClick={() => setSelectedTaskId(task.id)}
              />
            ))}
          </div>
        )}

        {/* Unassigned Tasks Section */}
        {totalUnassigned > 0 && activeFilter === 'all' && (
          <div className="space-y-2 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4" />
              Công việc chờ nhận ({totalUnassigned})
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Các công việc chưa được giao cho ai. Bạn có thể nhận để thực hiện.
            </p>
            {unassignedTasks?.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                showClaimButton 
                onClick={() => setSelectedTaskId(task.id)}
              />
            ))}
          </div>
        )}

        {/* Empty state for filtered view */}
        {activeFilter !== 'all' && (
          activeFilter === 'pending' ? pendingTasks.length === 0 : inProgressTasks.length === 0
        ) && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Không có công việc {activeFilter === 'pending' ? 'chờ xử lý' : 'đang thực hiện'}</p>
          </div>
        )}

        {/* Create Task Button - Only for managers */}
        {canCreateTask && (
          <div className="pt-4">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowRoomSelect(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Tạo yêu cầu công việc mới
            </Button>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <RoomSelectDialog
        open={showRoomSelect}
        onOpenChange={setShowRoomSelect}
        onSelectRoom={handleRoomSelect}
      />

      {selectedRoom && (
        <CreateTaskDialog
          open={showCreateTask}
          onOpenChange={setShowCreateTask}
          roomId={selectedRoom.id}
          roomNumber={selectedRoom.room_number}
          hotelId={selectedRoom.hotel_id}
        />
      )}

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onOpenChange={(open) => !open && setSelectedTaskId(null)}
      />
    </div>
  )
}
