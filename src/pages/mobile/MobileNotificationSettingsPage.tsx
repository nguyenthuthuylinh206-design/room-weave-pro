import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Send, History, Loader2 } from 'lucide-react'
import { triggerNotification } from '@/hooks/useNotificationTriggers'
import { useUser } from '@/hooks/useUser'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { toast } from '@/hooks/use-toast'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'

export default function MobileNotificationSettingsPage() {
  const navigate = useNavigate()
  const { user, tenantId } = useUser()
  const { isSubscribed } = usePushNotifications()
  const [sendingTest, setSendingTest] = useState(false)

  const handleSendTestNotification = async () => {
    if (!user?.id || !tenantId) return
    
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b flex-shrink-0">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold">Thông báo</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/notifications')}
            >
              <History className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleSendTestNotification}
              disabled={sendingTest}
            >
              {sendingTest ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Notification Center */}
      <div className="flex-1 overflow-hidden">
        <NotificationCenter fullHeight />
      </div>
    </div>
  )
}
