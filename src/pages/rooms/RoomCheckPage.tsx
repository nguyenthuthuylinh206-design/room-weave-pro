import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { roomCheckFormSchema } from '@/lib/validations/rooms.schemas'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { usePendingInspections } from '@/hooks/useCheckoutInspection'
import { toast } from '@/hooks/use-toast'
import { CheckTypeStep } from '@/components/rooms/check-steps/CheckTypeStep'
import { ItemsCheckStep } from '@/components/rooms/check-steps/ItemsCheckStep'
import { ReviewStep } from '@/components/rooms/check-steps/ReviewStep'
import { PendingDeliveriesSection } from '@/components/rooms/check-steps/PendingDeliveriesSection'
import type { RoomCheckFormData } from '@/types/rooms.types'

export function RoomCheckPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const prefilledType = searchParams.get('type') as 'daily' | 'checkin' | 'checkout' | 'maintenance' | null
  const shouldAutoResume = searchParams.get('resume') === 'true'
  const inspectionIdFromUrl = searchParams.get('inspection') // Lấy checkout inspection ID từ URL
  
  const { user, hasAnyRole } = useUser()
  
  // Hook để lấy pending inspection và auto-start
  const { 
    pendingInspection, 
    isLoading: isInspectionLoading,
    startInspection 
  } = usePendingInspections(id)
  
  // Flag để tránh gọi startInspection nhiều lần
  const hasAutoStartedInspection = useRef(false)
  
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
    deleteSession 
  } = useRoomCheckSession(id)
  
  const [currentStep, setCurrentStep] = useState(1)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showResumeDialog, setShowResumeDialog] = useState(false)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [quickMode, setQuickMode] = useState(false)
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({})
  const [sessionCompleted, setSessionCompleted] = useState(false)
  const [hasResumed, setHasResumed] = useState(false) // Flag to prevent useEffect conflicts
  const totalSteps = quickMode ? 2 : 3 // Skip items step in quick mode
  
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
    },
  })
  
  // Parse data correctly from useRoom
  const room = roomData?.room
  const hotel = roomData?.hotel
  const items = roomData?.items || []
  const recentChecks = roomData?.recent_checks || []
  
  useEffect(() => {
    if (!isLoading && !room) {
      navigate('/rooms')
    }
  }, [room, isLoading, navigate])
  
  // Auto-start inspection khi nhân viên vào trang checkout
  // Điều này đảm bảo status được cập nhật dù nhân viên vào bằng đường nào
  useEffect(() => {
    // Chỉ auto-start khi:
    // 1. Đang là checkout type
    // 2. Có pending inspection với status = 'pending'
    // 3. Chưa auto-start trước đó
    // 4. Không có inspection ID từ URL (nghĩa là nhân viên không vào qua banner)
    if (
      prefilledType === 'checkout' &&
      pendingInspection?.status === 'pending' &&
      !hasAutoStartedInspection.current &&
      !inspectionIdFromUrl &&
      !startInspection.isPending
    ) {
      hasAutoStartedInspection.current = true
      startInspection.mutate(pendingInspection.id)
    }
  }, [prefilledType, pendingInspection?.id, pendingInspection?.status, inspectionIdFromUrl, startInspection])
  
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
  
  // Restore form from existing session
  useEffect(() => {
    // Skip if already resumed to prevent conflicts
    if (hasResumed) return
    
    if (!isSessionLoading && existingSession) {
      // Check if session belongs to current user
      if (existingSession.user_id !== user?.id) {
        toast({
          title: 'Phòng đang được kiểm tra',
          description: `${existingSession.user_name} đang kiểm tra phòng này`,
          variant: 'destructive',
        })
        navigate('/rooms')
        return
      }
      
      // Only restore check_type if no localStorage progress (don't reset form)
      const saved = localStorage.getItem(`room-check-${id}`)
      if (!saved) {
        form.setValue('check_type', existingSession.check_type)
      }
    }
  }, [existingSession, user, id, form, navigate, isSessionLoading, hasResumed])
  
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
    } else if (currentStep === 2 && !quickMode) {
      isValid = await form.trigger(['items_complete', 'items_missing', 'items_damaged'])
    } else if ((currentStep === 2 && quickMode) || currentStep === 3) {
      isValid = await form.trigger(['cleanliness_score'])
    }
    
    if (isValid && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }
  
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }
  
  const handleCancel = () => {
    if (currentStep === 1) {
      navigate(isManager ? `/rooms/${id}` : '/rooms')
    } else {
      setShowCancelDialog(true)
    }
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
    if (!id || !user?.id) return
    
    try {
      await createCheck.mutateAsync({
        roomId: id,
        data,
        itemQuantities: Object.keys(itemQuantities).length > 0 ? itemQuantities : undefined,
        inspectionId: effectiveInspectionId || undefined, // Pass checkout inspection ID
      })
      
      // Đóng dialog khi thành công
      setShowSubmitDialog(false)
      
      if (id) {
        await deleteSession(id)
        setSessionCompleted(true)
      }
      
      clearSavedProgress()
      toast({
        title: 'Thành công',
        description: `Đã hoàn thành kiểm tra phòng ${room?.room_number}`,
      })
      navigate(isManager ? `/rooms/${id}` : '/rooms')
    } catch (error) {
      // Đóng dialog khi lỗi
      setShowSubmitDialog(false)
      
      console.error('Error creating room check:', error)
      
      // Handle duplicate error
      if (error instanceof Error && error.message.includes('Duplicate')) {
        toast({
          title: 'Lỗi',
          description: 'Bạn vừa kiểm tra phòng này rồi. Vui lòng đợi 5 phút.',
          variant: 'destructive',
        })
      }
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
            <AlertDialogCancel disabled={createCheck.isPending}>
              Kiểm tra lại
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={form.handleSubmit(onSubmit)}
              disabled={createCheck.isPending}
            >
              {createCheck.isPending ? (
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
      
      <div className="space-y-6">
        <PageHeader
          title={`Kiểm tra phòng ${room.room_number}`}
          description={`${room.room_type} - Tầng ${room.floor}`}
        />
        
        {/* Pending Deliveries Section */}
        <PendingDeliveriesSection roomId={id!} bookingId={currentBooking?.id} />
      
      <Card>
        <CardHeader>
          <div className="space-y-4">
            <CardTitle>
              Bước {currentStep}/{totalSteps}:{' '}
              {currentStep === 1 && 'Chọn loại kiểm tra'}
              {currentStep === 2 && !quickMode && 'Kiểm tra đồ dùng trong phòng'}
              {currentStep === 2 && quickMode && 'Đánh giá & Hoàn tất'}
              {currentStep === 3 && 'Đánh giá & Hoàn tất'}
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
              {currentStep === 2 && !quickMode && (
                <ItemsCheckStep 
                  form={form} 
                  items={items} 
                  roomId={id!}
                  hotelId={room.hotel_id}
                  tenantId={room.tenant_id}
                  bookingId={currentBooking?.id || null}
                  onQuantitiesChange={setItemQuantities}
                />
              )}
              {((currentStep === 2 && quickMode) || currentStep === 3) && (
                <ReviewStep form={form} room={room} />
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
                  <Button type="button" onClick={handleNext}>
                    Tiếp theo
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button 
                    type="button"
                    onClick={() => {
                      // Validate form trước khi mở dialog
                      form.trigger().then((isValid) => {
                        if (isValid) {
                          setShowSubmitDialog(true)
                        }
                      })
                    }}
                    disabled={createCheck.isPending}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    {createCheck.isPending ? 'Đang lưu...' : 'Hoàn thành'}
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
