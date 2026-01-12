import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Loader2, 
  ExternalLink, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  Bell,
  MessageCircle,
  Save
} from 'lucide-react'
import { useUser } from '@/hooks/useUser'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'

interface TelegramConnection {
  id: string
  chat_id: string
  chat_type: string
  username: string | null
  first_name: string | null
  is_active: boolean
  created_at: string
}

interface TelegramConnectionCardProps {
  compact?: boolean
}

export function TelegramConnectionCard({ compact = false }: TelegramConnectionCardProps) {
  const { user } = useUser()
  const queryClient = useQueryClient()
  const [telegramUsername, setTelegramUsername] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  
  const BOT_USERNAME = 'roomqc_bot'
  const connectLink = user?.id 
    ? `https://t.me/${BOT_USERNAME}?start=${user.id}` 
    : ''

  // Fetch user's personal Telegram connection (for notifications)
  const { data: myConnection, isLoading: isLoadingConnection, refetch: refetchConnection } = useQuery({
    queryKey: ['telegram-connection', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const { data, error } = await supabase
        .from('telegram_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()
      
      if (error) throw error
      return data as TelegramConnection | null
    },
    enabled: !!user?.id
  })

  // Fetch user's telegram_username from users table
  const { data: userProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['user-telegram-username', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const { data, error } = await supabase
        .from('users')
        .select('telegram_username')
        .eq('id', user.id)
        .single()
      
      if (error) throw error
      return data as { telegram_username: string | null }
    },
    enabled: !!user?.id
  })

  // Disconnect personal Telegram (bot)
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not found')
      const { error } = await supabase
        .from('telegram_connections')
        .update({ is_active: false })
        .eq('user_id', user.id)
      
      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: 'Đã ngắt kết nối Telegram Bot' })
      refetchConnection()
    },
    onError: (error) => {
      toast({ title: 'Lỗi', description: String(error), variant: 'destructive' })
    }
  })

  // Save telegram username
  const saveUsernameMutation = useMutation({
    mutationFn: async (username: string) => {
      if (!user?.id) throw new Error('User not found')
      
      // Clean username (remove @ if present)
      const cleanUsername = username.trim().replace('@', '') || null
      
      const { error } = await supabase
        .from('users')
        .update({ telegram_username: cleanUsername })
        .eq('id', user.id)
      
      if (error) throw error
      return cleanUsername
    },
    onSuccess: (cleanUsername) => {
      toast({ title: cleanUsername ? 'Đã lưu username Telegram' : 'Đã xóa username Telegram' })
      queryClient.invalidateQueries({ queryKey: ['user-telegram-username', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['staff-status'] })
      setIsEditing(false)
    },
    onError: (error) => {
      toast({ title: 'Lỗi', description: String(error), variant: 'destructive' })
    }
  })

  const isLoading = isLoadingConnection || isLoadingProfile

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Đang tải...
      </div>
    )
  }

  const currentUsername = userProfile?.telegram_username?.replace('@', '') || ''

  return (
    <div className="space-y-6">
      {/* Section 1: Bot Connection for Notifications */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Bell className="h-4 w-4" />
          Nhận thông báo (qua Bot)
        </div>
        
        {myConnection ? (
          <div className={`flex ${compact ? 'flex-col gap-3' : 'items-center justify-between'}`}>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-sm">Đã kết nối</p>
                <p className="text-xs text-muted-foreground">
                  {myConnection.first_name}
                  {myConnection.username && ` (@${myConnection.username})`}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => refetchConnection()}
                type="button"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
                type="button"
              >
                {disconnectMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Ngắt kết nối'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Chưa kết nối Bot</p>
            </div>
            
            <Alert>
              <AlertDescription className="space-y-2">
                <p className="text-xs">Để nhận thông báo qua Telegram:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Nhấn <strong>Mở Telegram</strong></li>
                  <li>Nhấn <strong>Start</strong> trong Telegram</li>
                  <li>Quay lại và nhấn <strong>Làm mới</strong></li>
                </ol>
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-2">
              <Button size="sm" asChild>
                <a href={connectLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Mở Telegram
                </a>
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetchConnection()} type="button">
                <RefreshCw className="h-4 w-4 mr-2" />
                Làm mới
              </Button>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Section 2: Personal Telegram Username for Direct Chat */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MessageCircle className="h-4 w-4" />
          Username Telegram (để đồng nghiệp liên lạc)
        </div>
        
        {!isEditing && currentUsername ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm">@{currentUsername}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setTelegramUsername(currentUsername)
                setIsEditing(true)
              }}
              type="button"
            >
              Sửa
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="telegram-username" className="text-xs">
                Username Telegram của bạn
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    @
                  </span>
                  <Input
                    id="telegram-username"
                    value={telegramUsername}
                    onChange={(e) => setTelegramUsername(e.target.value.replace('@', ''))}
                    placeholder="username"
                    className="pl-7 h-9"
                  />
                </div>
                <Button 
                  size="sm"
                  onClick={() => saveUsernameMutation.mutate(telegramUsername)}
                  disabled={saveUsernameMutation.isPending}
                  type="button"
                >
                  {saveUsernameMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-1" />
                      Lưu
                    </>
                  )}
                </Button>
                {isEditing && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setIsEditing(false)
                      setTelegramUsername(currentUsername)
                    }}
                    type="button"
                  >
                    Hủy
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Nhập username để đồng nghiệp có thể chat trực tiếp với bạn trên Telegram
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
