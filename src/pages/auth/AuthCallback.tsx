import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useUser } from '@/hooks/useUser'
import { useFirstAccessibleRoute } from '@/hooks/useFirstAccessibleRoute'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useToast } from '@/hooks/use-toast'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { user: authUser } = useAuth()
  const { user, isLoading: isUserLoading } = useUser()
  const { firstAccessibleRoute, isLoading: isPermissionsLoading } = useFirstAccessibleRoute()
  const { toast } = useToast()

  const isLoading = isUserLoading || isPermissionsLoading

  useEffect(() => {
    // Vẫn đang load → chờ tiếp
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
      return
    }
    
    // firstAccessibleRoute = null nghĩa là đang chờ permissions load
    if (firstAccessibleRoute === null) {
      return
    }

    // Có route để redirect
    if (firstAccessibleRoute !== '/unauthorized') {
      toast({
        title: 'Đăng nhập thành công',
        description: 'Chào mừng bạn quay trở lại!',
      })
    }
    
    navigate(firstAccessibleRoute, { replace: true })
  }, [authUser, user, isLoading, firstAccessibleRoute, navigate, toast])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-muted-foreground">Đang xác thực...</p>
      </div>
    </div>
  )
}
