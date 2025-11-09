import { Check, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

interface BatchStatusTimelineProps {
  batch: any
}

export function BatchStatusTimeline({ batch }: BatchStatusTimelineProps) {
  const steps = [
    {
      key: 'delivered',
      label: 'Đã giao',
      date: batch.delivery_date,
      completed: true,
    },
    {
      key: 'washing',
      label: 'Đang giặt',
      date: batch.status === 'washing' || batch.status === 'ready' || batch.status === 'received' 
        ? batch.delivery_date 
        : null,
      completed: ['washing', 'ready', 'received'].includes(batch.status),
    },
    {
      key: 'ready',
      label: 'Sẵn sàng nhận',
      date: batch.expected_return_date,
      completed: ['ready', 'received'].includes(batch.status),
      isExpected: batch.status !== 'received',
    },
    {
      key: 'received',
      label: 'Đã nhận về',
      date: batch.actual_return_date,
      completed: batch.status === 'received',
    },
  ]
  
  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <div key={step.key} className="flex gap-4">
          {/* Icon */}
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border-2',
                step.completed
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-muted bg-background text-muted-foreground'
              )}
            >
              {step.completed ? (
                <Check className="h-4 w-4" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'h-12 w-0.5',
                  step.completed ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 pb-4">
            <p className={cn(
              'font-medium',
              step.completed ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {step.label}
            </p>
            {step.date && (
              <p className="text-sm text-muted-foreground">
                {step.isExpected && 'Dự kiến: '}
                {format(new Date(step.date), 'PPP HH:mm', { locale: vi })}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
