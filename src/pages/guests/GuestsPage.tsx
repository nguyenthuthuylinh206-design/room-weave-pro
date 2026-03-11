import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users, Star, Plus, Eye } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useGuests } from '@/hooks/useGuests'
import { formatCurrency } from '@/lib/utils'

const VIP_LEVELS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'normal', label: 'Thường' },
  { value: 'silver', label: 'Bạc' },
  { value: 'gold', label: 'Vàng' },
  { value: 'vip', label: 'VIP' },
  { value: 'blacklist', label: 'Blacklist' },
]

const VIP_COLORS: Record<string, string> = {
  normal: 'text-muted-foreground',
  silver: 'text-slate-500',
  gold: 'text-amber-600',
  vip: 'text-purple-600',
  blacklist: 'text-red-600',
}

export default function GuestsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [vipLevel, setVipLevel] = useState('all')

  const { data: guests = [], isLoading } = useGuests({ search, vipLevel })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Khách hàng</h1>
          <Badge variant="secondary" className="text-xs">{guests.length}</Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, SĐT, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8"
          />
        </div>
        <Select value={vipLevel} onValueChange={setVipLevel}>
          <SelectTrigger className="w-[130px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VIP_LEVELS.map((level) => (
              <SelectItem key={level.value} value={level.value}>
                {level.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Guest List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : guests.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <Users className="h-10 w-10" />
          <p className="text-sm">Chưa có khách hàng nào</p>
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {guests.map((guest) => (
            <div
              key={guest.id}
              className="flex items-center gap-3 p-3 hover:bg-accent/50 cursor-pointer transition-colors"
              onClick={() => navigate(`/guests/${guest.id}`)}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium flex-shrink-0">
                {guest.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{guest.full_name}</span>
                  {guest.vip_level !== 'normal' && (
                    <span className={`text-xs font-medium ${VIP_COLORS[guest.vip_level] || ''}`}>
                      {VIP_LEVELS.find(l => l.value === guest.vip_level)?.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {guest.phone && <span>{guest.phone}</span>}
                  {guest.email && <span>{guest.email}</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs text-muted-foreground">{guest.total_stays} lượt ở</div>
                {guest.total_spent > 0 && (
                  <div className="text-xs font-mono">{formatCurrency(guest.total_spent)}</div>
                )}
              </div>
              <Eye className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
