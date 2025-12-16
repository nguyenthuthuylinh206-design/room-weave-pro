import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { LoginForm } from '@/components/auth/LoginForm'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

const Login = () => {
  const { t } = useTranslation('auth')
  const { isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Chỉ redirect khi auth đã load xong và user đã authenticated
    if (!loading && isAuthenticated) {
      navigate('/auth/callback', { replace: true })
    }
  }, [isAuthenticated, loading, navigate])

  // Show loading while auth is initializing
  if (loading) {
    return <LoadingSpinner fullScreen />
  }

  // If authenticated, don't render the form (will redirect)
  if (isAuthenticated) {
    return <LoadingSpinner fullScreen />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4 relative">
      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">{t('login.title')}</CardTitle>
          <CardDescription className="text-center">
            {t('login.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  )
}

export default Login
