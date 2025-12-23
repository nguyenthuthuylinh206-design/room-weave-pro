import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react'
import { User as AuthUser, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'

// Silent refresh interval: 30 minutes
const REFRESH_INTERVAL_MS = 30 * 60 * 1000

interface AuthContextType {
  user: AuthUser | null
  session: Session | null
  loading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ data: any; error: any }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: any }>
  updatePassword: (newPassword: string) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const isManualLogout = useRef(false)
  const previousSessionRef = useRef<Session | null>(null)

  // Silent refresh: refresh token periodically to keep session alive
  useEffect(() => {
    const silentRefresh = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        if (currentSession) {
          const { data, error } = await supabase.auth.refreshSession()
          if (error) {
            console.warn('[Auth] Silent refresh failed:', error.message)
          } else if (data.session) {
            console.log('[Auth] Token refreshed silently')
          }
        }
      } catch (err) {
        console.warn('[Auth] Silent refresh error:', err)
      }
    }

    // Initial refresh when component mounts (in case token is stale)
    silentRefresh()

    // Set up periodic refresh
    const refreshInterval = setInterval(silentRefresh, REFRESH_INTERVAL_MS)

    return () => clearInterval(refreshInterval)
  }, [])

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[Auth] State change:', event)
        
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Handle auth events
        if (event === 'TOKEN_REFRESHED') {
          console.log('[Auth] Token refreshed successfully')
        }

        if (event === 'SIGNED_OUT') {
          // Check if this was an unexpected logout (session expired)
          if (!isManualLogout.current && previousSessionRef.current) {
            console.log('[Auth] Session expired unexpectedly')
            toast({
              title: 'Phiên đăng nhập hết hạn',
              description: 'Vui lòng đăng nhập lại để tiếp tục sử dụng ứng dụng.',
              variant: 'destructive',
            })
          }
          setUser(null)
          setSession(null)
          isManualLogout.current = false
        }

        // Store previous session for detecting unexpected logouts
        previousSessionRef.current = session
      }
    )

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      previousSessionRef.current = session
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [toast])

  const signIn = useCallback(async (email: string, password: string) => {
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
  }, [toast])

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
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
  }, [toast])

  const resetPassword = useCallback(async (email: string) => {
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
  }, [toast])

  const updatePassword = useCallback(async (newPassword: string) => {
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
  }, [toast])

  const signOut = useCallback(async () => {
    try {
      // Mark as manual logout to prevent "session expired" toast
      isManualLogout.current = true
      
      // Clear local state FIRST (important for graceful logout)
      setUser(null)
      setSession(null)
      previousSessionRef.current = null
      
      // Clear React Query cache
      queryClient.clear()
      
      // Then call API (may fail if session already expired - that's ok)
      const { error } = await supabase.auth.signOut()
      
      // Only show error toast if it's a real error (not session missing)
      if (error && !error.message?.includes('session')) {
        console.error('SignOut API error:', error)
      }

      toast({
        title: 'Đã đăng xuất',
        description: 'Hẹn gặp lại bạn!',
      })
    } catch (error: any) {
      // Silent fail - user is still logged out locally
      console.error('SignOut error:', error)
      toast({
        title: 'Đã đăng xuất',
        description: 'Hẹn gặp lại bạn!',
      })
    }
  }, [toast, queryClient])

  const value: AuthContextType = {
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
