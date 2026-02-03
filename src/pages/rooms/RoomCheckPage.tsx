import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Check, Loader2, ClipboardCheck, LogIn, LogOut, Settings, Clock, Package, PackagePlus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { roomCheckFormSchema } from '@/lib/validations/rooms.schemas'
import { getCheckTypeConfig, type CheckType } from '@/lib/roomCheckConfig'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Form } from '@/components/ui/form'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useRoom } from '@/hooks/useRooms'
import { useCreateRoomCheck } from '@/hooks/useRoomChecks'
import { useUser } from '@/hooks/useUser'
import { useRoomCheckSession } from '@/hooks/useRoomCheckSession'
import { useRoomBooking } from '@/hooks/useRoomBooking'
import { usePendingInspections, useRoomHasPendingInspection, useAutoCreateCheckoutInspection } from '@/hooks/useCheckoutInspection'
import { useCreateMultipleChargeableConsumptions, type CreateChargeableConsumptionInput } from '@/hooks/useChargeableConsumptions'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { CheckTypeStep } from '@/components/rooms/check-steps/CheckTypeStep'
import { ItemsCheckStep } from '@/components/rooms/check-steps/ItemsCheckStep'
import { ReviewStep } from '@/components/rooms/check-steps/ReviewStep'
import { ChargeableItemsStep } from '@/components/rooms/check-steps/ChargeableItemsStep'
import { CleaningRequestStep } from '@/components/rooms/check-steps/CleaningRequestStep'
import { Phase1ConfirmStep } from '@/components/rooms/check-steps/Phase1ConfirmStep'
import { DeliveryItemsStep } from '@/components/rooms/check-steps/DeliveryItemsStep'
import { cn } from '@/lib/utils'
import type { RoomCheckFormData, LostItem, DamagedItem } from '@/types/rooms.types'

// Icon mapping for check types
const CHECK_TYPE_ICONS: Record<CheckType, any> = {
  daily: ClipboardCheck,
  checkin: LogIn,
  checkout: LogOut,
  maintenance: Settings,
  delivery: Package,
  replenish: PackagePlus,
}

export function RoomCheckPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const prefilledType = searchParams.get('type') as 'daily' | 'checkin' | 'checkout' | 'maintenance' | 'delivery' | 'replenish' | null
  const shouldAutoResume = searchParams.get('resume') === 'true'
  const inspectionIdFromUrl = searchParams.get('inspection') // Lấy checkout inspection ID từ URL
  const distributionOrderId = searchParams.get('distribution_order_id') // Phiếu giao hàng
  const roomOrderId = searchParams.get('room_order_id') // Phòng trong phiếu giao
  
  const { user, hasAnyRole } = useUser()
  
  // Hook để lấy pending inspection và auto-start
  const { 
    pendingInspection, 
    isLoading: isInspectionLoading,
    startInspection 
  } = usePendingInspections(id)
  
  // Hook để kiểm tra phòng có yêu cầu inspection không (bất kể assigned cho ai)
  const { 
    roomInspection, 
    isLoading: isLoadingRoomInspection 
  } = useRoomHasPendingInspection(id)
  
  // Flag để tránh gọi startInspection nhiều lần
  const hasAutoStartedInspection = useRef(false)
  
  // Stable inspection ID để tránh race condition khi submit
  const [stableInspectionId, setStableInspectionId] = useState<string | undefined>(
    inspectionIdFromUrl || undefined
  )
  
  // Tính toán effective inspection ID (từ URL hoặc từ pending inspection)
  const effectiveInspectionId = inspectionIdFromUrl || pendingInspection?.id
  const isManager = hasAnyRole(['super_admin', 'owner', 'hotel_manager', 'department_manager'])
  const { data: roomData, isLoading } = useRoom(id)
  const { data: currentBooking } = useRoomBooking(id)
  const createCheck = useCreateRoomCheck()
  const { 
    session: existingSession, 
    isLoading: isSessionLoading,
    createSession, 
    deleteSession,
    takeOverSession 
  } = useRoomCheckSession(id)
  
  // Auto-skip step 1 if check type is provided via URL
  const shouldAutoSkip = !!prefilledType
  const initialStep = shouldAutoSkip ? 2 : 1
  
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showResumeDialog, setShowResumeDialog] = useState(false)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [showCheckinBlockDialog, setShowCheckinBlockDialog] = useState(false)
  const [showTakeOverDialog, setShowTakeOverDialog] = useState(false)
  const [conflictSession, setConflictSession] = useState<{ userName: string; startedAt: string } | null>(null)
  const [quickMode, setQuickMode] = useState(false)
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({})
  const [sessionCompleted, setSessionCompleted] = useState(false)
  const [hasResumed, setHasResumed] = useState(false) // Flag to prevent useEffect conflicts
  const [chargeableItems, setChargeableItems] = useState<CreateChargeableConsumptionInput[]>([])
  const [chargeableNotes, setChargeableNotes] = useState('')
  const [autoCreatedInspectionId, setAutoCreatedInspectionId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false) // Track submission state
  
  // NEW: 2-phase checkout state
  const [currentPhase, setCurrentPhase] = useState<1 | 2>(1)
  const [phase1Submitted, setPhase1Submitted] = useState(false)
  const [isSubmittingPhase1, setIsSubmittingPhase1] = useState(false)
  const createChargeableConsumptions = useCreateMultipleChargeableConsumptions()
  const autoCreateInspection = useAutoCreateCheckoutInspection()
  
  const form = useForm<RoomCheckFormData>({
    resolver: zodResolver(roomCheckFormSchema),
    defaultValues: {
      check_type: prefilledType || 'daily', // Pre-fill from URL
      cleanliness_score: 5,
      items_complete: true,
      items_missing: [],
      items_damaged: [],
      notes: '',
      photos: [],
      // Cleaning request defaults
      needs_cleaning: false,
      cleaning_priority: 'medium',
      cleaning_notes: '',
      room_condition: 'clean',
    },
  })
  
  // Parse data correctly from useRoom
  const room = roomData?.room
  const hotel = roomData?.hotel
  const items = roomData?.items || []
  const recentChecks = roomData?.recent_checks || []
  
  // Watch check_type từ form để detect khi user chọn checkout hoặc delivery
  const watchedCheckType = form.watch('check_type')
  
  // Calculate steps based on check type
  const isCheckoutType = watchedCheckType === 'checkout'
  const isDeliveryType = watchedCheckType === 'delivery'
  const isReplenishType = watchedCheckType === 'replenish'
  
  const getTotalSteps = () => {
    if (quickMode) return 2
    if (isCheckoutType) return 6 // Type -> Phase1 Items -> Phase1 Confirm -> Phase2 Items -> Cleaning -> Review
    if (isDeliveryType) return 3 // Type -> DeliveryItems/Cleaning -> Review
    if (isReplenishType) return 3 // Type -> Items+Cleaning -> Review
    return 3 // Type -> Items -> Review
  }
  const totalSteps = getTotalSteps()
  
  useEffect(() => {
    if (!isLoading && !room) {
      navigate('/rooms')
    }
  }, [room, isLoading, navigate])
  
  // Chặn nếu phòng có yêu cầu inspection giao cho nhân viên khác
  useEffect(() => {
    if (!isLoadingRoomInspection && roomInspection && !roomInspection.isAssignedToMe) {
      toast({
        title: 'Không có quyền',
        description: `Phòng này đang có yêu cầu kiểm tra checkout giao cho ${roomInspection.assignedUserName || 'nhân viên khác'}. Bạn không được phép kiểm tra phòng này.`,
        variant: 'destructive',
      })
      navigate('/rooms')
    }
  }, [isLoadingRoomInspection, roomInspection, navigate])
  
  // Normalize URL: nếu có pendingInspection mà URL chưa có type=checkout thì thêm vào
  useEffect(() => {
    if (
      !isInspectionLoading &&
      pendingInspection &&
      !prefilledType &&
      !inspectionIdFromUrl
    ) {
      // Navigate với replace để không tạo history mới
      navigate(`/rooms/${id}/check?type=checkout&inspection=${pendingInspection.id}`, { replace: true })
    }
  }, [isInspectionLoading, pendingInspection, prefilledType, inspectionIdFromUrl, id, navigate])
  
  // Cập nhật stableInspectionId khi pendingInspection load xong
  useEffect(() => {
    if (pendingInspection?.id && !stableInspectionId) {
      console.log('[RoomCheckPage] Setting stableInspectionId from pendingInspection:', pendingInspection.id)
      setStableInspectionId(pendingInspection.id)
    }
  }, [pendingInspection?.id, stableInspectionId])
  
  // Auto-start inspection khi nhân viên vào trang checkout hoặc chọn check_type = checkout
  // Điều này đảm bảo status được cập nhật dù nhân viên vào bằng đường nào
  useEffect(() => {
    // Derive checkout mode từ URL HOẶC từ form selection
    const isCheckoutMode = prefilledType === 'checkout' || watchedCheckType === 'checkout'
    
    // Chỉ auto-start khi:
    // 1. Đang là checkout type (từ URL hoặc form)
    // 2. Có pending inspection với status = 'pending'
    // 3. Chưa auto-start trước đó
    // 4. Không đang pending mutation
    if (
      isCheckoutMode &&
      pendingInspection?.status === 'pending' &&
      !hasAutoStartedInspection.current &&
      !startInspection.isPending
    ) {
      console.log('[RoomCheckPage] Auto-starting inspection:', pendingInspection.id)
      hasAutoStartedInspection.current = true
      startInspection.mutate(pendingInspection.id)
    }
  }, [prefilledType, watchedCheckType, pendingInspection?.id, pendingInspection?.status, startInspection])
  
  // HYBRID APPROACH: Auto-create checkout inspection when user selects checkout type 
  // and room has active booking but NO existing inspection request
  useEffect(() => {
    const isCheckoutMode = watchedCheckType === 'checkout'
    const hasActiveBooking = !!currentBooking?.id
    const hasPendingOrInProgressInspection = !!pendingInspection || !!roomInspection
    const alreadyAutoCreated = !!autoCreatedInspectionId
    
    // Auto-create khi:
    // 1. User chọn checkout type (từ form)
    // 2. Có active booking trong phòng
    // 3. KHÔNG có inspection request nào đang pending/in_progress
    // 4. Chưa auto-create trong session này
    // 5. Có đủ room data
    // 6. Không đang pending mutation
    if (
      isCheckoutMode &&
      hasActiveBooking &&
      !hasPendingOrInProgressInspection &&
      !alreadyAutoCreated &&
      room?.id &&
      room?.tenant_id &&
      room?.hotel_id &&
      !autoCreateInspection.isPending &&
      !isInspectionLoading &&
      !isLoadingRoomInspection
    ) {
      console.log('[RoomCheckPage] Auto-creating checkout inspection for booking:', currentBooking.id)
      autoCreateInspection.mutate({
        tenantId: room.tenant_id,
        hotelId: room.hotel_id,
        roomId: room.id,
        bookingId: currentBooking.id,
      }, {
        onSuccess: (result) => {
          setAutoCreatedInspectionId(result.id)
          setStableInspectionId(result.id)
          // Update URL với inspection ID mới
          navigate(`/rooms/${id}/check?type=checkout&inspection=${result.id}`, { replace: true })
        }
      })
    }
  }, [
    watchedCheckType, 
    currentBooking?.id, 
    pendingInspection, 
    roomInspection,
    autoCreatedInspectionId,
    room?.id, 
    room?.tenant_id, 
    room?.hotel_id,
    autoCreateInspection,
    isInspectionLoading,
    isLoadingRoomInspection,
    id,
    navigate,
  ])
  
  // Create check session on mount
  useEffect(() => {
    const initSession = async () => {
      if (room && user && !existingSession && !isLoading && !isSessionLoading) {
        const checkType = prefilledType || 'daily'
        const result = await createSession(
          room.id,
          checkType,
          user.full_name || user.email || 'Unknown',
          room.tenant_id
        )
        
        if (!result) {
          toast({
            title: 'Không thể tạo session',
            description: 'Có người khác đang kiểm tra phòng này',
            variant: 'destructive',
          })
          navigate('/rooms')
        }
      }
    }
    
    initSession()
  }, [room, user, isLoading, isSessionLoading])
  
  // Restore form from existing session or show take over dialog for managers
  useEffect(() => {
    // Skip if already resumed to prevent conflicts
    if (hasResumed) return
    
    if (!isSessionLoading && existingSession) {
      // Check if session belongs to current user
      if (existingSession.user_id !== user?.id) {
        // Nếu là manager, cho phép take over
        if (isManager) {
          setConflictSession({
            userName: existingSession.user_name,
            startedAt: existingSession.started_at,
          })
          setShowTakeOverDialog(true)
        } else {
          // Staff không có quyền take over
          toast({
            title: 'Phòng đang được kiểm tra',
            description: `${existingSession.user_name} đang kiểm tra phòng này`,
            variant: 'destructive',
          })
          navigate('/rooms')
        }
        return
      }
      
      // Only restore check_type if no localStorage progress (don't reset form)
      const saved = localStorage.getItem(`room-check-${id}`)
      if (!saved) {
        form.setValue('check_type', existingSession.check_type)
      }
    }
  }, [existingSession, user, id, form, navigate, isSessionLoading, hasResumed, isManager])
  
  // Handle manager take over
  const handleTakeOver = async () => {
    if (!room || !user) return
    
    const checkType = prefilledType || 'daily'
    const result = await takeOverSession(
      room.id,
      checkType,
      user.full_name || user.email || 'Unknown',
      room.tenant_id
    )
    
    if (result) {
      setShowTakeOverDialog(false)
      setConflictSession(null)
      setHasResumed(true) // Prevent re-triggering effects
    } else {
      navigate('/rooms')
    }
  }
  
  // Cleanup session only when user closes/refreshes tab
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (id && !sessionCompleted) {
        navigator.sendBeacon(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/room_check_sessions?room_id=eq.${id}`,
          JSON.stringify({})
        )
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [id, sessionCompleted])
  
  // Auto-save to localStorage (when form values change)
  useEffect(() => {
    const subscription = form.watch((data) => {
      if (id && currentStep > 1) {
        localStorage.setItem(
          `room-check-${id}`,
          JSON.stringify({
            data,
            step: currentStep,
            quickMode,
            timestamp: Date.now(),
          })
        )
      }
    })
    return () => subscription.unsubscribe()
  }, [form, id, currentStep, quickMode])

  // Persist progress when navigating steps (even if no field changes)
  useEffect(() => {
    if (!id) return
    if (currentStep <= 1) return

    const data = form.getValues()
    localStorage.setItem(
      `room-check-${id}`,
      JSON.stringify({
        data,
        step: currentStep,
        quickMode,
        timestamp: Date.now(),
      })
    )
  }, [id, currentStep, quickMode, form])
  
  // Check for saved progress on mount
  useEffect(() => {
    // Skip if already resumed
    if (hasResumed) return
    
    if (id && existingSession && existingSession.user_id === user?.id) {
      const saved = localStorage.getItem(`room-check-${id}`)
      if (saved) {
        try {
          const { data, step, quickMode: savedQuickMode, timestamp } = JSON.parse(saved)
          // Only resume if less than 1 hour old
          if (Date.now() - timestamp < 3600000) {
            // Auto-resume if query param is set, otherwise show dialog
            if (shouldAutoResume) {
              form.reset(data)
              setCurrentStep(step)
              setQuickMode(savedQuickMode)
              setHasResumed(true) // Mark as resumed to prevent conflicts
            } else {
              setShowResumeDialog(true)
            }
          } else {
            localStorage.removeItem(`room-check-${id}`)
          }
        } catch (e) {
          localStorage.removeItem(`room-check-${id}`)
        }
      }
    }
  }, [id, existingSession, user, shouldAutoResume, hasResumed])
  
  const clearSavedProgress = () => {
    if (id) {
      localStorage.removeItem(`room-check-${id}`)
    }
  }
  
  const resumeCheck = () => {
    if (id) {
      const saved = localStorage.getItem(`room-check-${id}`)
      if (saved) {
        try {
          const { data, step, quickMode: savedQuickMode } = JSON.parse(saved)
          form.reset(data)
          setCurrentStep(step)
          setQuickMode(savedQuickMode)
          setHasResumed(true) // Mark as resumed to prevent conflicts
        } catch (e) {
          // If error, start from beginning with check_type from session
          if (existingSession) {
            form.setValue('check_type', existingSession.check_type)
          }
        }
      }
    }
    setShowResumeDialog(false)
  }
  
  const startFresh = () => {
    clearSavedProgress()
    
    // Keep check_type from existingSession if available
    const checkType = existingSession?.check_type || 'daily'
    
    form.reset({
      check_type: checkType,
      cleanliness_score: 5,
      items_complete: true,
      items_missing: [],
      items_damaged: [],
      notes: '',
      photos: [],
    })
    setCurrentStep(1)
    setQuickMode(false)
    setShowResumeDialog(false)
  }
  
  const handleNext = async () => {
    let isValid = false
    
    if (currentStep === 1) {
      isValid = await form.trigger(['check_type'])
      // In quick mode, mark all items as complete automatically
      if (isValid && quickMode) {
        form.setValue('items_complete', true)
        form.setValue('items_missing', [])
        form.setValue('items_damaged', [])
      }
      // Reset phase when starting checkout
      if (isValid && isCheckoutType) {
        setCurrentPhase(1)
        setPhase1Submitted(false)
      }
    } else if (currentStep === 2 && !quickMode && (isDeliveryType || isReplenishType)) {
      // Delivery/Replenish step 2 = Items + Cleaning - không cần validate strict
      isValid = true
    } else if (currentStep === 2 && !quickMode && !isDeliveryType && !isReplenishType) {
      // Step 2: Items check (Phase 1 for checkout, regular for others)
      isValid = await form.trigger(['items_complete', 'items_missing', 'items_damaged'])
    } else if (currentStep === 2 && quickMode) {
      // Quick mode: step 2 là review cuối
      isValid = await form.trigger(['cleanliness_score'])
    } else if (currentStep === 3 && isCheckoutType) {
      // Checkout step 3 = Phase 1 Confirm
      // Block navigation if Phase 1 hasn't been submitted yet
      if (!phase1Submitted) {
        toast({
          title: 'Chưa gửi báo cáo',
          description: 'Vui lòng gửi báo cáo cho lễ tân trước khi tiếp tục.',
          variant: 'destructive',
        })
        return
      }
      isValid = true
    } else if (currentStep === 3 && (isDeliveryType || isReplenishType)) {
      // Delivery/Replenish step 3 = Review - validate cleanliness
      isValid = await form.trigger(['cleanliness_score'])
    } else if (currentStep === 4 && isCheckoutType) {
      // Checkout step 4 = Phase 2 Items (bổ sung/giặt/thay)
      isValid = true
    } else if (currentStep === 5 && isCheckoutType) {
      // Checkout step 5 = Cleaning Request - có defaults, không cần validate
      isValid = true
    } else if (currentStep === 3 && !isCheckoutType && !isDeliveryType && !isReplenishType) {
      // Non-checkout/non-delivery/non-replenish: step 3 là Review cuối
      isValid = await form.trigger(['cleanliness_score'])
    }
    
    if (isValid && currentStep < totalSteps) {
      // For checkout phase transitions
      if (isCheckoutType && currentStep === 3 && phase1Submitted) {
        setCurrentPhase(2) // Move to Phase 2
      }
      setCurrentStep(currentStep + 1)
    }
  }
  
  // NEW: Handle Phase 1 submission (send charges to reception)
  const handlePhase1Submit = async () => {
    if (!room || !user) return
    
    setIsSubmittingPhase1(true)
    
    try {
      // 1. Save chargeable consumptions if any
      if (chargeableItems.length > 0) {
        console.log('[RoomCheckPage] Phase 1: Saving chargeable consumptions:', chargeableItems.length)
        const savedItems = await createChargeableConsumptions.mutateAsync(chargeableItems)
        
        // 2. Send notification to reception
        if (savedItems && savedItems.length > 0) {
          const totalAmount = savedItems.reduce((sum, item) => sum + (item.total_amount || 0), 0)
          await supabase.functions.invoke('notify-chargeable', {
            body: {
              tenant_id: room.tenant_id,
              hotel_id: room.hotel_id,
              booking_id: currentBooking?.id,
              room_id: id,
              room_number: room.room_number,
              items: savedItems.map(item => ({
                name: item.item_name,
                quantity: item.quantity,
                total: item.total_amount,
              })),
              total_amount: totalAmount,
              recorded_by_name: user.full_name || user.email,
            },
          })
          console.log('[RoomCheckPage] Phase 1: Chargeable notification sent')
        }
      }
      
      // 3. Also notify about lost/damaged items if any
      const lostItems = (form.getValues('items_lost') || []) as LostItem[]
      const damagedItems = (form.getValues('items_damaged') || []) as DamagedItem[]
      
      if (lostItems.length > 0 || damagedItems.length > 0) {
        const lostTotal = lostItems.reduce((sum, item) => sum + (item.estimated_value || 0), 0)
        const damagedTotal = damagedItems.reduce((sum, item) => sum + (item.damage_cost || 0), 0)
        
        // Send notification for lost/damaged items
        try {
          await supabase.functions.invoke('notify-chargeable', {
            body: {
              tenant_id: room.tenant_id,
              hotel_id: room.hotel_id,
              booking_id: currentBooking?.id,
              room_id: id,
              room_number: room.room_number,
              items: [], // No chargeable items in this notification
              total_amount: 0,
              lost_items: lostItems.map(item => ({
                name: item.item_name,
                quantity: item.quantity,
                estimated_value: item.estimated_value || 0,
              })),
              damaged_items: damagedItems.map(item => ({
                name: item.item_name,
                quantity: item.quantity,
                damage_cost: item.damage_cost || 0,
                damage_type: item.damage_type,
              })),
              lost_total: lostTotal,
              damaged_total: damagedTotal,
              recorded_by_name: user.full_name || user.email,
            },
          })
          console.log('[RoomCheckPage] Phase 1: Lost/damaged notification sent')
        } catch (notifyError) {
          console.error('[RoomCheckPage] Failed to send lost/damaged notification:', notifyError)
        }
      }
      
      // 4. Mark Phase 1 as submitted
      setPhase1Submitted(true)
      setCurrentPhase(2)
      setCurrentStep(4) // Move to Phase 2 Items
      
      toast({
        title: 'Đã gửi cho lễ tân',
        description: 'Bạn có thể tiếp tục kiểm tra đồ bổ sung',
      })
    } catch (error) {
      console.error('[RoomCheckPage] Phase 1 submit error:', error)
      toast({
        title: 'Lỗi',
        description: 'Không thể gửi thông báo. Vui lòng thử lại.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmittingPhase1(false)
    }
  }
  
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }
  
  const handleCancel = () => {
    setShowCancelDialog(true)
  }
  
  const confirmCancel = async () => {
    if (id) {
      await deleteSession(id)
      setSessionCompleted(true)
    }
    navigate(isManager ? `/rooms/${id}` : '/rooms')
  }
  
  const getCheckTypeLabel = (type: string) => {
    const labels = {
      daily: 'Kiểm tra hàng ngày',
      checkin: 'Kiểm tra check-in',
      checkout: 'Kiểm tra check-out',
      maintenance: 'Kiểm tra bảo trì',
    }
    return labels[type as keyof typeof labels] || type
  }
  
  const onSubmit = async (data: RoomCheckFormData) => {
    // Guard: Prevent double submit
    if (!id || !user?.id || createCheck.isPending || isSubmitting) return
    
    // Bắt đầu submitting - KHÔNG đóng dialog ngay
    setIsSubmitting(true)
    
    // Ưu tiên: stableInspectionId > autoCreatedInspectionId > URL > pendingInspection
    const finalInspectionId = stableInspectionId || autoCreatedInspectionId || inspectionIdFromUrl || pendingInspection?.id
    
    console.log('[RoomCheckPage] onSubmit - check_type:', data.check_type)
    console.log('[RoomCheckPage] onSubmit - finalInspectionId:', finalInspectionId)
    console.log('[RoomCheckPage] onSubmit - sources: stable=', stableInspectionId, 'autoCreated=', autoCreatedInspectionId, 'url=', inspectionIdFromUrl, 'pending=', pendingInspection?.id)
    
    // Warning nếu là checkout mà không có inspectionId
    if (data.check_type === 'checkout' && !finalInspectionId) {
      console.warn('[RoomCheckPage] Checkout mode without inspectionId - will use fallback query')
    }
    
    try {
      // Save chargeable consumptions for checkout if any
      // Skip if already submitted in Phase 1 (2-phase checkout flow)
      if (data.check_type === 'checkout' && chargeableItems.length > 0 && !phase1Submitted) {
        console.log('[RoomCheckPage] Saving chargeable consumptions (non-phase1):', chargeableItems.length)
        const savedItems = await createChargeableConsumptions.mutateAsync(chargeableItems)
        
        // Trigger notify-chargeable edge function
        if (savedItems && savedItems.length > 0) {
          try {
            const totalAmount = savedItems.reduce((sum, item) => sum + (item.total_amount || 0), 0)
            await supabase.functions.invoke('notify-chargeable', {
              body: {
                tenant_id: room?.tenant_id,
                hotel_id: room?.hotel_id,
                booking_id: currentBooking?.id,
                room_id: id,
                room_number: room?.room_number,
                items: savedItems.map(item => ({
                  name: item.item_name,
                  quantity: item.quantity,
                  total: item.total_amount,
                })),
                total_amount: totalAmount,
                recorded_by_name: user?.full_name || user?.email,
              },
            })
            console.log('[RoomCheckPage] Chargeable notification sent')
          } catch (notifyError) {
            console.error('[RoomCheckPage] Failed to send chargeable notification:', notifyError)
          }
        }
      }
      
      const createdCheck = await createCheck.mutateAsync({
        roomId: id,
        data,
        itemQuantities: Object.keys(itemQuantities).length > 0 ? itemQuantities : undefined,
        inspectionId: finalInspectionId || undefined, // Pass checkout inspection ID
      })
      
      // Auto-complete related housekeeping task if this is a checkout
      if (data.check_type === 'checkout' && room?.id && user?.id) {
        try {
          const { data: relatedTask } = await supabase
            .from('housekeeping_tasks')
            .select('id')
            .eq('room_id', room.id)
            .eq('task_type', 'checkout_inspection')
            .in('status', ['pending', 'in_progress'])
            .maybeSingle()
          
          if (relatedTask) {
            console.log('[RoomCheckPage] Auto-completing housekeeping task:', relatedTask.id)
            await supabase
              .from('housekeeping_tasks')
              .update({ 
                status: 'completed',
                completed_at: new Date().toISOString(),
                room_check_id: createdCheck?.id,
              })
              .eq('id', relatedTask.id)
            
            // Invalidate housekeeping task queries to update UI
            queryClient.invalidateQueries({ queryKey: ['my-housekeeping-tasks'] })
            queryClient.invalidateQueries({ queryKey: ['pending-task-count'] })
            queryClient.invalidateQueries({ queryKey: ['hotel-housekeeping-tasks'] })
          }
        } catch (taskError) {
          console.error('[RoomCheckPage] Error auto-completing housekeeping task:', taskError)
          // Non-critical error - don't block the flow
        }
      }
      
      if (id) {
        await deleteSession(id)
        setSessionCompleted(true)
      }
      
      clearSavedProgress()
      
      // Đóng dialog SAU KHI thành công
      setShowSubmitDialog(false)
      setShowCheckinBlockDialog(false)
      
      // Toast message tùy theo check_type
      if (data.check_type === 'delivery' && distributionOrderId) {
        toast({
          title: 'Đã hoàn tất giao hàng',
          description: `Đã giao hàng và kiểm tra phòng ${room?.room_number}`,
        })
        navigate(`/inventory/distributions/${distributionOrderId}`)
      } else {
        toast({
          title: 'Thành công',
          description: `Đã hoàn thành kiểm tra phòng ${room?.room_number}`,
        })
        navigate(isManager ? `/rooms/${id}` : '/rooms')
      }
    } catch (error) {
      console.error('Error creating room check:', error)
      
      // KHÔNG đóng dialog - giữ mở để user có thể thử lại
      // setShowSubmitDialog(false) - BỎ DÒNG NÀY
      
      // Handle duplicate error
      if (error instanceof Error && error.message.includes('Duplicate')) {
        toast({
          title: 'Lỗi',
          description: 'Bạn vừa kiểm tra phòng này rồi. Vui lòng đợi 5 phút.',
          variant: 'destructive',
        })
        // Đóng dialog và navigate cho trường hợp duplicate
        setShowSubmitDialog(false)
        setShowCheckinBlockDialog(false)
        navigate(isManager ? `/rooms/${id}` : '/rooms')
      } else {
        // Hiển thị toast lỗi chi tiết cho user
        toast({
          title: 'Lỗi',
          description: error instanceof Error 
            ? error.message 
            : 'Không thể hoàn thành kiểm tra. Vui lòng thử lại.',
          variant: 'destructive',
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Đang tải thông tin phòng...</p>
        </div>
      </div>
    )
  }
  
  if (!room) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">Không tìm thấy thông tin phòng</p>
          <Button onClick={() => navigate('/rooms')} variant="outline">
            Quay lại danh sách phòng
          </Button>
        </div>
      </div>
    )
  }
  
  const progress = (currentStep / totalSteps) * 100
  
  return (
    <>
      {/* Take Over Dialog - For Managers */}
      <AlertDialog open={showTakeOverDialog} onOpenChange={(open) => {
        if (!open) navigate('/rooms')
        setShowTakeOverDialog(open)
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Phòng đang được kiểm tra
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <div>
                <strong>{conflictSession?.userName}</strong> đang kiểm tra phòng này
                {conflictSession?.startedAt && (
                  <span className="block text-sm mt-1">
                    Bắt đầu lúc: {new Date(conflictSession.startedAt).toLocaleString('vi-VN')}
                    <span className="ml-2 text-amber-600">
                      ({Math.floor((Date.now() - new Date(conflictSession.startedAt).getTime()) / 60000)} phút trước)
                    </span>
                  </span>
                )}
              </div>
              <div className="p-2 bg-muted rounded text-sm">
                <strong>Bạn là quản lý:</strong> Có thể tiếp quản phiên kiểm tra này.
                Session cũ sẽ bị hủy và nhân viên đó sẽ mất tiến trình.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => navigate('/rooms')}>Quay lại</AlertDialogCancel>
            <AlertDialogAction onClick={handleTakeOver}>Tiếp quản</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resume Dialog */}
      <AlertDialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tiếp tục kiểm tra?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có kiểm tra chưa hoàn thành. Bạn muốn tiếp tục hay bắt đầu lại?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={startFresh}>Bắt đầu lại</AlertDialogCancel>
            <AlertDialogAction onClick={resumeCheck}>Tiếp tục</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hủy kiểm tra phòng?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn hủy? Tiến trình đã lưu sẽ được giữ lại để bạn có thể tiếp tục sau.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tiếp tục kiểm tra</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel}>Hủy và thoát</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận hoàn tất kiểm tra?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <div>Vui lòng kiểm tra lại thông tin trước khi hoàn tất:</div>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Loại kiểm tra: <strong>{getCheckTypeLabel(form.watch('check_type'))}</strong></li>
                <li>Đánh giá độ sạch: <strong>{form.watch('cleanliness_score')}/5 sao</strong></li>
                <li>Trạng thái đồ dùng: <strong>{form.watch('items_complete') ? 'Đầy đủ' : 'Có vấn đề'}</strong></li>
                {form.watch('items_missing')?.length > 0 && (
                  <li className="text-orange-600">Thiếu {form.watch('items_missing').length} vật phẩm</li>
                )}
                {form.watch('items_damaged')?.length > 0 && (
                  <li className="text-red-600">Hỏng {form.watch('items_damaged').length} vật phẩm</li>
                )}
              </ul>
              <div className="mt-3 font-medium">Bạn có chắc chắn muốn hoàn tất kiểm tra này?</div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={createCheck.isPending || isSubmitting}>
              Kiểm tra lại
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={form.handleSubmit(onSubmit)}
              disabled={createCheck.isPending || isSubmitting}
            >
              {(createCheck.isPending || isSubmitting) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Xác nhận hoàn tất
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Check-in Block Dialog - Warning when room not ready */}
      <AlertDialog open={showCheckinBlockDialog} onOpenChange={setShowCheckinBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-warning">⚠️ Phòng chưa sẵn sàng</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <div>Phòng này có vấn đề cần giải quyết trước khi cho khách check-in:</div>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {(form.watch('items_damaged')?.length || 0) > 0 && (
                  <li className="text-destructive font-medium">
                    {form.watch('items_damaged').length} thiết bị/đồ dùng bị hỏng
                  </li>
                )}
                {(form.watch('items_missing')?.length || 0) > 0 && (
                  <li className="text-warning font-medium">
                    {form.watch('items_missing').length} vật phẩm thiếu
                  </li>
                )}
              </ul>
              <div className="mt-3 p-2 bg-muted rounded text-sm">
                <strong>Khuyến nghị:</strong> Quay lại sửa các vấn đề trước khi hoàn tất kiểm tra check-in.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Quay lại sửa</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setShowCheckinBlockDialog(false)
                setShowSubmitDialog(true)
              }}
            >
              Vẫn hoàn tất
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <div className="space-y-6">
        <PageHeader
          title={`Kiểm tra phòng ${room.room_number}`}
          description={`${room.room_type} - Tầng ${room.floor}`}
        />
        
      {/* Pending Deliveries removed - now handled via housekeeping tasks */}
      {/* Check Type Header - Color coded with icon */}
      {(() => {
        const checkTypeConfig = getCheckTypeConfig(watchedCheckType)
        const CheckTypeIcon = CHECK_TYPE_ICONS[watchedCheckType as CheckType]
        return (
          <div className={cn('p-3 rounded-lg border', checkTypeConfig.headerColor)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {CheckTypeIcon && <CheckTypeIcon className={cn('h-5 w-5', checkTypeConfig.headerTextColor)} />}
                <div>
                  <h3 className={cn('font-medium', checkTypeConfig.headerTextColor)}>
                    {checkTypeConfig.label}
                  </h3>
                  <p className="text-xs text-muted-foreground">{checkTypeConfig.description}</p>
                </div>
              </div>
              {checkTypeConfig.showBookingInfo && currentBooking && (
                <div className="text-right">
                  <p className="text-sm font-medium">{currentBooking.guest_name || 'Khách'}</p>
                  <p className="text-xs text-muted-foreground">
                    {currentBooking.check_in_date && currentBooking.check_out_date && 
                      `${new Date(currentBooking.check_in_date).toLocaleDateString('vi-VN')} - ${new Date(currentBooking.check_out_date).toLocaleDateString('vi-VN')}`
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        )
      })()}
      
      <Card>
        <CardHeader>
          <div className="space-y-4">
            <CardTitle className="flex items-center gap-2">
              <span>Bước {currentStep}/{totalSteps}:</span>
              {currentStep === 1 && 'Chọn loại kiểm tra'}
              {/* Delivery type - step 2 */}
              {currentStep === 2 && !quickMode && isDeliveryType && 'Xác nhận đồ giao & Dọn dẹp'}
              {/* Replenish type - step 2 */}
              {currentStep === 2 && !quickMode && isReplenishType && 'Bổ sung đồ & Tình trạng dọn dẹp'}
              {/* Non-checkout, non-delivery, non-replenish - step 2 */}
              {currentStep === 2 && !quickMode && !isCheckoutType && !isDeliveryType && !isReplenishType && 'Kiểm tra đồ dùng trong phòng'}
              {currentStep === 2 && !quickMode && isCheckoutType && (
                <>
                  <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">GĐ1</Badge>
                  Kiểm tra đồ tính phí & mất/hỏng
                </>
              )}
              {currentStep === 2 && quickMode && 'Đánh giá & Hoàn tất'}
              {currentStep === 3 && !quickMode && isCheckoutType && (
                <>
                  <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">GĐ1</Badge>
                  Gửi báo cáo cho lễ tân
                </>
              )}
              {/* Delivery/Replenish type - step 3 = Review */}
              {currentStep === 3 && !quickMode && (isDeliveryType || isReplenishType) && 'Đánh giá & Hoàn tất'}
              {/* Non-checkout, non-delivery, non-replenish - step 3 = Review */}
              {currentStep === 3 && !quickMode && !isCheckoutType && !isDeliveryType && !isReplenishType && 'Đánh giá & Hoàn tất'}
              {currentStep === 4 && isCheckoutType && (
                <>
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">GĐ2</Badge>
                  Kiểm tra đồ bổ sung & giặt/thay
                </>
              )}
              {currentStep === 5 && isCheckoutType && (
                <>
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">GĐ2</Badge>
                  Tình trạng phòng & Dọn dẹp
                </>
              )}
              {currentStep === 6 && isCheckoutType && (
                <>
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">Hoàn tất</Badge>
                  Đánh giá & Hoàn tất
                </>
              )}
            </CardTitle>
            <div className="space-y-2">
              <Progress value={progress} />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span className={currentStep === 1 ? 'font-medium text-foreground' : ''}>
                  Loại kiểm tra
                </span>
                {!quickMode && (
                  <span className={currentStep === 2 ? 'font-medium text-foreground' : ''}>
                    Đồ dùng
                  </span>
                )}
                <span className={currentStep === totalSteps ? 'font-medium text-foreground' : ''}>
                  Đánh giá
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {currentStep === 1 && (
                <CheckTypeStep 
                  form={form} 
                  quickMode={quickMode}
                  setQuickMode={setQuickMode}
                />
              )}
              {/* Step 2: Items Check - Phase 1 for checkout, DeliveryItems for delivery, regular for others */}
              {currentStep === 2 && !quickMode && isDeliveryType && distributionOrderId && roomOrderId && (
                <div className="space-y-6">
                  <DeliveryItemsStep
                    distributionOrderId={distributionOrderId}
                    roomOrderId={roomOrderId}
                    form={form}
                    roomId={id!}
                    hotelId={room.hotel_id}
                    tenantId={room.tenant_id}
                  />
                  <CleaningRequestStep form={form} />
                </div>
              )}
              {/* Replenish type - step 2: Items + Cleaning */}
              {currentStep === 2 && !quickMode && isReplenishType && (
                <div className="space-y-6">
                  <ItemsCheckStep 
                    form={form} 
                    items={items} 
                    roomId={id!}
                    hotelId={room.hotel_id}
                    tenantId={room.tenant_id}
                    bookingId={currentBooking?.id || null}
                    checkType="replenish"
                    phase={undefined}
                    onQuantitiesChange={setItemQuantities}
                  />
                  <CleaningRequestStep form={form} />
                </div>
              )}
              {/* Regular types (daily, checkin, maintenance) - step 2 */}
              {currentStep === 2 && !quickMode && !isCheckoutType && !isDeliveryType && !isReplenishType && (
                <ItemsCheckStep 
                  form={form} 
                  items={items} 
                  roomId={id!}
                  hotelId={room.hotel_id}
                  tenantId={room.tenant_id}
                  bookingId={currentBooking?.id || null}
                  checkType={watchedCheckType as 'daily' | 'checkin' | 'checkout' | 'maintenance'}
                  phase={undefined}
                  onQuantitiesChange={setItemQuantities}
                />
              )}
              {currentStep === 2 && !quickMode && isCheckoutType && (
                <ItemsCheckStep 
                  form={form} 
                  items={items} 
                  roomId={id!}
                  hotelId={room.hotel_id}
                  tenantId={room.tenant_id}
                  bookingId={currentBooking?.id || null}
                  checkType={watchedCheckType as 'daily' | 'checkin' | 'checkout' | 'maintenance'}
                  phase={1}
                  onQuantitiesChange={setItemQuantities}
                />
              )}
              {/* Step 3 for Checkout: Phase 1 Confirm with Chargeable Items */}
              {currentStep === 3 && !quickMode && isCheckoutType && (
                <div className="space-y-6">
                  {/* Chargeable items selection */}
                  {currentBooking && (
                    <ChargeableItemsStep
                      hotelId={room.hotel_id}
                      bookingId={currentBooking.id}
                      roomId={id!}
                      onItemsChange={setChargeableItems}
                      notes={chargeableNotes}
                      onNotesChange={setChargeableNotes}
                    />
                  )}
                  {/* Phase 1 confirmation */}
                  <Phase1ConfirmStep
                    chargeableItems={chargeableItems}
                    lostItems={(form.getValues('items_lost') || []) as LostItem[]}
                    damagedItems={(form.getValues('items_damaged') || []) as DamagedItem[]}
                    roomNumber={room.room_number}
                    guestName={currentBooking?.guest_name}
                    onSubmitPhase1={handlePhase1Submit}
                    onContinue={() => setCurrentStep(4)}
                    isSubmitting={isSubmittingPhase1}
                    phase1Submitted={phase1Submitted}
                  />
                </div>
              )}
              {/* Step 4 for Checkout: Phase 2 Items (bổ sung/giặt/thay) */}
              {currentStep === 4 && !quickMode && isCheckoutType && (
                <ItemsCheckStep 
                  form={form} 
                  items={items} 
                  roomId={id!}
                  hotelId={room.hotel_id}
                  tenantId={room.tenant_id}
                  bookingId={currentBooking?.id || null}
                  checkType={watchedCheckType as 'daily' | 'checkin' | 'checkout' | 'maintenance'}
                  phase={2}
                  onQuantitiesChange={setItemQuantities}
                />
              )}
              {/* Step 5 for Checkout: Cleaning Request */}
              {currentStep === 5 && !quickMode && isCheckoutType && (
                <CleaningRequestStep form={form} />
              )}
              {/* Review Step - adjusts based on check type */}
              {((currentStep === 2 && quickMode) || 
                (currentStep === 3 && !isCheckoutType && !isDeliveryType && !isReplenishType) ||
                (currentStep === 3 && (isDeliveryType || isReplenishType)) ||
                (currentStep === 6 && isCheckoutType)) && (
                <ReviewStep form={form} room={room} checkType={watchedCheckType as CheckType} currentBooking={currentBooking} />
              )}
              
              <div className="flex items-center justify-between pt-6 border-t">
                <div className="flex gap-2">
                  {currentStep > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Quay lại
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Hủy
                    </Button>
                  )}
                </div>
                
                {currentStep < totalSteps ? (
                  // Hide "Tiếp theo" on Step 3 checkout when Phase 1 not yet submitted
                  (currentStep === 3 && isCheckoutType && !phase1Submitted) ? null : (
                    <Button type="button" onClick={handleNext}>
                      Tiếp theo
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  )
                ) : (
                  <Button 
                    type="button"
                    onClick={() => {
                      // Validate form trước khi mở dialog
                      form.trigger().then((isValid) => {
                        if (isValid) {
                          const checkTypeVal = form.getValues('check_type')
                          const damagedCount = form.getValues('items_damaged')?.length || 0
                          const missingCount = form.getValues('items_missing')?.length || 0
                          const checkTypeConf = getCheckTypeConfig(checkTypeVal)
                          
                          // Check-in: Cảnh báo nếu phòng chưa sẵn sàng
                          if (checkTypeConf.blockOnDamaged && (damagedCount > 0 || missingCount > 0)) {
                            setShowCheckinBlockDialog(true)
                          } else {
                            setShowSubmitDialog(true)
                          }
                        } else {
                          toast({
                            title: 'Chưa hợp lệ',
                            description: 'Vui lòng kiểm tra lại các trường bắt buộc trước khi hoàn thành.',
                            variant: 'destructive',
                          })
                        }
                      })
                    }}
                    disabled={createCheck.isPending || isSubmitting}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    {(createCheck.isPending || isSubmitting) ? 'Đang lưu...' : 'Hoàn thành'}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
    </>
  )
}
