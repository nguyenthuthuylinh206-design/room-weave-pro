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
  const totalSteps = 3
  
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
  
  const room = (roomData as any)?.room
  const items = (roomData as any)?.items || []
  
  useEffect(() => {
    if (!isLoading && !room) {
      navigate('/rooms')
    }
  }, [room, isLoading, navigate])
  
  const handleNext = async () => {
    let isValid = false
    
    if (currentStep === 1) {
      isValid = await form.trigger(['check_type', 'cleanliness_score'])
    } else if (currentStep === 2) {
      isValid = await form.trigger(['items_complete', 'items_missing', 'items_damaged'])
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
  
  const onSubmit = async (data: RoomCheckFormData) => {
    if (!id || !user?.id) return
    
    try {
      await createCheck.mutateAsync({
        roomId: id,
        data,
      })
      
      navigate(`/rooms/${id}`)
    } catch (error) {
      console.error('Error creating room check:', error)
    }
  }
  
  if (isLoading || !room) {
    return <div>Đang tải...</div>
  }
  
  const progress = (currentStep / totalSteps) * 100
  
  return (
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
              {currentStep === 1 && 'Thông tin kiểm tra'}
              {currentStep === 2 && 'Kiểm tra đồ dùng'}
              {currentStep === 3 && 'Hoàn tất'}
            </CardTitle>
            <div className="space-y-2">
              <Progress value={progress} />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span className={currentStep === 1 ? 'font-medium text-foreground' : ''}>
                  Thông tin
                </span>
                <span className={currentStep === 2 ? 'font-medium text-foreground' : ''}>
                  Đồ dùng
                </span>
                <span className={currentStep === 3 ? 'font-medium text-foreground' : ''}>
                  Hoàn tất
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {currentStep === 1 && <CheckTypeStep form={form} />}
              {currentStep === 2 && <ItemsCheckStep form={form} items={items} />}
              {currentStep === 3 && <ReviewStep form={form} room={room} />}
              
              <div className="flex items-center justify-between pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={currentStep === 1 ? () => navigate(`/rooms/${id}`) : handleBack}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  {currentStep === 1 ? 'Hủy' : 'Quay lại'}
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
  )
}
