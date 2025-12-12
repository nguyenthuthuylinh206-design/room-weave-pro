import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useUser } from '@/hooks/useUser'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useToast } from '@/hooks/use-toast'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { user: authUser } = useAuth()
  const { user, isLoading } = useUser()
  const { toast } = useToast()

  useEffect(() => {
    if (isLoading) return

    // Wait for user data to load
    if (!authUser) {
      navigate('/auth/login', { replace: true })
      return
    }

    // Check if user has completed setup
    if (!user?.tenant_id || !user?.hotel_id) {
      // User needs to complete onboarding
      navigate('/onboarding', { replace: true })
    } else {
      // User is fully set up, go to dashboard
      toast({
        title: 'Đăng nhập thành công',
        description: 'Chào mừng bạn quay trở lại!',
      })
      navigate('/', { replace: true })
    }
  }, [authUser, user, isLoading, navigate, toast])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-muted-foreground">Đang xác thực...</p>
      </div>
    </div>
  )
}
