import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
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
import { CheckTypeStep } from '@/components/rooms/check-steps/CheckTypeStep'
import { ItemsCheckStep } from '@/components/rooms/check-steps/ItemsCheckStep'
import { ReviewStep } from '@/components/rooms/check-steps/ReviewStep'
import type { RoomCheckFormData } from '@/types/rooms.types'

export function RoomCheckPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useUser()
  const { data: roomData, isLoading } = useRoom(id)
  const createCheck = useCreateRoomCheck()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showResumeDialog, setShowResumeDialog] = useState(false)
  const [quickMode, setQuickMode] = useState(false)
  const totalSteps = quickMode ? 2 : 3 // Skip items step in quick mode
  
  const form = useForm<RoomCheckFormData>({
    resolver: zodResolver(roomCheckFormSchema),
    defaultValues: {
      check_type: 'daily',
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
  
  // Auto-save to localStorage
  useEffect(() => {
    const subscription = form.watch((data) => {
      if (id && currentStep > 1) {
        localStorage.setItem(`room-check-${id}`, JSON.stringify({
          data,
          step: currentStep,
          quickMode,
          timestamp: Date.now(),
        }))
      }
    })
    return () => subscription.unsubscribe()
  }, [form, id, currentStep, quickMode])
  
  // Check for saved progress on mount
  useEffect(() => {
    if (id) {
      const saved = localStorage.getItem(`room-check-${id}`)
      if (saved) {
        try {
          const { data, step, quickMode: savedQuickMode, timestamp } = JSON.parse(saved)
          // Only resume if less than 1 hour old
          if (Date.now() - timestamp < 3600000) {
            setShowResumeDialog(true)
            form.reset(data)
            setCurrentStep(step)
            setQuickMode(savedQuickMode)
          } else {
            localStorage.removeItem(`room-check-${id}`)
          }
        } catch (e) {
          localStorage.removeItem(`room-check-${id}`)
        }
      }
    }
  }, [id, form])
  
  const clearSavedProgress = () => {
    if (id) {
      localStorage.removeItem(`room-check-${id}`)
    }
  }
  
  const resumeCheck = () => {
    setShowResumeDialog(false)
  }
  
  const startFresh = () => {
    clearSavedProgress()
    form.reset({
      check_type: 'daily',
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
      // Show confirmation dialog for steps 2 and 3
      if (currentStep >= 2) {
        setShowCancelDialog(true)
      } else {
        setCurrentStep(currentStep - 1)
      }
    }
  }
  
  const handleCancel = () => {
    if (currentStep === 1) {
      navigate(`/rooms/${id}`)
    } else {
      setShowCancelDialog(true)
    }
  }
  
  const confirmCancel = () => {
    navigate(`/rooms/${id}`)
  }
  
  const onSubmit = async (data: RoomCheckFormData) => {
    if (!id || !user?.id) return
    
    try {
      await createCheck.mutateAsync({
        roomId: id,
        data,
      })
      
      clearSavedProgress()
      navigate(`/rooms/${id}`)
    } catch (error) {
      console.error('Error creating room check:', error)
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
      
      <div className="space-y-6">
        <PageHeader
          title={`Kiểm tra phòng ${room.room_number}`}
          description={`${room.room_type} - Tầng ${room.floor}`}
        />
      
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
              {currentStep === 2 && !quickMode && <ItemsCheckStep form={form} items={items} />}
              {((currentStep === 2 && quickMode) || currentStep === 3) && (
                <ReviewStep form={form} room={room} />
              )}
              
              <div className="flex items-center justify-between pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Hủy
                </Button>
                
                {currentStep < totalSteps ? (
                  <Button type="button" onClick={handleNext}>
                    Tiếp theo
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={createCheck.isPending}>
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
