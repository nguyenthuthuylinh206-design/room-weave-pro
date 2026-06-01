import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Plus, Download } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/hooks/use-mobile'
import { useHasModulePermission } from '@/hooks/usePermissions'
import { useUser } from '@/hooks/useUser'
import { isAdminUser } from '@/lib/userAccess'
import {
  useGuestsV2, useGuestStats, exportGuestsToCSV,
  type GuestSegment, type GuestSortKey,
} from '@/hooks/useGuestsV2'
import { GuestKpiBar } from '@/components/guests/GuestKpiBar'
import { GuestSegmentTabs } from '@/components/guests/GuestSegmentTabs'
import { GuestDataTable } from '@/components/guests/GuestDataTable'
import { GuestCardList } from '@/components/guests/GuestCardList'
import { GuestFormDialog } from '@/components/guests/GuestFormDialog'
import { MergeGuestsDialog } from '@/components/guests/MergeGuestsDialog'
import type { Guest } from '@/hooks/useGuests'

const SEGMENTS: GuestSegment[] = ['all', 'vip', 'new', 'returning', 'birthday', 'blacklist']

export default function GuestsPage() {
  const isMobile = useIsMobile()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useUser()
  const isAdmin = isAdminUser(user)
  const { data: canManagePerm } = useHasModulePermission('bookings', 'manage')
  const canManage = isAdmin || !!canManagePerm

  const segment = (searchParams.get('seg') as GuestSegment) || 'all'
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [sortBy, setSortBy] = useState<GuestSortKey>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const pageSize = 50

  const [formOpen, setFormOpen] = useState(false)
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null)
  const [mergeTarget, setMergeTarget] = useState<Guest | null>(null)

  // Debounce search
  const [searchDebounced, setSearchDebounced] = useState(search)
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setPage(1) }, [segment, searchDebounced, sortBy, sortDir])

  const setSegment = (s: GuestSegment) => {
    const p = new URLSearchParams(searchParams)
    if (s === 'all') p.delete('seg'); else p.set('seg', s)
    setSearchParams(p, { replace: true })
  }

  const { data: stats, isLoading: statsLoading } = useGuestStats()
  const { data: listResult, isLoading: listLoading } = useGuestsV2({
    segment, search: searchDebounced, sortBy, sortDir, page, pageSize,
  })
  const guests = listResult?.rows || []
  const total = listResult?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const segmentCounts = useMemo(() => ({
    all: stats?.total,
    vip: stats?.vip,
    new: stats?.newCount,
    returning: stats?.returning,
    birthday: stats?.birthday,
    blacklist: stats?.blacklist,
  }), [stats])

  const onSort = (k: GuestSortKey) => {
    if (sortBy === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(k); setSortDir('desc') }
  }

  const handleExport = () => {
    exportGuestsToCSV(guests, `khach-hang-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const openEdit = (g: Guest) => { setEditingGuest(g); setFormOpen(true) }
  const openAdd = () => { setEditingGuest(null); setFormOpen(true) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Khách hàng</h1>
          <p className="text-xs text-muted-foreground">Quản lý hồ sơ khách hàng và lịch sử lưu trú</p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={handleExport} disabled={guests.length === 0}>
              <Download className="h-3.5 w-3.5 mr-1" /> CSV
            </Button>
          )}
          {canManage && (
            <Button type="button" size="sm" className="h-8" onClick={openAdd}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Thêm khách
            </Button>
          )}
        </div>
      </div>

      <GuestKpiBar stats={stats} isLoading={statsLoading} active={segment} onSelect={setSegment} />

      <GuestSegmentTabs value={segment} onChange={setSegment} counts={segmentCounts} />

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, SĐT, email, CCCD..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8"
          />
        </div>
      </div>

      {isMobile ? (
        <GuestCardList
          guests={guests}
          isLoading={listLoading}
          canManage={canManage}
          onMerge={canManage ? setMergeTarget : undefined}
          onEdit={canManage ? openEdit : undefined}
        />
      ) : (
        <GuestDataTable
          guests={guests}
          isLoading={listLoading}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={onSort}
          canManage={canManage}
          onMerge={canManage ? setMergeTarget : undefined}
          onEdit={canManage ? openEdit : undefined}
        />
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div>
            Hiển thị {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} / {total} khách
          </div>
          <div className="flex items-center gap-1">
            <Button type="button" variant="outline" size="sm" className="h-7" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Trước</Button>
            <span className="px-2 tabular-nums">{page}/{totalPages}</span>
            <Button type="button" variant="outline" size="sm" className="h-7" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Sau</Button>
          </div>
        </div>
      )}

      <GuestFormDialog open={formOpen} onOpenChange={setFormOpen} guest={editingGuest} />
      <MergeGuestsDialog open={!!mergeTarget} onOpenChange={(v) => !v && setMergeTarget(null)} target={mergeTarget} />
    </div>
  )
}
