import { useState } from 'react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { 
  ClipboardCheck, 
  User, 
  Clock, 
  Loader2, 
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useHotelStaffList } from '@/hooks/useHotelStaffList'
import { useCheckoutInspection } from '@/hooks/useCheckoutInspection'
import type { CheckoutInspectionRequestWithDetails } from '@/types/checkout-inspection.types'
import { cn } from '@/lib/utils'

interface CheckoutInspectionSectionProps {
  bookingId: string
  roomId: string
  hotelId: string
  tenantId: string
  inspection: CheckoutInspectionRequestWithDetails | null
  isLoadingInspection: boolean
  onCreateInspection: (assignedTo: string) => Promise<void>
  onCancelInspection: (inspectionId: string) => Promise<void>
}

export function CheckoutInspectionSection({
  bookingId,
  roomId,
  hotelId,
  tenantId,
  inspection,
  isLoadingInspection,
  onCreateInspection,
  onCancelInspection,
}: CheckoutInspectionSectionProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { data: staffList = [], isLoading: isLoadingStaff } = useHotelStaffList(hotelId)
  
  const handleRequestInspection = async () => {
    if (!selectedStaffId) return
    setIsSubmitting(true)
    try {
      await onCreateInspection(selectedStaffId)
      setSelectedStaffId('')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleCancelInspection = async () => {
    if (!inspection?.id) return
    setIsSubmitting(true)
    try {
      await onCancelInspection(inspection.id)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Show loading state
  if (isLoadingInspection) {
    return (
      <div className="p-3 border rounded-lg bg-muted/30 flex items-center justify-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Đang tải...</span>
      </div>
    )
  }
  
  // Show completed inspection status
  if (inspection?.status === 'completed') {
    return (
      <div className="p-3 border border-green-500/50 rounded-lg bg-green-50 dark:bg-green-950/30">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-medium">Kiểm tra hoàn thành</span>
        </div>
        <div className="mt-2 text-sm text-green-600 dark:text-green-500">
          <p>Nhân viên: {inspection.assigned_user?.full_name}</p>
          {inspection.completed_at && (
            <p>Hoàn thành lúc: {format(new Date(inspection.completed_at), 'HH:mm dd/MM', { locale: vi })}</p>
          )}
        </div>
      </div>
    )
  }
  
  // Show in-progress status
  if (inspection?.status === 'in_progress') {
    return (
      <div className="p-3 border border-blue-500/50 rounded-lg bg-blue-50 dark:bg-blue-950/30">
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="font-medium">Đang kiểm tra phòng</span>
        </div>
        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-500">
            <User className="h-4 w-4" />
            <span>Nhân viên: {inspection.assigned_user?.full_name}</span>
          </div>
          {inspection.started_at && (
            <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-500">
              <Clock className="h-4 w-4" />
              <span>Bắt đầu: {format(new Date(inspection.started_at), 'HH:mm dd/MM', { locale: vi })}</span>
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCancelInspection}
          disabled={isSubmitting}
          className="mt-2 h-7 text-xs gap-1"
        >
          {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
          Hủy yêu cầu
        </Button>
      </div>
    )
  }
  
  // Show pending status
  if (inspection?.status === 'pending') {
    return (
      <div className="p-3 border border-amber-500/50 rounded-lg bg-amber-50 dark:bg-amber-950/30">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">Đang chờ kiểm tra</span>
        </div>
        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500">
            <User className="h-4 w-4" />
            <span>Nhân viên: {inspection.assigned_user?.full_name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500">
            <Clock className="h-4 w-4" />
            <span>Yêu cầu lúc: {format(new Date(inspection.created_at), 'HH:mm dd/MM', { locale: vi })}</span>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCancelInspection}
          disabled={isSubmitting}
          className="mt-2 h-7 text-xs gap-1"
        >
          {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
          Hủy yêu cầu
        </Button>
      </div>
    )
  }
  
  // Show form to create new inspection request
  return (
    <div className="p-3 border rounded-lg bg-muted/30 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ClipboardCheck className="h-4 w-4" />
        <span>Yêu cầu kiểm tra phòng trước checkout</span>
      </div>
      
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Chọn nhân viên kiểm tra</Label>
        <Select 
          value={selectedStaffId} 
          onValueChange={setSelectedStaffId}
          disabled={isLoadingStaff}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder={isLoadingStaff ? 'Đang tải...' : 'Chọn nhân viên'} />
          </SelectTrigger>
          <SelectContent>
            {staffList.map((staff) => (
              <SelectItem key={staff.id} value={staff.id}>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={staff.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {staff.full_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm">{staff.full_name}</span>
                    {staff.position_name && (
                      <span className="text-xs text-muted-foreground">{staff.position_name}</span>
                    )}
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleRequestInspection}
        disabled={!selectedStaffId || isSubmitting}
        className="w-full h-8 gap-2"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ClipboardCheck className="h-4 w-4" />
        )}
        Gửi yêu cầu kiểm tra
      </Button>
    </div>
  )
}
