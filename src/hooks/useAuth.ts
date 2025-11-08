import { useState, useEffect } from 'react'
import { User as AuthUser, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Handle auth events
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setSession(null)
        }
      }
    )

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      toast({
        title: 'Đăng nhập thành công',
        description: 'Chào mừng bạn quay trở lại!',
      })

      return { data, error: null }
    } catch (error: any) {
      toast({
        title: 'Đăng nhập thất bại',
        description: error.message || 'Vui lòng kiểm tra lại thông tin đăng nhập',
        variant: 'destructive',
      })
      return { data: null, error }
    }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) throw error

      toast({
        title: 'Đăng ký thành công',
        description: 'Vui lòng kiểm tra email để xác thực tài khoản.',
      })

      return { data, error: null }
    } catch (error: any) {
      toast({
        title: 'Đăng ký thất bại',
        description: error.message || 'Có lỗi xảy ra khi tạo tài khoản',
        variant: 'destructive',
      })
      return { data: null, error }
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) throw error

      toast({
        title: 'Email đã gửi',
        description: 'Vui lòng kiểm tra email để đặt lại mật khẩu.',
      })

      return { error: null }
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      })
      return { error }
    }
  }

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      toast({
        title: 'Cập nhật thành công',
        description: 'Mật khẩu của bạn đã được thay đổi.',
      })

      return { error: null }
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      })
      return { error }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      toast({
        title: 'Đã đăng xuất',
        description: 'Hẹn gặp lại bạn!',
      })
    } catch (error: any) {
      toast({
        title: 'Lỗi đăng xuất',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    isAuthenticated: !!user,
  }
}
