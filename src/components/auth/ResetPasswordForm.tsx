import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/contexts/AuthContext'
import { resetPasswordSchema, ResetPasswordData } from '@/lib/validations/auth.schemas'
import { PasswordStrengthMeter } from './PasswordStrengthMeter'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { supabase } from '@/integrations/supabase/client'

export function ResetPasswordForm() {
  const { t } = useTranslation(['auth', 'common'])
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { updatePassword } = useAuth()

  const form = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const password = form.watch('password')

  useEffect(() => {
    const verifyToken = async () => {
      const accessToken = searchParams.get('access_token')
      const type = searchParams.get('type')

      if (!accessToken || type !== 'recovery') {
        setIsValidToken(false)
        return
      }

      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error || !data.session) {
          setIsValidToken(false)
        } else {
          setIsValidToken(true)
        }
      } catch (error) {
        setIsValidToken(false)
      }
    }

    verifyToken()
  }, [searchParams])

  const onSubmit = async (data: ResetPasswordData) => {
    const { error } = await updatePassword(data.password)
    
    if (!error) {
      setIsSuccess(true)
      setTimeout(() => {
        navigate('/auth/login')
      }, 3000)
    }
  }

  if (isValidToken === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (isValidToken === false) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <CardTitle>{t('resetPassword.invalidLink')}</CardTitle>
          <CardDescription>
            {t('resetPassword.linkExpired')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              {t('resetPassword.requestNewLink')}
            </AlertDescription>
          </Alert>

          <Button
            onClick={() => navigate('/auth/forgot-password')}
            className="mt-4 w-full"
          >
            {t('resetPassword.requestNew')}
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          <CardTitle>{t('resetPassword.success')}</CardTitle>
          <CardDescription>
            {t('resetPassword.successDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              {t('resetPassword.redirecting')}
            </AlertDescription>
          </Alert>

          <Button
            onClick={() => navigate('/auth/login')}
            className="mt-4 w-full"
          >
            {t('login.loginButton')}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t('resetPassword.title')}</CardTitle>
        <CardDescription>
          {t('resetPassword.subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('resetPassword.newPassword')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...field}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="pl-10 pr-10"
                        autoComplete="new-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <PasswordStrengthMeter password={password} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('resetPassword.confirmPassword')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...field}
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="pl-10 pr-10"
                        autoComplete="new-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common:messages.loading')}
                </>
              ) : (
                t('resetPassword.resetButton')
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
