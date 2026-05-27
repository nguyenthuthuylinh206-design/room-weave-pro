import { useState, useRef, useEffect, FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  useConversations,
  useMessages,
  useSendMessage,
  useMarkConversationRead,
  useCreateDirectConversation,
  useCreateGroupConversation,
  useHotelMembers,
  uploadChatAttachment,
  type ConversationListItem,
  type ChatAttachment,
  type UploadedChatAttachment,
} from '@/hooks/useChat'
import { useUser } from '@/hooks/useUser'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { toast } from 'sonner'
import { Paperclip, X, FileText, Loader2, Download } from 'lucide-react'

function ConversationRow({
  conv,
  active,
  onClick,
  meId,
}: {
  conv: ConversationListItem
  active: boolean
  onClick: () => void
  meId: string
}) {
  const title =
    conv.type === 'direct'
      ? conv.peer?.full_name || 'Người dùng'
      : conv.name || 'Nhóm'
  const preview =
    conv.last_sender_id === meId
      ? `Bạn: ${conv.last_message_preview || ''}`
      : conv.last_message_preview || 'Chưa có tin nhắn'
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-2 border-b hover:bg-muted/40 transition-colors',
        active && 'bg-muted'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium truncate">{title}</span>
        {conv.last_message_at && (
          <span className="text-xs text-muted-foreground shrink-0">
            {formatDistanceToNow(new Date(conv.last_message_at), { locale: vi, addSuffix: false })}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 mt-0.5">
        <span className="text-xs text-muted-foreground truncate">{preview}</span>
        {conv.unread_count > 0 && (
          <span className="text-xs font-semibold text-red-600 shrink-0">
            {conv.unread_count}
          </span>
        )}
      </div>
    </button>
  )
}

function NewConversationDialog({ onCreated }: { onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'dm' | 'group'>('dm')
  const [groupName, setGroupName] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const { data: members = [], isLoading } = useHotelMembers()
  const createDM = useCreateDirectConversation()
  const createGroup = useCreateGroupConversation()

  const reset = () => {
    setGroupName('')
    setSelected([])
    setTab('dm')
  }

  const handleCreate = async () => {
    try {
      if (tab === 'dm') {
        if (selected.length !== 1) {
          toast.error('Chọn đúng 1 người để chat trực tiếp')
          return
        }
        const id = await createDM.mutateAsync(selected[0])
        onCreated(id)
      } else {
        if (!groupName.trim()) {
          toast.error('Nhập tên nhóm')
          return
        }
        if (selected.length < 1) {
          toast.error('Chọn ít nhất 1 thành viên')
          return
        }
        const id = await createGroup.mutateAsync({ name: groupName, memberIds: selected })
        onCreated(id)
      }
      setOpen(false)
      reset()
    } catch (e: any) {
      toast.error(e.message || 'Không tạo được hội thoại')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8">
          + Mới
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Hội thoại mới</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="dm">Chat 1-1</TabsTrigger>
            <TabsTrigger value="group">Tạo nhóm</TabsTrigger>
          </TabsList>
          <TabsContent value="group" className="space-y-2 mt-3">
            <Input
              placeholder="Tên nhóm"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="h-9"
            />
          </TabsContent>
          <TabsContent value="dm" className="mt-3" />
        </Tabs>
        <div className="border rounded-md">
          <ScrollArea className="h-64">
            {isLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Đang tải...</div>
            ) : members.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">Không có thành viên</div>
            ) : (
              members.map((m: any) => {
                const checked = selected.includes(m.id)
                return (
                  <label
                    key={m.id}
                    className="flex items-center gap-2 px-3 py-2 border-b cursor-pointer hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(c) => {
                        if (c) {
                          if (tab === 'dm') setSelected([m.id])
                          else setSelected([...selected, m.id])
                        } else {
                          setSelected(selected.filter((x) => x !== m.id))
                        }
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{m.full_name || m.email}</div>
                      {m.full_name && (
                        <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                      )}
                    </div>
                  </label>
                )
              })
            )}
          </ScrollArea>
        </div>
        <Button
          onClick={handleCreate}
          disabled={createDM.isPending || createGroup.isPending}
          className="w-full"
        >
          {createDM.isPending || createGroup.isPending ? 'Đang tạo...' : 'Tạo hội thoại'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}

function ConversationView({ conversationId }: { conversationId: string }) {
  const { user } = useUser()
  const { data: messages = [], isLoading } = useMessages(conversationId)
  const sendMessage = useSendMessage(conversationId)
  const markRead = useMarkConversationRead()
  const [text, setText] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  useEffect(() => {
    if (conversationId && messages.length > 0) {
      markRead.mutate(conversationId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, messages.length])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const body = text.trim()
    if (!body) return
    setText('')
    try {
      await sendMessage.mutateAsync(body)
    } catch (err: any) {
      toast.error(err.message || 'Không gửi được')
      setText(body)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2"
      >
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Đang tải...</div>
        ) : messages.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện.
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === user?.id
            return (
              <div
                key={m.id}
                className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}
              >
                {!mine && (
                  <span className="text-xs text-muted-foreground mb-0.5 px-1">
                    {m.sender?.full_name || 'Người dùng'}
                  </span>
                )}
                <div
                  className={cn(
                    'max-w-[75%] rounded-lg px-3 py-2 text-sm break-words',
                    mine ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}
                >
                  {m.deleted_at ? (
                    <span className="italic text-muted-foreground">Tin nhắn đã xoá</span>
                  ) : (
                    m.body
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                  {new Date(m.created_at).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {m.edited_at && ' · đã sửa'}
                </span>
              </div>
            )
          })
        )}
      </div>
      <form onSubmit={handleSubmit} className="border-t p-2 flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nhập tin nhắn..."
          className="h-9"
          autoFocus
        />
        <Button type="submit" size="sm" className="h-9" disabled={!text.trim() || sendMessage.isPending}>
          Gửi
        </Button>
      </form>
    </div>
  )
}

export default function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const navigate = useNavigate()
  const { user } = useUser()
  const { data: conversations = [], isLoading } = useConversations()

  const activeConv = conversations.find((c) => c.id === conversationId) || null

  const activeTitle = activeConv
    ? activeConv.type === 'direct'
      ? activeConv.peer?.full_name || 'Người dùng'
      : activeConv.name || 'Nhóm'
    : null

  return (
    <div className="h-[calc(100vh-12rem)] md:h-[calc(100vh-10rem)] border rounded-lg overflow-hidden flex">
      {/* Sidebar */}
      <div
        className={cn(
          'w-full md:w-80 border-r flex flex-col',
          conversationId && 'hidden md:flex'
        )}
      >
        <div className="p-3 border-b flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Tin nhắn</h2>
          <NewConversationDialog onCreated={(id) => navigate(`/chat/${id}`)} />
        </div>
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Đang tải...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              Chưa có hội thoại. Nhấn "+ Mới" để bắt đầu.
            </div>
          ) : (
            conversations.map((c) => (
              <ConversationRow
                key={c.id}
                conv={c}
                active={c.id === conversationId}
                meId={user?.id || ''}
                onClick={() => navigate(`/chat/${c.id}`)}
              />
            ))
          )}
        </ScrollArea>
      </div>

      {/* Conversation pane */}
      <div className={cn('flex-1 flex flex-col', !conversationId && 'hidden md:flex')}>
        {conversationId ? (
          <>
            <div className="px-4 py-3 border-b flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden h-8 px-2"
                onClick={() => navigate('/chat')}
              >
                ←
              </Button>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{activeTitle}</div>
                <div className="text-xs text-muted-foreground">
                  {activeConv?.type === 'group' ? 'Nhóm' : 'Chat trực tiếp'}
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <ConversationView conversationId={conversationId} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Chọn một hội thoại để bắt đầu
          </div>
        )}
      </div>
    </div>
  )
}
