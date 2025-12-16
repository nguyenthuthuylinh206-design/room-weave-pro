import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Bell, Smartphone, Loader2, Save, Send, History } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useNotificationPreferences, NotificationPreferences } from '@/hooks/useNotificationPreferences'
import { triggerNotification } from '@/hooks/useNotificationTriggers'
import { useUser } from '@/hooks/useUser'
import { toast } from '@/hooks/use-toast'
import { useIsMobile } from '@/hooks/use-mobile'
import MobileNotificationSettingsPage from '@/pages/mobile/MobileNotificationSettingsPage'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'

export function NotificationSettingsPage() {
  const navigate = useNavigate()
  const { user, tenantId } = useUser()
  const isMobile = useIsMobile()
  const { isSupported, isSubscribed, isLoading: pushLoading, permission, subscribe, unsubscribe } = usePushNotifications()
  const { preferences, isLoading: prefsLoading, savePreferences, isSaving } = useNotificationPreferences()
  
  const [localPrefs, setLocalPrefs] = useState<Partial<NotificationPreferences>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)

  useEffect(() => {
    if (preferences) {
      setLocalPrefs(preferences)
    }
  }, [preferences])

  const handleChange = (key: keyof NotificationPreferences, value: boolean | number | string) => {
    setLocalPrefs(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    await savePreferences(localPrefs)
    setHasChanges(false)
    toast({ title: 'Đã lưu cài đặt thông báo' })
  }

  const handleCancel = () => {
    setLocalPrefs(preferences)
    setHasChanges(false)
  }

  const handleSendTestNotification = async () => {
    if (!user?.id || !tenantId) {
      toast({ title: 'Lỗi', description: 'Không tìm thấy thông tin user', variant: 'destructive' })
      return
    }
    
    setSendingTest(true)
    try {
      await triggerNotification(
        user.id,
        tenantId,
        '🔔 Thông báo test',
        'Đây là thông báo test từ hệ thống. Nếu bạn nhận được thì cài đặt đã hoạt động!',
        'info',
        '/settings/notifications',
        isSubscribed
      )
      toast({ 
        title: 'Đã gửi thông báo test', 
        description: 'Kiểm tra trong trung tâm thông báo' 
      })
    } catch (error) {
      toast({ 
        title: 'Lỗi', 
        description: 'Không thể gửi thông báo test',
        variant: 'destructive'
      })
    } finally {
      setSendingTest(false)
    }
  }

  // Render mobile version
  if (isMobile) {
    return <MobileNotificationSettingsPage />
  }

  if (prefsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Thông báo</h1>
          <p className="text-muted-foreground mt-2">
            Xem và quản lý thông báo của bạn
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/notifications')}>
            <History className="h-4 w-4 mr-2" />
            Lịch sử
          </Button>
          <Button 
            variant="outline" 
            onClick={handleSendTestNotification}
            disabled={sendingTest}
          >
            {sendingTest ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Gửi test
          </Button>
        </div>
      </div>

      {/* Notification Center Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Trung tâm thông báo
          </CardTitle>
          <CardDescription>Tất cả thông báo gần đây của bạn</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <NotificationCenter />
        </CardContent>
      </Card>
    </div>
  )
}
