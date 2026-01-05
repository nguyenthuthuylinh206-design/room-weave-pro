import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Send, 
  Plus, 
  Trash2, 
  Loader2, 
  ExternalLink, 
  Users, 
  User, 
  CheckCircle2, 
  XCircle,
  MessageCircle,
  Copy,
  RefreshCw
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

interface TelegramGroup {
  id: string
  chat_id: string
  chat_title: string
  group_type: string
  hotel_id: string | null
  is_active: boolean
  created_at: string
  hotels?: { name: string } | null
}

export default function TelegramSettingsPage() {
  const { t } = useTranslation(['settings', 'common'])
  const { user, tenantId, hasAnyRole } = useUser()
  const isAdmin = hasAnyRole(['super_admin', 'owner', 'hotel_manager'])
  const queryClient = useQueryClient()
  
  const [addGroupOpen, setAddGroupOpen] = useState(false)
  const [newGroupChatId, setNewGroupChatId] = useState('')
  const [newGroupTitle, setNewGroupTitle] = useState('')
  const [newGroupType, setNewGroupType] = useState('general')
  const [testingSend, setTestingSend] = useState(false)

  // Bot info - replace with your actual bot username
  const BOT_USERNAME = 'RoomQCBot'
  
  // Generate connect link for user
  const connectLink = user?.id 
    ? `https://t.me/${BOT_USERNAME}?start=${user.id}` 
    : ''

  // Fetch user's personal Telegram connection
  const { data: myConnection, isLoading: loadingConnection, refetch: refetchConnection } = useQuery({
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

  // Fetch tenant's Telegram groups (admin only)
  const { data: groups, isLoading: loadingGroups, refetch: refetchGroups } = useQuery({
    queryKey: ['telegram-groups', tenantId],
    queryFn: async () => {
      if (!tenantId) return []
      const { data, error } = await supabase
        .from('telegram_groups')
        .select('*, hotels(name)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as TelegramGroup[]
    },
    enabled: !!tenantId && isAdmin
  })

  // Disconnect personal Telegram
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
      toast({ title: 'Đã ngắt kết nối Telegram' })
      refetchConnection()
    },
    onError: (error) => {
      toast({ title: 'Lỗi', description: String(error), variant: 'destructive' })
    }
  })

  // Add group
  const addGroupMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId || !newGroupChatId) throw new Error('Missing data')
      
      const { error } = await supabase
        .from('telegram_groups')
        .insert({
          tenant_id: tenantId,
          chat_id: newGroupChatId.trim(),
          chat_title: newGroupTitle.trim() || `Group ${newGroupChatId}`,
          group_type: newGroupType,
          added_by: user?.id,
          is_active: true
        })
      
      if (error) {
        if (error.code === '23505') {
          throw new Error('Nhóm này đã được thêm trước đó')
        }
        throw error
      }
    },
    onSuccess: () => {
      toast({ title: 'Đã thêm nhóm Telegram' })
      setAddGroupOpen(false)
      setNewGroupChatId('')
      setNewGroupTitle('')
      setNewGroupType('general')
      refetchGroups()
    },
    onError: (error) => {
      toast({ title: 'Lỗi', description: String(error), variant: 'destructive' })
    }
  })

  // Toggle group active
  const toggleGroupMutation = useMutation({
    mutationFn: async ({ groupId, isActive }: { groupId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('telegram_groups')
        .update({ is_active: isActive })
        .eq('id', groupId)
      
      if (error) throw error
    },
    onSuccess: () => {
      refetchGroups()
    }
  })

  // Delete group
  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from('telegram_groups')
        .delete()
        .eq('id', groupId)
      
      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: 'Đã xóa nhóm' })
      refetchGroups()
    }
  })

  // Send test notification
  const handleTestNotification = async () => {
    if (!tenantId) return
    
    setTestingSend(true)
    try {
      const { data, error } = await supabase.functions.invoke('send-telegram-notification', {
        body: {
          tenant_id: tenantId,
          user_ids: user?.id ? [user.id] : [],
          send_to_all_groups: true,
          title: '🔔 Test Notification',
          message: 'Đây là tin nhắn thử nghiệm từ RoomQC.\nNếu bạn nhận được tin này, kết nối đang hoạt động!',
          notification_type: 'system'
        }
      })
      
      if (error) throw error
      
      if (data.sent > 0) {
        toast({ 
          title: 'Đã gửi thông báo test', 
          description: `Gửi thành công đến ${data.sent}/${data.total} người nhận` 
        })
      } else {
        toast({ 
          title: 'Không có người nhận', 
          description: 'Chưa có tài khoản hoặc nhóm nào kết nối Telegram',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({ 
        title: 'Lỗi gửi thông báo', 
        description: String(error), 
        variant: 'destructive' 
      })
    } finally {
      setTestingSend(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: 'Đã copy' })
  }

  const groupTypeLabels: Record<string, string> = {
    general: 'Chung',
    owner: 'Chủ sở hữu',
    management: 'Quản lý',
    staff: 'Nhân viên'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-6 w-6" />
            Cài đặt Telegram
          </h1>
          <p className="text-muted-foreground mt-1">
            Nhận thông báo tức thì qua Telegram Bot
          </p>
        </div>
        {isAdmin && (
          <Button 
            variant="outline" 
            onClick={handleTestNotification}
            disabled={testingSend}
          >
            {testingSend ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Gửi test
          </Button>
        )}
      </div>

      {/* Personal Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Kết nối cá nhân
          </CardTitle>
          <CardDescription>
            Kết nối Telegram để nhận thông báo trực tiếp cho riêng bạn
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingConnection ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải...
            </div>
          ) : myConnection ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Đã kết nối</p>
                  <p className="text-sm text-muted-foreground">
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
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
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
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-muted-foreground" />
                <p className="text-muted-foreground">Chưa kết nối Telegram</p>
              </div>
              
              <Alert>
                <AlertDescription className="space-y-3">
                  <p>Để kết nối, làm theo các bước sau:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Nhấn nút bên dưới để mở Telegram</li>
                    <li>Nhấn <strong>Start</strong> trong Telegram</li>
                    <li>Quay lại đây và nhấn <strong>Làm mới</strong></li>
                  </ol>
                </AlertDescription>
              </Alert>
              
              <div className="flex gap-2">
                <Button asChild>
                  <a href={connectLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Mở Telegram
                  </a>
                </Button>
                <Button variant="outline" onClick={() => refetchConnection()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Làm mới
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Group Management (Admin only) */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Nhóm Telegram
                </CardTitle>
                <CardDescription>
                  Thêm nhóm Telegram để gửi thông báo cho nhiều người
                </CardDescription>
              </div>
              <Dialog open={addGroupOpen} onOpenChange={setAddGroupOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Thêm nhóm
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Thêm nhóm Telegram</DialogTitle>
                    <DialogDescription>
                      Thêm bot @{BOT_USERNAME} vào nhóm, sau đó nhập mã nhóm (Chat ID) được hiển thị
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <Alert>
                      <AlertDescription className="text-sm">
                        <strong>Hướng dẫn:</strong>
                        <ol className="list-decimal list-inside mt-2 space-y-1">
                          <li>Thêm @{BOT_USERNAME} vào nhóm Telegram của bạn</li>
                          <li>Bot sẽ gửi mã nhóm (Chat ID) vào nhóm</li>
                          <li>Nhập mã đó vào ô bên dưới</li>
                        </ol>
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-2">
                      <Label htmlFor="chat-id">Mã nhóm (Chat ID) *</Label>
                      <Input
                        id="chat-id"
                        placeholder="-1001234567890"
                        value={newGroupChatId}
                        onChange={(e) => setNewGroupChatId(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="group-title">Tên nhóm</Label>
                      <Input
                        id="group-title"
                        placeholder="VD: Nhóm quản lý khách sạn ABC"
                        value={newGroupTitle}
                        onChange={(e) => setNewGroupTitle(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Loại nhóm</Label>
                      <Select value={newGroupType} onValueChange={setNewGroupType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">Chung - Nhận tất cả thông báo</SelectItem>
                          <SelectItem value="owner">Chủ sở hữu - Chỉ thông báo quan trọng</SelectItem>
                          <SelectItem value="management">Quản lý - Thông báo quản lý</SelectItem>
                          <SelectItem value="staff">Nhân viên - Thông báo công việc</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddGroupOpen(false)}>
                      Hủy
                    </Button>
                    <Button 
                      onClick={() => addGroupMutation.mutate()}
                      disabled={!newGroupChatId.trim() || addGroupMutation.isPending}
                    >
                      {addGroupMutation.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Thêm nhóm
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {loadingGroups ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tải...
              </div>
            ) : groups && groups.length > 0 ? (
              <div className="space-y-3">
                {groups.map((group) => (
                  <div 
                    key={group.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{group.chat_title}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {groupTypeLabels[group.group_type] || group.group_type}
                          </Badge>
                          {group.hotels && (
                            <span>• {group.hotels.name}</span>
                          )}
                          <button 
                            className="hover:text-foreground flex items-center gap-1"
                            onClick={() => copyToClipboard(group.chat_id)}
                          >
                            <Copy className="h-3 w-3" />
                            {group.chat_id}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={group.is_active}
                        onCheckedChange={(checked) => 
                          toggleGroupMutation.mutate({ groupId: group.id, isActive: checked })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteGroupMutation.mutate(group.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Chưa có nhóm nào</p>
                <p className="text-sm mt-1">Thêm bot vào nhóm Telegram và nhập mã nhóm để bắt đầu</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Các loại thông báo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <span>🏨</span>
              <span>Đặt phòng mới</span>
            </div>
            <div className="flex items-center gap-2">
              <span>✅</span>
              <span>Check-in / Check-out</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🔧</span>
              <span>Yêu cầu bảo trì</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📦</span>
              <span>Cảnh báo kho hàng</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🧺</span>
              <span>Cập nhật giặt ủi</span>
            </div>
            <div className="flex items-center gap-2">
              <span>💰</span>
              <span>Thanh toán</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
