import { CheckCircle, Package, Truck, Lock, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { RouteStatus } from '@/types/route-batch.types'

interface DeliveryStepWizardProps {
  status: RouteStatus
  assignedToName?: string | null
  totalStops: number
  completedStops: number
  pendingStops: number
  isWarehouseManager: boolean
  isAssignee: boolean
  onHandoverBatch?: () => void
  onConfirmReceive?: () => void
  onCloseRoute?: () => void
  isHandingOver?: boolean
  isConfirmingReceive?: boolean
  isClosing?: boolean
}

type Step = {
  id: string
  label: string
  icon: React.ElementType
  status: 'completed' | 'current' | 'upcoming'
  description?: string
}

export function DeliveryStepWizard({
  status,
  assignedToName,
  totalStops,
  completedStops,
  pendingStops,
  isWarehouseManager,
  isAssignee,
  onHandoverBatch,
  onConfirmReceive,
  onCloseRoute,
  isHandingOver,
  isConfirmingReceive,
  isClosing,
}: DeliveryStepWizardProps) {
  const progressPercent = totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0
  
  // Determine current step based on status
  const getCurrentStep = (): number => {
    switch (status) {
      case 'pending': return 1
      case 'released': return 2
      case 'in_progress': return 3
      case 'completed': return 4
      case 'closed': return 5
      default: return 1
    }
  }
  
  const currentStep = getCurrentStep()
  
  const steps: Step[] = [
    {
      id: 'prepare',
      label: 'Chuẩn bị hàng',
      icon: Package,
      status: currentStep > 1 ? 'completed' : currentStep === 1 ? 'current' : 'upcoming',
    },
    {
      id: 'release',
      label: 'Nhận hàng',
      icon: Truck,
      status: currentStep > 2 ? 'completed' : currentStep === 2 ? 'current' : 'upcoming',
    },
    {
      id: 'deliver',
      label: 'Giao hàng',
      icon: CheckCircle,
      status: currentStep > 3 ? 'completed' : currentStep === 3 ? 'current' : 'upcoming',
    },
    {
      id: 'close',
      label: 'Hoàn thành',
      icon: Lock,
      status: currentStep >= 4 ? 'completed' : 'upcoming',
    },
  ]

  // Render the guidance and action based on current status and user role
  const renderGuidance = () => {
    // Step 1: Pending - Warehouse manager needs to handover
    if (status === 'pending') {
      if (isWarehouseManager) {
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Lấy hàng theo danh sách bên dưới, sau đó ấn nút để giao cho nhân viên 
              {assignedToName && <strong> {assignedToName}</strong>}
            </p>
            {onHandoverBatch && (
              <Button 
                onClick={onHandoverBatch} 
                disabled={isHandingOver}
                className="w-full h-12 text-base gap-2"
                size="lg"
              >
                <Package className="h-5 w-5" />
                {isHandingOver ? 'Đang xử lý...' : 'Giao hàng cho nhân viên'}
              </Button>
            )}
          </div>
        )
      } else if (isAssignee) {
        return (
          <div className="flex items-center gap-3 text-amber-600 dark:text-amber-500">
            <Clock className="h-5 w-5" />
            <p className="text-sm">Vui lòng chờ quản lý kho giao hàng cho bạn</p>
          </div>
        )
      }
    }

    // Step 2: Released - Assignee needs to confirm receipt
    if (status === 'released') {
      if (isAssignee) {
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Bạn đã nhận đủ hàng từ kho? Kiểm tra và xác nhận để bắt đầu giao.
            </p>
            {onConfirmReceive && (
              <Button 
                onClick={onConfirmReceive} 
                disabled={isConfirmingReceive}
                className="w-full h-14 text-lg gap-2"
                size="lg"
              >
                <CheckCircle className="h-6 w-6" />
                {isConfirmingReceive ? 'Đang xử lý...' : 'Xác nhận đã nhận đủ hàng'}
              </Button>
            )}
          </div>
        )
      } else {
        return (
          <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
            <Truck className="h-5 w-5" />
            <p className="text-sm">
              Đang chờ {assignedToName || 'nhân viên'} xác nhận nhận hàng
            </p>
          </div>
        )
      }
    }

    // Step 3: In Progress - Show delivery progress
    if (status === 'in_progress') {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tiến độ giao hàng</span>
            <span className="font-medium">{completedStops}/{totalStops} phòng</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          {pendingStops > 0 && (
            <p className="text-sm text-muted-foreground">
              Còn {pendingStops} phòng cần giao. Đến từng phòng và ấn "Giao" để xác nhận.
            </p>
          )}
        </div>
      )
    }

    // Step 4: Completed - Can close route
    if (status === 'completed') {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-500">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Đã giao xong tất cả {totalStops} phòng!</span>
          </div>
          {isWarehouseManager && onCloseRoute && (
            <Button 
              onClick={onCloseRoute} 
              disabled={isClosing}
              variant="secondary"
              className="gap-2"
            >
              <Lock className="h-4 w-4" />
              {isClosing ? 'Đang đóng...' : 'Đóng phiếu'}
            </Button>
          )}
        </div>
      )
    }

    // Closed
    if (status === 'closed') {
      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Lock className="h-5 w-5" />
          <span>Phiếu đã được đóng</span>
        </div>
      )
    }

    return null
  }

  return (
    <div className="border rounded-lg bg-card p-4 space-y-4">
      {/* Step indicators */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                  step.status === 'completed' && 'bg-green-500 text-white',
                  step.status === 'current' && 'bg-primary text-primary-foreground',
                  step.status === 'upcoming' && 'bg-muted text-muted-foreground'
                )}
              >
                <step.icon className="h-4 w-4" />
              </div>
              <span
                className={cn(
                  'text-xs mt-1 text-center',
                  step.status === 'current' && 'font-medium text-foreground',
                  step.status !== 'current' && 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-2',
                  step.status === 'completed' ? 'bg-green-500' : 'bg-muted'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Guidance and action */}
      <div className="pt-2 border-t">
        {renderGuidance()}
      </div>
    </div>
  )
}
