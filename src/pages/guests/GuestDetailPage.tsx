import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Phone, Mail, CreditCard, MapPin, Star, Calendar, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useGuest, useGuestBookings, useUpdateGuest } from '@/hooks/useGuests'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { useState } from 'react'

const VIP_LEVELS = [
  { value: 'normal', label: 'Thường' },
  { value: 'silver', label: 'Bạc' },
  { value: 'gold', label: 'Vàng' },
  { value: 'vip', label: 'VIP' },
  { value: 'blacklist', label: 'Blacklist' },
]

export default function GuestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: guest, isLoading } = useGuest(id)
  const { data: bookings = [] } = useGuestBookings(id)
  const updateGuest = useUpdateGuest()
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState<Record<string, any>>({})

  if (isLoading) {
    return <div className="space-y-4">
      <div className="h-8 w-48 bg-muted animate-pulse rounded" />
      <div className="h-40 bg-muted animate-pulse rounded-lg" />
    </div>
  }

  if (!guest) {
    return <div className="text-center py-12 text-muted-foreground">Không tìm thấy khách hàng</div>
  }

  const handleSave = async () => {
    await updateGuest.mutateAsync({ id: guest.id, ...editData })
    setEditing(false)
    setEditData({})
  }

  const startEdit = () => {
    setEditing(true)
    setEditData({
      full_name: guest.full_name,
      phone: guest.phone || '',
      email: guest.email || '',
      nationality: guest.nationality || '',
      address: guest.address || '',
      vip_level: guest.vip_level,
      notes: guest.notes || '',
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="icon" onClick={() => navigate('/guests')} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold">{guest.full_name}</h1>
        {!editing && (
          <Button type="button" variant="outline" size="sm" onClick={startEdit} className="ml-auto h-8">
            <Edit2 className="h-3.5 w-3.5 mr-1" /> Sửa
          </Button>
        )}
      </div>

      {/* Guest Info */}
      <div className="border rounded-lg p-4 space-y-3">
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Họ tên</Label>
                <Input className="h-8" value={editData.full_name} onChange={(e) => setEditData(p => ({ ...p, full_name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">SĐT</Label>
                <Input className="h-8" value={editData.phone} onChange={(e) => setEditData(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input className="h-8" value={editData.email} onChange={(e) => setEditData(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hạng khách</Label>
                <Select value={editData.vip_level} onValueChange={(v) => setEditData(p => ({ ...p, vip_level: v }))}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VIP_LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Quốc tịch</Label>
                <Input className="h-8" value={editData.nationality} onChange={(e) => setEditData(p => ({ ...p, nationality: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Địa chỉ</Label>
                <Input className="h-8" value={editData.address} onChange={(e) => setEditData(p => ({ ...p, address: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ghi chú</Label>
              <Input className="h-8" value={editData.notes} onChange={(e) => setEditData(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => setEditing(false)}>Hủy</Button>
              <Button type="button" size="sm" className="h-8" onClick={handleSave} disabled={updateGuest.isPending}>Lưu</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {guest.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{guest.phone}</div>}
              {guest.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{guest.email}</div>}
              {guest.id_number && <div className="flex items-center gap-2"><CreditCard className="h-3.5 w-3.5 text-muted-foreground" />{guest.id_type?.toUpperCase()}: {guest.id_number}</div>}
              {guest.nationality && <div className="flex items-center gap-2">Quốc tịch: {guest.nationality}</div>}
              {guest.address && <div className="flex items-center gap-2 col-span-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{guest.address}</div>}
            </div>
            <div className="flex items-center gap-4 pt-2 border-t text-sm">
              <div><span className="text-muted-foreground">Hạng:</span> <span className="font-medium">{VIP_LEVELS.find(l => l.value === guest.vip_level)?.label}</span></div>
              <div><span className="text-muted-foreground">Số lần ở:</span> <span className="font-medium">{guest.total_stays}</span></div>
              <div><span className="text-muted-foreground">Tổng chi tiêu:</span> <span className="font-medium font-mono">{formatCurrency(guest.total_spent)}</span></div>
              {guest.last_stay_date && <div><span className="text-muted-foreground">Lần cuối:</span> <span className="font-medium">{format(new Date(guest.last_stay_date), 'dd/MM/yyyy')}</span></div>}
            </div>
            {guest.notes && <p className="text-xs text-muted-foreground pt-1">{guest.notes}</p>}
          </>
        )}
      </div>

      {/* Booking History */}
      <div>
        <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Calendar className="h-4 w-4" /> Lịch sử đặt phòng ({bookings.length})
        </h2>
        {bookings.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Chưa có lịch sử</p>
        ) : (
          <div className="border rounded-lg divide-y">
            {bookings.map((b: any) => (
              <div
                key={b.id}
                className="flex items-center gap-3 p-3 hover:bg-accent/50 cursor-pointer text-sm"
                onClick={() => navigate(`/bookings/${b.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium">
                    Phòng {b.rooms?.room_number || '?'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(b.check_in_date), 'dd/MM/yyyy')} → {format(new Date(b.check_out_date), 'dd/MM/yyyy')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs">{formatCurrency(b.total_amount || 0)}</div>
                  <Badge variant="outline" className="text-xs">{b.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
