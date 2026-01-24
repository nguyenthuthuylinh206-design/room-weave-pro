import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  ClipboardCheck, 
  Sparkles, 
  DoorOpen, 
  Package, 
  MoreHorizontal,
  Loader2
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useCreateTask } from '@/hooks/useHousekeepingTasks'
import { useHotelStaffList } from '@/hooks/useHotelStaffList'
import { cn } from '@/lib/utils'
import type { TaskType, TaskPriority } from '@/types/housekeeping.types'
import { TASK_TYPE_LABELS, PRIORITY_LABELS } from '@/types/housekeeping.types'

const TASK_ICONS: Record<TaskType, typeof ClipboardCheck> = {
  checkout_inspection: ClipboardCheck,
  cleaning: Sparkles,
  checkin_prep: DoorOpen,
  amenity_request: Package,
  delivery_confirmation: Package, // System-created task
  other: MoreHorizontal
}

// Task types available for manual creation (excludes system-created types)
const MANUAL_TASK_TYPES: TaskType[] = ['checkout_inspection', 'cleaning', 'checkin_prep', 'amenity_request', 'other']

const formSchema = z.object({
  task_type: z.enum(['checkout_inspection', 'cleaning', 'checkin_prep', 'amenity_request', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assigned_to: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

// Task types that can be manually created
type ManualTaskType = 'checkout_inspection' | 'cleaning' | 'checkin_prep' | 'amenity_request' | 'other'

interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roomId: string
  roomNumber: string
  hotelId: string
  bookingId?: string
  defaultTaskType?: ManualTaskType
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  roomId,
  roomNumber,
  hotelId,
  bookingId,
  defaultTaskType = 'cleaning'
}: CreateTaskDialogProps) {
  const { mutateAsync: createTask, isPending } = useCreateTask()
  const { data: staffList } = useHotelStaffList(hotelId)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      task_type: defaultTaskType,
      priority: 'medium',
      assigned_to: '',
      title: '',
      description: '',
      notes: '',
    }
  })

  const selectedTaskType = form.watch('task_type')

  const onSubmit = async (data: FormData) => {
    try {
      await createTask({
        hotel_id: hotelId,
        room_id: roomId,
        booking_id: bookingId,
        task_type: data.task_type as TaskType,
        priority: data.priority as TaskPriority,
        assigned_to: data.assigned_to || undefined,
        title: data.title || undefined,
        description: data.description || undefined,
        notes: data.notes || undefined,
      })
      
      form.reset()
      onOpenChange(false)
    } catch (error) {
      // Error handled in hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo yêu cầu công việc - P.{roomNumber}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Task Type */}
            <FormField
              control={form.control}
              name="task_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loại công việc</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {MANUAL_TASK_TYPES.map((type) => {
                      const Icon = TASK_ICONS[type]
                      const isSelected = field.value === type
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => field.onChange(type)}
                          className={cn(
                            'flex items-center gap-2 p-2.5 rounded-lg border text-left transition-colors',
                            isSelected 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:bg-muted/50'
                          )}
                        >
                          <Icon className={cn(
                            'h-4 w-4 shrink-0',
                            isSelected ? 'text-primary' : 'text-muted-foreground'
                          )} />
                          <span className="text-sm truncate">{TASK_TYPE_LABELS[type]}</span>
                        </button>
                      )
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Priority */}
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mức độ ưu tiên</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex gap-2"
                    >
                      {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((priority) => (
                        <div key={priority} className="flex items-center">
                          <RadioGroupItem
                            value={priority}
                            id={`priority-${priority}`}
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor={`priority-${priority}`}
                            className={cn(
                              'cursor-pointer px-3 py-1.5 rounded-full border text-xs font-medium transition-colors',
                              'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5',
                              priority === 'urgent' && 'peer-data-[state=checked]:border-red-500 peer-data-[state=checked]:bg-red-50 peer-data-[state=checked]:text-red-700',
                              priority === 'high' && 'peer-data-[state=checked]:border-orange-500 peer-data-[state=checked]:bg-orange-50 peer-data-[state=checked]:text-orange-700',
                              priority === 'medium' && 'peer-data-[state=checked]:border-amber-500 peer-data-[state=checked]:bg-amber-50 peer-data-[state=checked]:text-amber-700',
                              priority === 'low' && 'peer-data-[state=checked]:border-muted-foreground peer-data-[state=checked]:bg-muted'
                            )}
                          >
                            {PRIORITY_LABELS[priority]}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Assign to */}
            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Giao cho (tùy chọn)</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Chọn nhân viên" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {staffList?.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          {staff.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Title (optional) */}
            {selectedTaskType === 'other' && (
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tiêu đề</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nhập tiêu đề công việc" className="h-9" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú chi tiết</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Mô tả chi tiết yêu cầu..."
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 h-9"
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isPending} className="flex-1 h-9">
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Gửi yêu cầu
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
