import { useState, useEffect } from 'react'
import { CheckCircle2, Clock, AlertTriangle, Inbox } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { TaskCard } from './TaskCard'
import { useMyTasks } from '@/hooks/useHousekeepingTasks'
import { cn } from '@/lib/utils'
import type { HousekeepingTaskWithDetails } from '@/types/housekeeping.types'

export function StaffTasksTab() {
  const { data: tasks, isLoading } = useMyTasks()
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'in_progress'>('all')

  // Separate tasks by status
  const pendingTasks = tasks?.filter(t => t.status === 'pending') || []
  const inProgressTasks = tasks?.filter(t => t.status === 'in_progress') || []
  const urgentTasks = pendingTasks.filter(t => t.priority === 'urgent' || t.priority === 'high')

  // Filter tasks based on active filter
  const filteredTasks = activeFilter === 'all' 
    ? tasks 
    : tasks?.filter(t => t.status === activeFilter)

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (!tasks?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-6">
        <div className="w-20 h-20 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-4">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
        </div>
        <h3 className="font-semibold text-lg mb-1">Tuyệt vời!</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Bạn đã hoàn thành tất cả công việc được giao. 
          Nghỉ ngơi hoặc kiểm tra phòng mới nhé!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 px-4 pt-4">
        <button
          onClick={() => setActiveFilter('all')}
          className={cn(
            'flex flex-col items-center p-3 rounded-lg border transition-colors',
            activeFilter === 'all' 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:bg-muted/50'
          )}
        >
          <span className="text-2xl font-bold">{tasks.length}</span>
          <span className="text-xs text-muted-foreground">Tất cả</span>
        </button>
        
        <button
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
      <div className="px-4 space-y-3 pb-24">
        {/* In Progress Section */}
        {inProgressTasks.length > 0 && (activeFilter === 'all' || activeFilter === 'in_progress') && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
              <Clock className="h-4 w-4" />
              Đang thực hiện ({inProgressTasks.length})
            </div>
            {inProgressTasks.map(task => (
              <TaskCard key={task.id} task={task} />
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
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}

        {/* Empty state for filtered view */}
        {filteredTasks?.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Không có công việc {activeFilter === 'pending' ? 'chờ xử lý' : 'đang thực hiện'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
