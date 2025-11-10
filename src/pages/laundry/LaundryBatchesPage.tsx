import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Download, Eye, Filter } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Input } from '@/components/ui/input'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { BatchStatusBadge } from '@/components/laundry/BatchStatusBadge'
import { VendorSelect } from '@/components/laundry/VendorSelect'
import { useLaundryBatches } from '@/hooks/useLaundryBatches'
import { formatCurrency, formatDate } from '@/lib/utils'
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard'
import { Package, Clock, CheckCircle } from 'lucide-react'

export function LaundryBatchesPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<{
    vendorId?: string
    status?: 'delivered' | 'washing' | 'ready' | 'received' | 'cancelled' | ''
    search?: string
  }>({
    vendorId: '',
    status: '',
    search: '',
  })
  const [showFilters, setShowFilters] = useState(false)
  
  const { data, isLoading } = useLaundryBatches(
    {
      vendorId: filters.vendorId || undefined,
      status: filters.status as any,
      search: filters.search || undefined,
    },
    page,
    20
  )
  
  const batches = data?.batches || []
  const totalPages = data?.totalPages || 1
  
  // Quick stats
  const totalBatches = data?.total || 0
  const inProgress = batches.filter((b) => 
    b.status === 'delivered' || b.status === 'washing'
  ).length
  const completedThisMonth = batches.filter((b) => 
    b.status === 'received' && 
    new Date(b.actual_return_date!).getMonth() === new Date().getMonth()
  ).length
  
  const handleExport = () => {
    console.log('Export to Excel')
    // TODO: Implement Excel export
  }
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý lô giặt"
        description="Quản lý tất cả các lô giặt"
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Xuất Excel
          </Button>
          <Button onClick={() => navigate('/laundry/batches/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Tạo lô giặt mới
          </Button>
        </div>
      </PageHeader>
      
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <DashboardStatCard
          title="Tổng lô giặt"
          value={totalBatches}
          icon={Package}
          description="Tổng số lô giặt"
        />
        <DashboardStatCard
          title="Đang xử lý"
          value={inProgress}
          icon={Clock}
          description="Lô đang giặt"
        />
        <DashboardStatCard
          title="Hoàn thành tháng này"
          value={completedThisMonth}
          icon={CheckCircle}
          description="Đã nhận về"
        />
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Danh sách lô giặt</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="mr-2 h-4 w-4" />
              {showFilters ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
            </Button>
          </div>
          
          {showFilters && (
            <div className="grid gap-4 md:grid-cols-3 mt-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Tìm kiếm</label>
                <Input
                  placeholder="Mã lô giặt..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Đơn vị giặt</label>
                <VendorSelect
                  value={filters.vendorId}
                  onChange={(value) => setFilters({ ...filters, vendorId: value })}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Trạng thái</label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters({ ...filters, status: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tất cả" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tất cả</SelectItem>
                    <SelectItem value="delivered">Đã giao</SelectItem>
                    <SelectItem value="washing">Đang giặt</SelectItem>
                    <SelectItem value="ready">Sẵn sàng</SelectItem>
                    <SelectItem value="received">Đã nhận</SelectItem>
                    <SelectItem value="cancelled">Đã hủy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Đang tải...</div>
          ) : batches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Không tìm thấy lô giặt nào
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã lô</TableHead>
                      <TableHead>Đơn vị giặt</TableHead>
                      <TableHead>Ngày giao</TableHead>
                      <TableHead>Ngày nhận dự kiến</TableHead>
                      <TableHead className="text-center">Số items</TableHead>
                      <TableHead className="text-right">Chi phí</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((batch) => (
                      <TableRow
                        key={batch.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/laundry/batches/${batch.id}`)}
                      >
                        <TableCell className="font-medium">{batch.batch_code}</TableCell>
                        <TableCell>{(batch as any).vendor_name || 'N/A'}</TableCell>
                        <TableCell>{formatDate(batch.delivery_date)}</TableCell>
                        <TableCell>{formatDate(batch.expected_return_date)}</TableCell>
                        <TableCell className="text-center">{batch.total_items}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(batch.actual_cost || batch.estimated_cost)}
                        </TableCell>
                        <TableCell>
                          <BatchStatusBadge status={batch.status as any} />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/laundry/batches/${batch.id}`)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setPage(Math.max(1, page - 1))}
                          className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <PaginationItem key={p}>
                          <PaginationLink
                            onClick={() => setPage(p)}
                            isActive={p === page}
                            className="cursor-pointer"
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setPage(Math.min(totalPages, page + 1))}
                          className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
