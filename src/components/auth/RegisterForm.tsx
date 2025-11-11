import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import {
  RegisterStep1Data,
  RegisterStep2Data,
  RegisterStep3Data,
} from '@/lib/validations/auth.schemas'
import { RegisterStep1 } from './register/RegisterStep1'
import { RegisterStep2 } from './register/RegisterStep2'
import { RegisterStep3 } from './register/RegisterStep3'

type Step = 1 | 2 | 3

export const RegisterForm = () => {
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  // Form states for each step
  const [step1Data, setStep1Data] = useState<RegisterStep1Data | null>(null)
  const [step2Data, setStep2Data] = useState<RegisterStep2Data | null>(null)

  const steps = [
    { number: 1, title: 'Thông tin cơ bản', description: 'Email và mật khẩu' },
    { number: 2, title: 'Thông tin khách sạn', description: 'Chi tiết khách sạn' },
    { number: 3, title: 'Xác nhận', description: 'Hoàn tất đăng ký' },
  ]

  const progress = (currentStep / steps.length) * 100

  const handleStep1Submit = (data: RegisterStep1Data) => {
    setStep1Data(data)
    setCurrentStep(2)
  }

  const handleStep2Submit = (data: RegisterStep2Data) => {
    setStep2Data(data)
    setCurrentStep(3)
  }

  const handleFinalSubmit = async (data: RegisterStep3Data) => {
    if (!step1Data || !step2Data) return

    setIsSubmitting(true)

    try {
      // 1. Create auth user (trigger will create user profile + role automatically)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: step1Data.email,
        password: step1Data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: step1Data.fullName,
            phone: step1Data.phone,
          },
        },
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Không thể tạo tài khoản')

      // 2. Complete registration in ONE atomic transaction
      const { data: setupData, error: setupError } = await supabase.rpc(
        'complete_registration',
        {
          p_user_id: authData.user.id,
          p_full_name: step1Data.fullName,
          p_email: step1Data.email,
          p_phone: step1Data.phone || '',
          p_tenant_name: step2Data.tenantName,
          p_hotel_name: step2Data.hotelName,
          p_hotel_address: step2Data.hotelAddress,
          p_hotel_phone: step2Data.hotelPhone || '',
          p_hotel_email: step2Data.hotelEmail || '',
          p_total_rooms: step2Data.totalRooms,
        }
      )

      if (setupError) throw setupError

      const result = setupData as { success: boolean; error?: string }

      if (!result.success) {
        throw new Error(result.error || 'Không thể thiết lập khách sạn')
      }

      toast({
        title: 'Đăng ký thành công!',
        description: 'Tài khoản của bạn đã được tạo. Đang chuyển hướng...',
      })

      // Redirect to dashboard
      setTimeout(() => {
        navigate('/')
      }, 1000)
    } catch (error: any) {
      console.error('Registration error:', error)
      
      // Handle specific error cases
      if (error.code === 'user_already_exists' || error.message?.includes('already registered')) {
        toast({
          title: 'Email đã được đăng ký',
          description: 'Email này đã có tài khoản. Vui lòng đăng nhập hoặc sử dụng email khác.',
          variant: 'destructive',
        })
        // Go back to step 1 to allow changing email
        setCurrentStep(1)
      } else {
        toast({
          title: 'Đăng ký thất bại',
          description: error.message || 'Có lỗi xảy ra, vui lòng thử lại',
          variant: 'destructive',
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-2xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Đăng ký tài khoản</h1>
        <p className="mt-2 text-muted-foreground">
          Tạo tài khoản mới để bắt đầu quản lý khách sạn của bạn
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="mb-4 flex justify-between">
          {steps.map((step) => (
            <div
              key={step.number}
              className={`flex flex-1 flex-col items-center ${
                step.number < steps.length ? 'relative' : ''
              }`}
            >
              {/* Step Circle */}
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                  currentStep >= step.number
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted bg-background text-muted-foreground'
                }`}
              >
                {currentStep > step.number ? (
                  <Check className="h-5 w-5" />
                ) : (
                  step.number
                )}
              </div>

              {/* Step Info */}
              <div className="mt-2 text-center">
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  {step.description}
                </p>
              </div>

              {/* Connector Line */}
              {step.number < steps.length && (
                <div
                  className={`absolute top-5 left-1/2 h-0.5 w-full ${
                    currentStep > step.number ? 'bg-primary' : 'bg-muted'
                  }`}
                  style={{ transform: 'translateY(-50%)' }}
                />
              )}
            </div>
          ))}
        </div>

        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {steps[currentStep - 1].title}
          </CardTitle>
          <CardDescription>
            {steps[currentStep - 1].description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentStep === 1 && (
            <RegisterStep1
              onSubmit={handleStep1Submit}
              initialData={step1Data}
            />
          )}

          {currentStep === 2 && (
            <RegisterStep2
              onSubmit={handleStep2Submit}
              onBack={() => setCurrentStep(1)}
              initialData={step2Data}
            />
          )}

          {currentStep === 3 && (
            <RegisterStep3
              onSubmit={handleFinalSubmit}
              onBack={() => setCurrentStep(2)}
              step1Data={step1Data!}
              step2Data={step2Data!}
              isSubmitting={isSubmitting}
            />
          )}
        </CardContent>
      </Card>

      {/* Login Link */}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Đã có tài khoản?{' '}
        <Link to="/auth/login" className="text-primary hover:underline font-medium">
          Đăng nhập ngay
        </Link>
      </p>
    </div>
  )
}
