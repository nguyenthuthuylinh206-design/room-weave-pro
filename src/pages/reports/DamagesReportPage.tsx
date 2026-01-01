import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from '@/hooks/useUser'
import { 
  AlertTriangle, 
  Package, 
  DollarSign, 
  TrendingUp,
  Download,
  Calendar,
  Home
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

interface DamageRecord {
  id: string
  room_number: string
  check_type: string
  items_damaged: Record<string, number>
  items_lost: Record<string, number>
  created_at: string
  estimated_value: number
}

export function DamagesReportPage() {
  const { hotelId, tenantId } = useUser()
  const [period, setPeriod] = useState('month')

  const { data, isLoading } = useQuery({
    queryKey: ['damages-report', hotelId, tenantId, period],
    queryFn: async () => {
      const today = new Date()
      let startDate: Date
      let endDate = today

      switch (period) {
        case 'week':
          startDate = new Date(today.setDate(today.getDate() - 7))
          break
        case 'quarter':
          startDate = subMonths(new Date(), 3)
          break
        case 'year':
          startDate = subMonths(new Date(), 12)
          break
        default:
          startDate = startOfMonth(new Date())
          endDate = endOfMonth(new Date())
      }

      // Query room checks with damages
      const { data: roomChecks, error } = await supabase
        .from('room_checks')
        .select(`
          id,
          check_type,
          items_damaged,
          items_lost,
          checked_at,
          room:rooms(room_number, hotel_id)
        `)
        .gte('checked_at', startDate.toISOString())
        .lte('checked_at', endDate.toISOString())
        .order('checked_at', { ascending: false })

      if (error) throw error

      // Filter by hotel if needed
      const filteredChecks = hotelId 
        ? (roomChecks || []).filter((c: any) => c.room?.hotel_id === hotelId)
        : (roomChecks || [])

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
          // Estimate value (simplified - in real app, join with items table)
          const estimatedValue = (damagedCount * 50000) + (lostCount * 100000)
          
          const roomNumber = (check.room as any)?.room_number || 'N/A'
          
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
    enabled: !!tenantId,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Báo cáo Hỏng/Mất" description="Thống kê thiệt hại tài sản" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    )
  }

  const summaryCards = [
    {
      title: 'Tổng số sự cố',
      value: data?.summary.totalIncidents || 0,
      icon: AlertTriangle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      isCurrency: false,
    },
    {
      title: 'Đồ bị hỏng',
      value: data?.summary.totalDamaged || 0,
      icon: Package,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950/30',
      isCurrency: false,
      suffix: 'món',
    },
    {
      title: 'Đồ bị mất',
      value: data?.summary.totalLost || 0,
      icon: TrendingUp,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950/30',
      isCurrency: false,
      suffix: 'món',
    },
    {
      title: 'Giá trị thiệt hại',
      value: data?.summary.totalValue || 0,
      icon: DollarSign,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950/30',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Báo cáo Hỏng/Mất" 
        description="Thống kê thiệt hại tài sản theo thời gian"
      >
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Tuần này</SelectItem>
              <SelectItem value="month">Tháng này</SelectItem>
              <SelectItem value="quarter">Quý này</SelectItem>
              <SelectItem value="year">Năm nay</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Xuất báo cáo
          </Button>
        </div>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className={cn(card.bgColor)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <card.icon className={cn('h-5 w-5', card.color)} />
              </div>
              <p className="text-sm text-muted-foreground mb-1">{card.title}</p>
              <p className={cn('text-2xl font-bold', card.color)}>
                {card.isCurrency === false 
                  ? `${card.value}${card.suffix ? ` ${card.suffix}` : ''}`
                  : formatCurrency(card.value)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Problematic Rooms */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Home className="h-4 w-4" />
              Phòng có vấn đề nhiều nhất
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.problematicRooms && data.problematicRooms.length > 0 ? (
              <div className="space-y-3">
                {data.problematicRooms.map((room, index) => (
                  <div 
                    key={room.room}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                        index === 0 ? 'bg-red-100 text-red-600' :
                        index === 1 ? 'bg-orange-100 text-orange-600' :
                        'bg-amber-100 text-amber-600'
                      )}>
                        {index + 1}
                      </span>
                      <span className="font-medium">Phòng {room.room}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="text-orange-600">
                        Hỏng: {room.damaged}
                      </Badge>
                      <Badge variant="outline" className="text-red-600">
                        Mất: {room.lost}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Chưa có dữ liệu
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Incidents Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-medium">Sự cố gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.records && data.records.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Phòng</TableHead>
                      <TableHead>Loại kiểm tra</TableHead>
                      <TableHead>Hỏng</TableHead>
                      <TableHead>Mất</TableHead>
                      <TableHead>Giá trị</TableHead>
                      <TableHead>Ngày</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.records.slice(0, 10).map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {record.room_number}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {record.check_type === 'checkout' ? 'Checkout' : 
                             record.check_type === 'checkin' ? 'Check-in' : record.check_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-orange-600">
                            {Object.values(record.items_damaged).reduce((s: number, v) => s + (v as number), 0)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-red-600">
                            {Object.values(record.items_lost).reduce((s: number, v) => s + (v as number), 0)}
                          </span>
                        </TableCell>
                        <TableCell className="text-red-600">
                          {formatCurrency(record.estimated_value)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(record.created_at), 'dd/MM/yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Không có sự cố nào trong khoảng thời gian này
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
