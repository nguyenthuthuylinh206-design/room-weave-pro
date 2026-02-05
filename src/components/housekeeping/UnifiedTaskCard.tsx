 import { useState } from 'react'
 import { useNavigate } from 'react-router-dom'
 import { formatDistanceToNow } from 'date-fns'
 import { vi } from 'date-fns/locale'
 import { 
   ClipboardCheck, 
   Sparkles, 
   DoorOpen, 
   Package, 
   PackageCheck,
   MoreHorizontal,
   Clock,
   PackageSearch,
   ExternalLink
 } from 'lucide-react'
 import { Badge } from '@/components/ui/badge'
 import { Button } from '@/components/ui/button'
 import { cn } from '@/lib/utils'
 import type { UnifiedTask } from '@/hooks/useUnifiedTasks'
 
 // Icons for housekeeping task types
 const HOUSEKEEPING_ICONS: Record<string, typeof ClipboardCheck> = {
   checkout_inspection: ClipboardCheck,
   cleaning: Sparkles,
   checkin_prep: DoorOpen,
   amenity_request: Package,
   delivery_confirmation: PackageCheck,
   other: MoreHorizontal
 }
 
 // Source icons and colors
 const SOURCE_CONFIG = {
   housekeeping: { icon: ClipboardCheck, label: 'Buồng phòng', color: 'text-foreground' },
   stock_adjustment: { icon: PackageSearch, label: 'Kiểm kê', color: 'text-amber-600' },
 } as const
 
 const PRIORITY_BADGE_STYLES = {
   low: 'bg-muted text-muted-foreground',
   medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
   high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
   urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
 }
 
 const PRIORITY_LABELS = {
   low: 'Thấp',
   medium: 'Trung bình',
   high: 'Cao',
   urgent: 'Khẩn cấp'
 }
 
 interface UnifiedTaskCardProps {
   task: UnifiedTask
   onClick?: () => void
 }
 
 export function UnifiedTaskCard({ task, onClick }: UnifiedTaskCardProps) {
   const navigate = useNavigate()
   const isUrgent = task.priority === 'urgent' || task.priority === 'high'
   const isInProgress = task.status === 'in_progress'
   
   // Get source config
   const sourceConfig = SOURCE_CONFIG[task.source]
   
   // Get icon based on source
   let Icon = sourceConfig.icon
   if (task.source === 'housekeeping' && task.originalHousekeepingTask) {
     const taskType = task.originalHousekeepingTask.task_type
     Icon = HOUSEKEEPING_ICONS[taskType] || ClipboardCheck
   }
   
   // Calculate elapsed time for in_progress tasks
   const startedAt = task.source === 'housekeeping' 
     ? task.originalHousekeepingTask?.started_at
     : task.originalStockAdjustment?.started_at
   const elapsedTime = startedAt 
     ? formatDistanceToNow(new Date(startedAt), { locale: vi, addSuffix: false })
     : null
 
   const handleClick = () => {
     if (onClick) {
       onClick()
     }
   }
 
   const handleGoToTask = (e: React.MouseEvent) => {
     e.stopPropagation()
     navigate(task.actionUrl)
   }
 
   return (
     <div 
       onClick={handleClick}
       className={cn(
         'border rounded-lg p-3 transition-colors',
         onClick && 'cursor-pointer hover:bg-muted/50',
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
               isUrgent ? 'text-red-600' : sourceConfig.color
             )} />
           </div>
           <div className="min-w-0">
             <div className="flex items-center gap-2 flex-wrap">
               {task.roomNumber && (
                 <span className="font-medium text-sm">
                   P.{task.roomNumber}
                 </span>
               )}
               <Badge 
                 variant="outline" 
                 className={cn('text-[10px] h-5', PRIORITY_BADGE_STYLES[task.priority])}
               >
                 {PRIORITY_LABELS[task.priority]}
               </Badge>
               <Badge 
                 variant="secondary" 
                 className="text-[10px] h-5"
               >
                 {sourceConfig.label}
               </Badge>
             </div>
             <p className="text-xs text-muted-foreground truncate">
               {task.title}
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
 
       {/* Description */}
       {task.description && (
         <div className="text-xs text-muted-foreground mb-3">
           <p className="line-clamp-2">{task.description}</p>
         </div>
       )}
 
       {/* Time info */}
       <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
         <span>
           {formatDistanceToNow(new Date(task.createdAt), { 
             locale: vi, 
             addSuffix: true 
           })}
         </span>
         {task.dueAt && (
           <span className={cn(
             new Date(task.dueAt) < new Date() && 'text-red-600 font-medium'
           )}>
             Deadline: {new Date(task.dueAt).toLocaleTimeString('vi-VN', { 
               hour: '2-digit', 
               minute: '2-digit' 
             })}
           </span>
         )}
       </div>
 
       {/* Action button for non-housekeeping tasks */}
       {task.source !== 'housekeeping' && (
         <Button 
           size="sm" 
           variant="outline"
           className="w-full h-8"
           onClick={handleGoToTask}
         >
           <ExternalLink className="h-3.5 w-3.5 mr-1" />
           Mở chi tiết
         </Button>
       )}
     </div>
   )
 }