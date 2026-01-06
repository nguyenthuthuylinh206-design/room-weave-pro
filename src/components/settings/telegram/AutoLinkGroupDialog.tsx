import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ExternalLink, Loader2, CheckCircle2, Clock } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from '@/hooks/useUser'
import { toast } from '@/hooks/use-toast'
import { DEPARTMENTS, GROUP_TYPES, NOTIFICATION_TYPES } from './AddTelegramGroupDialog'

interface AutoLinkGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  selectedHotel: { id: string; name: string } | null
  isAllHotelsMode: boolean
  botUsername: string
}

export function AutoLinkGroupDialog({
  open,
  onOpenChange,
  onSuccess,
  selectedHotel,
  isAllHotelsMode,
  botUsername,
}: AutoLinkGroupDialogProps) {
  const { user, tenantId } = useUser()
  
  const [step, setStep] = useState<'config' | 'waiting'>('config')
  const [groupType, setGroupType] = useState('staff')
  const [department, setDepartment] = useState<string>('')
  const [notificationTypes, setNotificationTypes] = useState<string[]>([])
  const [pendingLinkId, setPendingLinkId] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(600) // 10 minutes in seconds
  const [isCreating, setIsCreating] = useState(false)
  const [linkedGroup, setLinkedGroup] = useState<{ title: string } | null>(null)

  // Fetch user's telegram connection to get telegram_user_id
  const [telegramUserId, setTelegramUserId] = useState<string | null>(null)

  useEffect(() => {
    if (open && user?.id) {
      fetchTelegramConnection()
    }
  }, [open, user?.id])

  const fetchTelegramConnection = async () => {
    if (!user?.id) return
    
    const { data } = await supabase
      .from('telegram_connections')
      .select('chat_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
    
    if (data) {
      setTelegramUserId(data.chat_id)
    }
  }

  // Countdown timer
  useEffect(() => {
    if (step !== 'waiting') return
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          handleExpired()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [step])

  // Realtime subscription for new telegram groups
  useEffect(() => {
    if (step !== 'waiting' || !pendingLinkId) return

    const channel = supabase
      .channel('pending-group-completion')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pending_group_links',
          filter: `id=eq.${pendingLinkId}`
        },
        (payload) => {
          const updated = payload.new as any
          if (updated.status === 'completed') {
            setLinkedGroup({ title: updated.chat_id })
            toast({
              title: '✅ Nhóm đã được liên kết!',
              description: 'Nhóm Telegram đã được thêm tự động.',
            })
            setTimeout(() => {
              onSuccess()
              handleClose()
            }, 1500)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [step, pendingLinkId])

  const handleExpired = async () => {
    if (pendingLinkId) {
      await supabase
        .from('pending_group_links')
        .update({ status: 'expired' })
        .eq('id', pendingLinkId)
    }
    toast({
      title: 'Hết thời gian',
      description: 'Vui lòng thử lại.',
      variant: 'destructive'
    })
    handleClose()
  }

  const handleStartLink = async () => {
    if (!tenantId || !user?.id) return

    setIsCreating(true)
    try {
      // Create pending link record
      const { data, error } = await supabase
        .from('pending_group_links')
        .insert({
          tenant_id: tenantId,
          hotel_id: !isAllHotelsMode && selectedHotel ? selectedHotel.id : null,
          added_by: user.id,
          telegram_user_id: telegramUserId || user.id, // Fallback to user.id if no telegram connection
          group_type: groupType,
          department: department || null,
          notification_types: notificationTypes.length > 0 ? notificationTypes : null,
          status: 'pending'
        })
        .select('id')
        .single()

      if (error) throw error

      setPendingLinkId(data.id)
      setStep('waiting')
      setCountdown(600)

      // Open Telegram with startgroup
      const telegramLink = `https://t.me/${botUsername}?startgroup=true`
      window.open(telegramLink, '_blank')
    } catch (error) {
      console.error('Error creating pending link:', error)
      toast({
        title: 'Lỗi',
        description: String(error),
        variant: 'destructive'
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    setStep('config')
    setGroupType('staff')
    setDepartment('')
    setNotificationTypes([])
    setPendingLinkId(null)
    setCountdown(600)
    setLinkedGroup(null)
    onOpenChange(false)
  }

  const toggleNotificationType = (type: string) => {
    setNotificationTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>🔗 Liên kết nhóm Telegram</DialogTitle>
          <DialogDescription>
            {step === 'config' 
              ? 'Chọn cấu hình cho nhóm mới, sau đó thêm bot vào nhóm' 
              : 'Đang chờ bạn thêm bot vào nhóm Telegram...'}
          </DialogDescription>
        </DialogHeader>

        {linkedGroup ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle2 className="h-16 w-16 text-green-600" />
            <div className="text-center">
              <p className="font-medium text-lg">Đã liên kết thành công!</p>
              <p className="text-muted-foreground">Nhóm đã được thêm vào hệ thống</p>
            </div>
          </div>
        ) : step === 'config' ? (
          <div className="space-y-4">
            {/* Department */}
            <div className="space-y-2">
              <Label>Bộ phận</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn bộ phận..." />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map(dept => (
                    <SelectItem key={dept.value} value={dept.value}>
                      {dept.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Group Type */}
            <div className="space-y-2">
              <Label>Loại nhóm</Label>
              <Select value={groupType} onValueChange={setGroupType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GROUP_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notification Types */}
            <div className="space-y-2">
              <Label>Loại thông báo</Label>
              <div className="grid grid-cols-2 gap-2">
                {NOTIFICATION_TYPES.map(type => (
                  <label 
                    key={type.value}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={notificationTypes.includes(type.value)}
                      onCheckedChange={() => toggleNotificationType(type.value)}
                    />
                    {type.label}
                  </label>
                ))}
              </div>
            </div>

            {!telegramUserId && (
              <Alert>
                <AlertDescription className="text-sm">
                  💡 Để liên kết tự động tốt hơn, hãy kết nối Telegram cá nhân trước.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Hủy
              </Button>
              <Button 
                onClick={handleStartLink} 
                disabled={isCreating}
                className="flex-1"
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                Mở Telegram
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center">
              <div className="relative">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <Clock className="h-6 w-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            <div className="text-center space-y-2">
              <p className="font-medium">Đang chờ kết nối...</p>
              <p className="text-sm text-muted-foreground">
                Thêm bot <code>@{botUsername}</code> vào nhóm Telegram của bạn
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted">
                <Clock className="h-4 w-4" />
                <span className="font-mono text-lg">{formatTime(countdown)}</span>
              </div>
            </div>

            <Alert>
              <AlertDescription className="text-sm">
                <ol className="list-decimal list-inside space-y-1">
                  <li>Mở Telegram và tạo/chọn nhóm</li>
                  <li>Thêm <code>@{botUsername}</code> vào nhóm</li>
                  <li>Nhóm sẽ tự động được liên kết</li>
                </ol>
              </AlertDescription>
            </Alert>

            <Button 
              variant="outline" 
              onClick={() => {
                window.open(`https://t.me/${botUsername}?startgroup=true`, '_blank')
              }}
              className="w-full"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Mở lại Telegram
            </Button>

            <Button variant="ghost" onClick={handleClose} className="w-full">
              Hủy
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
