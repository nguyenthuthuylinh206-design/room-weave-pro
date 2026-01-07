import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from '@/hooks/useUser'
import { useHotelContext } from '@/contexts/HotelContext'
import { useIsMobile } from '@/hooks/use-mobile'
import { 
  AlertTriangle, 
  Package, 
  DollarSign, 
  TrendingDown,
  Download,
  ArrowLeft,
  Home
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { vi } from 'date-fns/locale'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MobileDamagesReportPage } from '@/components/reports/MobileDamagesReportPage'

interface DamageRecord {
  id: string
  room_number: string
  check_type: string
  items_damaged: Record<string, number>
  items_lost: Record<string, number>
  created_at: string
  estimated_value: number
}

interface DateRange {
  start: Date
  end: Date
}

export function DamagesReportPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { tenantId } = useUser()
  const { selectedHotel, isAllHotelsMode } = useHotelContext()
  const [dateRange, setDateRange] = useState<DateRange>({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['damages-report', tenantId, isAllHotelsMode ? 'all' : selectedHotel?.id, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async (): Promise<{
      records: DamageRecord[]
      summary: { totalDamaged: number; totalLost: number; totalValue: number; totalIncidents: number }
      problematicRooms: { room: string; damaged: number; lost: number; count: number }[]
    }> => {
      // Query room checks with damages  
      const roomChecksResult = await (supabase.from('room_checks') as any)
        .select('id, check_type, items_damaged, items_lost, checked_at, room_id')
        .eq('tenant_id', tenantId)
        .gte('checked_at', dateRange.start.toISOString())
        .lte('checked_at', dateRange.end.toISOString())
        .order('checked_at', { ascending: false })
      
      const roomChecks = roomChecksResult.data as any[] | null
      if (roomChecksResult.error) throw roomChecksResult.error

      // Get rooms for mapping
      const roomIds = [...new Set((roomChecks || []).map(c => c.room_id).filter(Boolean))]
      const { data: rooms } = await supabase
        .from('rooms')
        .select('id, room_number, hotel_id')
        .in('id', roomIds.length > 0 ? roomIds : [''])

      const roomMap = new Map((rooms || []).map(r => [r.id, r]))

      // Filter by hotel if not in all hotels mode
      const filteredChecks = isAllHotelsMode
        ? (roomChecks || [])
        : (roomChecks || []).filter((c) => {
            const room = roomMap.get(c.room_id)
            return room?.hotel_id === selectedHotel?.id
          })

      // Query items for price lookup
      const { data: items } = await supabase
        .from('items')
        .select('id, name, unit_price')
        .eq('tenant_id', tenantId!)

      const itemPriceMap = new Map((items || []).map(i => [i.id, i.unit_price || 50000]))
      const getItemPrice = (itemId: string) => itemPriceMap.get(itemId) || 50000

      // Process data
      const records: DamageRecord[] = []
      let totalDamaged = 0
      let totalLost = 0
      let totalValue = 0
      const roomStats: Record<string, { damaged: number; lost: number; count: number }> = {}

      for (const check of filteredChecks) {
        const damaged = check.items_damaged as Record<string, number> || {}
        const lost = check.items_lost as Record<string, number> || {}
        
        const damagedCount = Object.values(damaged).reduce((sum: number, v) => sum + (v as number), 0)
        const lostCount = Object.values(lost).reduce((sum: number, v) => sum + (v as number), 0)
        
        if (damagedCount > 0 || lostCount > 0) {
          // Calculate value from item prices
          let estimatedValue = 0
          for (const [itemId, qty] of Object.entries(damaged)) {
            estimatedValue += getItemPrice(itemId) * 0.5 * (qty as number) // 50% for damaged
          }
          for (const [itemId, qty] of Object.entries(lost)) {
            estimatedValue += getItemPrice(itemId) * (qty as number) // 100% for lost
          }
          
          const room = roomMap.get(check.room_id)
          const roomNumber = room?.room_number || 'N/A'
          
          records.push({
            id: check.id,
            room_number: roomNumber,
            check_type: check.check_type,
            items_damaged: damaged,
            items_lost: lost,
            created_at: check.checked_at,
            estimated_value: estimatedValue,
          })

          totalDamaged += damagedCount
          totalLost += lostCount
          totalValue += estimatedValue

          // Track room stats
          if (!roomStats[roomNumber]) {
            roomStats[roomNumber] = { damaged: 0, lost: 0, count: 0 }
          }
          roomStats[roomNumber].damaged += damagedCount
          roomStats[roomNumber].lost += lostCount
          roomStats[roomNumber].count += 1
        }
      }

      // Find problematic rooms
      const problematicRooms = Object.entries(roomStats)
        .map(([room, stats]) => ({ room, ...stats }))
        .sort((a, b) => (b.damaged + b.lost) - (a.damaged + a.lost))
        .slice(0, 5)

      return {
        records,
        summary: {
          totalDamaged,
          totalLost,
          totalValue,
          totalIncidents: records.length,
        },
        problematicRooms,
      }
    },
    enabled: !!tenantId && (isAllHotelsMode || !!selectedHotel?.id),
  })

  const handleDateRangeChange = (range: { from?: Date; to?: Date }) => {
    if (range.from && range.to) {
      setDateRange({ start: range.from, end: range.to })
    }
  }

  const checkTypeLabels: Record<string, string> = {
    checkout: 'Checkout',
    checkin: 'Check-in',
    daily: 'Hàng ngày',
    periodic: 'Định kỳ',
  }

  // Mobile version
  if (isMobile) {
    return (
      <MobileDamagesReportPage
        data={data}
        isLoading={isLoading}
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        checkTypeLabels={checkTypeLabels}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Báo cáo Hỏng/Mất" description="Thống kê thiệt hại tài sản" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader 
        title="Báo cáo Hỏng/Mất" 
        description="Thống kê thiệt hại tài sản theo thời gian"
      >
        <div className="flex items-center gap-2">
          <DateRangePicker
            value={{ from: dateRange.start, to: dateRange.end }}
            onChange={handleDateRangeChange}
            className="w-[280px]"
          />
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Xuất
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/reports')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>
        </div>
      </PageHeader>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-xs text-muted-foreground">Tổng sự cố</span>
          </div>
          <p className="text-xl font-semibold">{data?.summary.totalIncidents || 0}</p>
        </div>
        <div className="border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Package className="h-4 w-4 text-orange-600" />
            <span className="text-xs text-muted-foreground">Đồ bị hỏng</span>
          </div>
          <p className="text-xl font-semibold text-orange-600">{data?.summary.totalDamaged || 0} <span className="text-sm font-normal">món</span></p>
        </div>
        <div className="border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="h-4 w-4 text-red-600" />
            <span className="text-xs text-muted-foreground">Đồ bị mất</span>
          </div>
          <p className="text-xl font-semibold text-red-600">{data?.summary.totalLost || 0} <span className="text-sm font-normal">món</span></p>
        </div>
        <div className="border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-red-600" />
            <span className="text-xs text-muted-foreground">Giá trị thiệt hại</span>
          </div>
          <p className="text-xl font-semibold text-red-600">{formatCurrency(data?.summary.totalValue || 0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Problematic Rooms */}
        <div className="border rounded-lg">
          <div className="p-3 border-b">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              <span className="text-sm font-medium">Phòng có vấn đề nhiều nhất</span>
            </div>
          </div>
          <div className="divide-y">
            {data?.problematicRooms && data.problematicRooms.length > 0 ? (
              data.problematicRooms.map((room, index) => (
                <div key={room.room} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium',
                      index === 0 ? 'bg-red-100 text-red-600' :
                      index === 1 ? 'bg-orange-100 text-orange-600' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium">Phòng {room.room}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-orange-600">Hỏng: {room.damaged}</span>
                    <span className="text-red-600">Mất: {room.lost}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                Không có dữ liệu
              </p>
            )}
          </div>
        </div>

        {/* Recent Incidents Table */}
        <div className="border rounded-lg lg:col-span-2">
          <div className="p-3 border-b">
            <span className="text-sm font-medium">Sự cố gần đây</span>
          </div>
          {data?.records && data.records.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Phòng</TableHead>
                  <TableHead className="text-xs">Loại</TableHead>
                  <TableHead className="text-xs text-center">Hỏng</TableHead>
                  <TableHead className="text-xs text-center">Mất</TableHead>
                  <TableHead className="text-xs text-right">Giá trị</TableHead>
                  <TableHead className="text-xs text-right">Ngày</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.records.slice(0, 10).map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="text-sm font-medium">
                      {record.room_number}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {checkTypeLabels[record.check_type] || record.check_type}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-orange-600 text-sm">
                        {Object.values(record.items_damaged).reduce((s: number, v) => s + (v as number), 0)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-red-600 text-sm">
                        {Object.values(record.items_lost).reduce((s: number, v) => s + (v as number), 0)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-red-600 text-sm">
                      {formatCurrency(record.estimated_value)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {format(new Date(record.created_at), 'dd/MM/yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Không có sự cố nào trong khoảng thời gian này
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
