import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { StaffCard } from './StaffCard'
import { Skeleton } from '@/components/ui/skeleton'
import type { StaffWithStatus, StaffStatusType } from '@/hooks/useStaffStatus'

interface StaffListProps {
  staff: StaffWithStatus[] | undefined
  isLoading: boolean
  filterStatus: StaffStatusType | null
  onViewDetail?: (staff: StaffWithStatus) => void
}

export function StaffList({ staff, isLoading, filterStatus, onViewDetail }: StaffListProps) {
  const [search, setSearch] = useState('')

  const filteredStaff = useMemo(() => {
    if (!staff) return []

    let result = staff

    // Filter by status
    if (filterStatus) {
      result = result.filter(s => s.status === filterStatus)
    }

    // Filter by search
    if (search.trim()) {
      const searchLower = search.toLowerCase()
      result = result.filter(s =>
        s.full_name.toLowerCase().includes(searchLower) ||
        s.email.toLowerCase().includes(searchLower) ||
        s.position_name?.toLowerCase().includes(searchLower) ||
        s.phone?.includes(search)
      )
    }

    // Sort: busy first, then available, then break, then offline
    const statusOrder: Record<StaffStatusType, number> = {
      busy: 0,
      available: 1,
      break: 2,
      offline: 3,
    }
    result.sort((a, b) => statusOrder[a.status] - statusOrder[b.status])

    return result
  }, [staff, filterStatus, search])

  if (isLoading) {
    return (
      <div className="space-y-1 p-1">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, email, SĐT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {filteredStaff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p className="text-sm">Không tìm thấy nhân viên</p>
          </div>
        ) : (
          <div>
            {filteredStaff.map(s => (
              <StaffCard key={s.id} staff={s} onViewDetail={onViewDetail} />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Count */}
      <div className="p-2 border-t text-xs text-muted-foreground text-center">
        {filteredStaff.length} nhân viên
      </div>
    </div>
  )
}
