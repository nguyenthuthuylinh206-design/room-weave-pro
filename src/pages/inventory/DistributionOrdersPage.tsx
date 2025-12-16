import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { vi, enUS } from 'date-fns/locale'
import { Plus, Search, Eye, Truck, CheckCircle, Clock, XCircle, Package, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { useDistributionOrders } from '@/hooks/useDistributionOrders'
import { useIsMobile } from '@/hooks/use-mobile'
import { useQueryClient } from '@tanstack/react-query'
import type { DistributionOrderStatus } from '@/types/distribution.types'

const PAGE_SIZE = 25

export default function DistributionOrdersPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()
  const { t, i18n } = useTranslation('distribution')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const dateLocale = i18n.language === 'vi' ? vi : enUS

  const STATUS_CONFIG: Record<DistributionOrderStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
    pending: { label: t('status.pending'), variant: 'outline', icon: Clock },
    in_progress: { label: t('status.in_progress'), variant: 'default', icon: Truck },
    completed: { label: t('status.completed'), variant: 'secondary', icon: CheckCircle },
    cancelled: { label: t('status.cancelled'), variant: 'destructive', icon: XCircle },
  }

  const { data, isLoading } = useDistributionOrders(
    { status: statusFilter === 'all' ? undefined : statusFilter as DistributionOrderStatus },
    page,
    PAGE_SIZE
  )

  const orders = data?.data || []
  const totalCount = data?.totalCount || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // Filter by search query (client-side)
  const filteredOrders = searchQuery 
    ? orders.filter(o => o.order_code.toLowerCase().includes(searchQuery.toLowerCase()))
    : orders

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['distribution-orders'] })
    setIsRefreshing(false)
  }

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    setPage(1) // Reset to first page when filter changes
  }

  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        {/* Mobile Header */}
        <div className="sticky top-0 z-10 bg-background border-b p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">{t('title')}</h1>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button size="sm" onClick={() => navigate('/inventory/distributions/new')}>
                <Plus className="h-4 w-4 mr-1" />
                {t('createNew')}
              </Button>
            </div>
          </div>
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('status.all')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('status.all')}</SelectItem>
              <SelectItem value="pending">{t('status.pending')}</SelectItem>
              <SelectItem value="in_progress">{t('status.in_progress')}</SelectItem>
              <SelectItem value="completed">{t('status.completed')}</SelectItem>
              <SelectItem value="cancelled">{t('status.cancelled')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Mobile List */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">{t('loading')}</div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">{t('noOrders')}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => navigate('/inventory/distributions/new')}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('createNewOrder')}
              </Button>
            </div>
          ) : (
            <>
              {filteredOrders.map(order => {
                const config = STATUS_CONFIG[order.status]
                const progress = order.total_rooms > 0 
                  ? Math.round((order.rooms_completed / order.total_rooms) * 100)
                  : 0

                return (
                  <Card 
                    key={order.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/inventory/distributions/${order.id}`)}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-medium">{order.order_code}</span>
                        <Badge variant={config.variant}>
                          <config.icon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">{t('card.rooms')}:</span>{' '}
                          <span className="font-medium">{order.rooms_completed}/{order.total_rooms}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t('card.items')}:</span>{' '}
                          <span className="font-medium">{order.total_items}</span>
                        </div>
                      </div>

                      {order.status === 'in_progress' && (
                        <Progress value={progress} className="h-2" />
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{t('card.assignee')}: {order.assigned_to_name || t('card.notAssigned')}</span>
                        <span>{format(new Date(order.created_at), 'dd/MM HH:mm', { locale: dateLocale })}</span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {/* Mobile Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button onClick={() => navigate('/inventory/distributions/new')}>
          <Plus className="h-4 w-4 mr-2" />
          {t('createOrder')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder={t('searchCode')}
                className="pl-9" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('table.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('status.allShort')}</SelectItem>
                <SelectItem value="pending">{t('status.pending')}</SelectItem>
                <SelectItem value="in_progress">{t('status.in_progress')}</SelectItem>
                <SelectItem value="completed">{t('status.completed')}</SelectItem>
                <SelectItem value="cancelled">{t('status.cancelled')}</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('table.code')}</TableHead>
              <TableHead>{t('table.status')}</TableHead>
              <TableHead className="text-center">{t('table.progress')}</TableHead>
              <TableHead className="text-center">{t('table.items')}</TableHead>
              <TableHead>{t('table.assignee')}</TableHead>
              <TableHead>{t('table.creator')}</TableHead>
              <TableHead>{t('table.createdAt')}</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  {t('loading')}
                </TableCell>
              </TableRow>
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center">
                    <Package className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">{t('noOrders')}</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => navigate('/inventory/distributions/new')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('createNewOrder')}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map(order => {
                const config = STATUS_CONFIG[order.status]
                const progress = order.total_rooms > 0 
                  ? Math.round((order.rooms_completed / order.total_rooms) * 100)
                  : 0

                return (
                  <TableRow 
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/inventory/distributions/${order.id}`)}
                  >
                    <TableCell className="font-mono font-medium">
                      {order.order_code}
                    </TableCell>
                    <TableCell>
                      <Badge variant={config.variant}>
                        <config.icon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={progress} className="w-20 h-2" />
                        <span className="text-sm text-muted-foreground">
                          {order.rooms_completed}/{order.total_rooms}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{order.total_items}</TableCell>
                    <TableCell>{order.assigned_to_name || '-'}</TableCell>
                    <TableCell>{order.created_by_name}</TableCell>
                    <TableCell>
                      {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: dateLocale })}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>

        {/* Desktop Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-sm text-muted-foreground">
              {t('showing')} {filteredOrders.length} {t('of')} {totalCount} {t('orders')}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {t('previous')}
              </Button>
              <span className="text-sm px-2">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                {t('next')}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}