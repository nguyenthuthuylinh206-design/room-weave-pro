import { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
  Users,
  DoorOpen,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Minimize2,
  CreditCard,
  ClipboardCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { formatVNCurrency } from '@/lib/pricing'
import { useGroupBooking, GroupBookingRoom } from '@/hooks/useGroupBooking'
import { supabase } from '@/integrations/supabase/client'
import { cn } from '@/lib/utils'
import { GroupPaymentDialog } from './GroupPaymentDialog'

export interface GroupCheckoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingGroupId: string
  tenantId: string
  hotelId: string
  onCheckoutComplete?: () => void
  onMinimize?: () => void
}

interface InspectionStatus {
  bookingId: string
  roomId: string
  status: 'pending' | 'in_progress' | 'completed' | 'not_requested'
  lateCheckoutCharge?: number
  damageCharge?: number
  inspectionId?: string
  startedAt?: string
}

export function GroupCheckoutDialog({
  open,
  onOpenChange,
  bookingGroupId,
  tenantId,
  hotelId,
  onCheckoutComplete,
  onMinimize,
}: GroupCheckoutDialogProps) {
  const queryClient = useQueryClient()
  const { data: groupData, isLoading: isLoadingGroup } = useGroupBooking(bookingGroupId)
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)

  // Fetch inspection statuses for all bookings in the group
  const { data: inspectionStatuses, isLoading: isLoadingInspections } = useQuery({
    queryKey: ['group-inspections', bookingGroupId],
    queryFn: async (): Promise<InspectionStatus[]> => {
      if (!groupData?.bookings) return []

      const bookingIds = groupData.bookings.map(b => b.id)
      
      // Get inspection requests
      const { data: inspections, error } = await supabase
        .from('checkout_inspection_requests')
        .select('*')
        .in('booking_id', bookingIds)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get room checks for damage info
      const { data: roomChecks } = await supabase
        .from('room_checks')
        .select('room_id, items_lost, items_damaged')
        .in('room_id', groupData.bookings.map(b => b.room_id))
        .in('check_type', ['checkout'])
        .order('created_at', { ascending: false })

      // Map bookings to their inspection status
      return groupData.bookings.map(booking => {
        const inspection = inspections?.find(i => i.booking_id === booking.id)
        const roomCheck = roomChecks?.find(c => c.room_id === booking.room_id)
        
        // Calculate damage charge from room check
        let damageCharge = 0
        if (roomCheck) {
          const lost = roomCheck.items_lost as any[] || []
          const damaged = roomCheck.items_damaged as any[] || []
          damageCharge = [...lost, ...damaged].reduce((sum, item) => 
            sum + (item.charge_amount || 0) * (item.quantity || 1), 0
          )
        }

        if (!inspection) {
          return {
            bookingId: booking.id,
            roomId: booking.room_id,
            status: 'not_requested' as const,
            lateCheckoutCharge: 0,
            damageCharge,
          }
        }

        return {
          bookingId: booking.id,
          roomId: booking.room_id,
          status: inspection.status as 'pending' | 'in_progress' | 'completed',
          inspectionId: inspection.id,
          startedAt: inspection.started_at,
          lateCheckoutCharge: 0, // Would need to calculate from actual checkout time
          damageCharge,
        }
      })
    },
    enabled: !!groupData?.bookings && open,
    refetchInterval: 10000, // Refresh every 10 seconds
  })

  // Calculate totals
  const totals = useMemo(() => {
    if (!groupData || !inspectionStatuses) {
      return { roomTotal: 0, lateCharges: 0, damageCharges: 0, totalPaid: 0, grandTotal: 0, remaining: 0 }
    }

    const roomTotal = groupData.totalAmount
    const lateCharges = inspectionStatuses.reduce((sum, i) => sum + (i.lateCheckoutCharge || 0), 0)
    const damageCharges = inspectionStatuses.reduce((sum, i) => sum + (i.damageCharge || 0), 0)
    const totalPaid = groupData.totalPaid
    const grandTotal = roomTotal + lateCharges + damageCharges
    const remaining = grandTotal - totalPaid

    return { roomTotal, lateCharges, damageCharges, totalPaid, grandTotal, remaining }
  }, [groupData, inspectionStatuses])

  // Check if all rooms are ready for checkout
  const allRoomsReady = useMemo(() => {
    if (!inspectionStatuses) return false
    return inspectionStatuses.every(i => 
      i.status === 'completed' || i.status === 'not_requested'
    )
  }, [inspectionStatuses])

  const roomsInProgress = inspectionStatuses?.filter(i => i.status === 'in_progress').length || 0
  const roomsPending = inspectionStatuses?.filter(i => i.status === 'pending').length || 0

  // Request inspection for a room
  const handleRequestInspection = async (booking: GroupBookingRoom) => {
    try {
      // Get current user
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        toast.error('Vui lòng đăng nhập lại')
        return
      }

      // Create inspection request
      const { error } = await supabase
        .from('checkout_inspection_requests')
        .insert({
          tenant_id: tenantId,
          hotel_id: hotelId,
          booking_id: booking.id,
          room_id: booking.room_id,
          assigned_to: userData.user.id,
          requested_by: userData.user.id,
          status: 'pending',
        })

      if (error) throw error

      toast.success(`Đã gửi yêu cầu kiểm tra phòng ${booking.room?.room_number}`)
      queryClient.invalidateQueries({ queryKey: ['group-inspections', bookingGroupId] })
    } catch (error) {
      console.error('Error requesting inspection:', error)
      toast.error('Không thể gửi yêu cầu kiểm tra')
    }
  }

  // Perform group checkout
  const handleGroupCheckout = async () => {
    if (!groupData || totals.remaining > 0) {
      setShowPaymentDialog(true)
      return
    }

    setIsProcessing(true)
    try {
      const now = new Date().toISOString()

      // Update all bookings to checked_out
      for (const booking of groupData.bookings) {
        if (booking.status !== 'checked_out') {
          await supabase
            .from('room_bookings')
            .update({
              status: 'checked_out',
              actual_check_out: now,
            })
            .eq('id', booking.id)

          // Update room status to cleaning
          await supabase
            .from('rooms')
            .update({ status: 'cleaning' })
            .eq('id', booking.room_id)
        }
      }

      toast.success(`Đã checkout ${groupData.roomCount} phòng thành công!`)
      onOpenChange(false)
      onCheckoutComplete?.()
      queryClient.invalidateQueries({ queryKey: ['all-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    } catch (error) {
      console.error('Error performing group checkout:', error)
      toast.error('Không thể thực hiện checkout nhóm')
    } finally {
      setIsProcessing(false)
    }
  }

  const getInspectionStatusBadge = (status: InspectionStatus['status']) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Đã kiểm tra
          </Badge>
        )
      case 'in_progress':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Clock className="h-3 w-3 mr-1 animate-pulse" />
            Đang kiểm tra
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="h-3 w-3 mr-1" />
            Chờ kiểm tra
          </Badge>
        )
      default:
        return null
    }
  }

  if (isLoadingGroup) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!groupData) {
    return null
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0">
          {/* Header */}
          <DialogHeader className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-base">
                <DoorOpen className="h-4 w-4" />
                Checkout nhóm
              </DialogTitle>
              {onMinimize && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onMinimize}
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {groupData.guestName} • {groupData.roomCount} phòng
            </p>
          </DialogHeader>

          <div className="flex flex-col gap-3 px-4 pb-4 overflow-hidden">
            {/* Room Inspection Status */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ClipboardCheck className="h-4 w-4" />
                Kiểm tra phòng
              </div>
              
              <ScrollArea className="max-h-[180px]">
                <div className="space-y-2">
                  {groupData.bookings.map((booking) => {
                    const inspection = inspectionStatuses?.find(i => i.bookingId === booking.id)
                    const isCheckedOut = booking.status === 'checked_out'
                    
                    return (
                      <div
                        key={booking.id}
                        className={cn(
                          "border rounded-lg p-2.5 flex items-center justify-between",
                          isCheckedOut && "bg-muted/50"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <DoorOpen className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium text-sm">
                            P.{booking.room?.room_number}
                          </span>
                          {inspection?.damageCharge && inspection.damageCharge > 0 && (
                            <span className="text-xs text-red-600">
                              +{formatVNCurrency(inspection.damageCharge)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {isCheckedOut ? (
                            <Badge variant="outline" className="text-muted-foreground">
                              Đã trả
                            </Badge>
                          ) : inspection ? (
                            getInspectionStatusBadge(inspection.status)
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => handleRequestInspection(booking)}
                            >
                              Gửi yêu cầu
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>

              {/* Inspection Progress */}
              {(roomsInProgress > 0 || roomsPending > 0) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-amber-700">
                    {roomsInProgress > 0 && `${roomsInProgress} phòng đang kiểm tra`}
                    {roomsInProgress > 0 && roomsPending > 0 && ', '}
                    {roomsPending > 0 && `${roomsPending} phòng chờ kiểm tra`}
                  </span>
                </div>
              )}
            </div>

            <Separator />

            {/* Payment Summary */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CreditCard className="h-4 w-4" />
                Thanh toán
              </div>

              <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tiền phòng ({groupData.roomCount} phòng)</span>
                  <span className="font-mono">{formatVNCurrency(totals.roomTotal)}</span>
                </div>
                
                {totals.lateCharges > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Phí checkout muộn</span>
                    <span className="font-mono text-amber-600">+{formatVNCurrency(totals.lateCharges)}</span>
                  </div>
                )}
                
                {totals.damageCharges > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Phí đền bù</span>
                    <span className="font-mono text-red-600">+{formatVNCurrency(totals.damageCharges)}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Đã thanh toán</span>
                  <span className="font-mono text-green-600">-{formatVNCurrency(totals.totalPaid)}</span>
                </div>
                
                <Separator className="my-1.5" />
                
                <div className="flex justify-between font-medium">
                  <span>CẦN THU</span>
                  <span className={cn(
                    "font-mono text-lg",
                    totals.remaining > 0 ? "text-primary" : "text-green-600"
                  )}>
                    {formatVNCurrency(totals.remaining)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {onMinimize && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={onMinimize}
                >
                  <Minimize2 className="h-4 w-4 mr-1.5" />
                  Thu nhỏ
                </Button>
              )}
              
              <Button
                className="flex-1"
                disabled={isProcessing}
                onClick={handleGroupCheckout}
              >
                {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {totals.remaining > 0 ? (
                  <>
                    <CreditCard className="h-4 w-4 mr-1.5" />
                    Thu tiền & Checkout
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1.5" />
                    Checkout tất cả
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <GroupPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        bookingGroupId={bookingGroupId}
        tenantId={tenantId}
        hotelId={hotelId}
        onPaymentComplete={() => {
          setShowPaymentDialog(false)
          queryClient.invalidateQueries({ queryKey: ['group-booking', bookingGroupId] })
          // If fully paid, proceed with checkout
          if (totals.remaining <= 0) {
            handleGroupCheckout()
          }
        }}
      />
    </>
  )
}
