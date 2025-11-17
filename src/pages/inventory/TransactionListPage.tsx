import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, Search, Eye, Package, TrendingUp, TrendingDown } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { TransactionTypeBadge } from '@/components/inventory/TransactionTypeBadge'
import { TransactionDetailDialog } from '@/components/inventory/TransactionDetailDialog'
import { useInventoryTransactions } from '@/hooks/useInventoryTransactions'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useIsMobile } from '@/hooks/use-mobile'
import { useQueryClient } from '@tanstack/react-query'
import type { TransactionType } from '@/types/inventory.types'
import { PullToRefresh } from '@/components/mobile/PullToRefresh'
import { StatScrollContainer, MobileStatCard } from '@/components/mobile/MobileDashboardStats'
import { MobileFilterSheet } from '@/components/inventory/MobileFilterSheet'
import { SwipeableCard } from '@/components/mobile/SwipeableCard'
import { MobileTransactionCard } from '@/components/inventory/MobileTransactionCard'
import { TransactionListSkeleton } from '@/components/inventory/TransactionCardSkeleton'
import { EmptyTransactions } from '@/components/inventory/EmptyTransactions'
import { useInView } from 'react-intersection-observer'

export function TransactionListPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    search: '',
    transactionType: '',
    categoryId: '',
    createdBy: '',
    dateFrom: null as Date | null,
    dateTo: null as Date | null,
  })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  
  const { data, isLoading, isFetching } = useInventoryTransactions(filters, page, pageSize)
  
  const transactions = data?.transactions || []
  const totalPages = data?.totalPages || 0
  const hasNextPage = page < totalPages
  
  // Infinite scroll
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  })

  useEffect(() => {
    if (inView && hasNextPage && !isFetching && isMobile) {
      setPage(prev => prev + 1)
    }
  }, [inView, hasNextPage, isFetching, isMobile])
  
  const summary = transactions.reduce(
    (acc, t) => {
      if (t.transaction_type === 'in') {
        acc.totalIn += t.quantity
        acc.valueIn += t.total_value
      } else if (t.transaction_type === 'out') {
        acc.totalOut += Math.abs(t.quantity)
        acc.valueOut += t.total_value
      }
      return acc
    },
    { totalIn: 0, totalOut: 0, valueIn: 0, valueOut: 0 }
  )

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] })
  }

  const handleFilterByCategory = (category: string) => {
    setFilters({ ...filters, categoryId: category })
  }

  // Mobile View
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <PullToRefresh onRefresh={handleRefresh}>
          <div className="space-y-4">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
              <div className="flex items-center gap-2 mb-3">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate('/inventory')}
                  className="h-10 w-10"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-lg font-semibold">Lịch sử giao dịch</h1>
                  <p className="text-xs text-muted-foreground">
                    {data?.total || 0} giao dịch
                  </p>
                </div>
              </div>
            </div>

            {/* Stats Scroll */}
            <StatScrollContainer>
              <MobileStatCard
                icon={Package}
                title="Tổng giao dịch"
                value={data?.total || 0}
              />
              <MobileStatCard
                icon={TrendingDown}
                title="Tổng nhập"
                value={formatCurrency(summary.valueIn)}
                variant="success"
              />
              <MobileStatCard
                icon={TrendingUp}
                title="Tổng xuất"
                value={formatCurrency(summary.valueOut)}
                variant="default"
              />
            </StatScrollContainer>

            {/* Mobile Filter */}
            <div className="px-4">
              <MobileFilterSheet filters={filters} onFiltersChange={setFilters} />
            </div>

            {/* Transaction Cards */}
            <div className="px-4 space-y-2">
              {isLoading ? (
                <TransactionListSkeleton count={5} />
              ) : transactions.length === 0 ? (
                <EmptyTransactions />
              ) : (
                <>
                  {transactions.map((transaction) => (
                    <SwipeableCard
                      key={transaction.id}
                      onSwipeLeft={() => setSelectedTransaction(transaction.id)}
                      onSwipeRight={() => transaction.transaction_category && handleFilterByCategory(transaction.transaction_category)}
                    >
                      <MobileTransactionCard
                        transaction={{
                          id: transaction.id,
                          transaction_code: transaction.transaction_code,
                          transaction_type: transaction.transaction_type as 'in' | 'out' | 'adjustment',
                          transaction_category: transaction.transaction_category,
                          item_name: transaction.item_name,
                          item_code: transaction.item_code,
                          quantity: transaction.quantity,
                          unit_price: transaction.unit_price,
                          total_value: transaction.total_value,
                          transaction_date: transaction.transaction_date,
                          created_by_name: transaction.created_by_name,
                          from_location: transaction.from_location,
                          to_location: transaction.to_location,
                        }}
                        onClick={() => setSelectedTransaction(transaction.id)}
                      />
                    </SwipeableCard>
                  ))}
                  
                  {/* Infinite scroll trigger */}
                  {hasNextPage && (
                    <div ref={loadMoreRef} className="py-4">
                      {isFetching && <TransactionListSkeleton count={2} />}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </PullToRefresh>

        {/* Transaction Detail Dialog */}
        {selectedTransaction && (
          <TransactionDetailDialog
            transactionId={selectedTransaction}
            open={!!selectedTransaction}
            onOpenChange={(open) => !open && setSelectedTransaction(null)}
          />
        )}
      </div>
    )
  }

  // Desktop View
  return (
    <div className="space-y-6">
      <PageHeader
        title="Lịch sử giao dịch kho"
        description="Theo dõi tất cả giao dịch nhập xuất kho"
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/inventory')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Xuất Excel
          </Button>
        </div>
      </PageHeader>
      
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Tổng giao dịch</p>
              <p className="text-3xl font-bold">{data?.total || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Tổng nhập</p>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(summary.valueIn)}
              </p>
              <p className="text-xs text-muted-foreground">+{summary.totalIn} items</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Tổng xuất</p>
              <p className="text-3xl font-bold text-blue-600">
                {formatCurrency(summary.valueOut)}
              </p>
              <p className="text-xs text-muted-foreground">-{summary.totalOut} items</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-5">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm mã giao dịch, đồ dùng..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>
            
            <DateRangePicker
              value={{
                from: filters.dateFrom,
                to: filters.dateTo,
              }}
              onChange={(range) => 
                setFilters({
                  ...filters,
                  dateFrom: range.from || null,
                  dateTo: range.to || null,
                })
              }
            />
            
            <Select
              value={filters.transactionType || "all"}
              onValueChange={(value) => 
                setFilters({ ...filters, transactionType: value === "all" ? "" : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Loại giao dịch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="in">Nhập kho</SelectItem>
                <SelectItem value="out">Xuất kho</SelectItem>
                <SelectItem value="adjustment">Điều chỉnh</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={filters.categoryId || "all"}
              onValueChange={(value) => 
                setFilters({ ...filters, categoryId: value === "all" ? "" : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Danh mục" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="purchase">Mua hàng</SelectItem>
                <SelectItem value="sale">Bán hàng</SelectItem>
                <SelectItem value="transfer_in">Chuyển kho nhập</SelectItem>
                <SelectItem value="transfer_out">Chuyển kho xuất</SelectItem>
                <SelectItem value="internal_use">Sử dụng nội bộ</SelectItem>
                <SelectItem value="loss">Hao hụt</SelectItem>
                <SelectItem value="damaged">Hư hỏng</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p>Đang tải...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Không có giao dịch nào</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã GD</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Đồ dùng</TableHead>
                  <TableHead>Số lượng</TableHead>
                  <TableHead>Giá trị</TableHead>
                  <TableHead>Địa điểm</TableHead>
                  <TableHead>Người tạo</TableHead>
                  <TableHead>Ngày</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-mono text-xs">
                      {transaction.transaction_code}
                    </TableCell>
                    <TableCell>
                      <TransactionTypeBadge type={transaction.transaction_type === 'adjustment' ? 'adjust' : transaction.transaction_type as TransactionType} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {transaction.item_images?.[0] && (
                          <img 
                            src={transaction.item_images[0]} 
                            alt={transaction.item_name}
                            className="h-8 w-8 rounded object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium">{transaction.item_name}</p>
                          <p className="text-xs text-muted-foreground">{transaction.item_code}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={transaction.transaction_type === 'in' ? 'text-green-600 font-medium' : 'text-blue-600 font-medium'}>
                        {transaction.transaction_type === 'in' ? '+' : '-'}{Math.abs(transaction.quantity)}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(transaction.total_value)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {transaction.from_location && <div>Từ: {transaction.from_location}</div>}
                      {transaction.to_location && <div>Đến: {transaction.to_location}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={transaction.created_by_avatar} />
                          <AvatarFallback className="text-xs">
                            {transaction.created_by_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{transaction.created_by_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(transaction.transaction_date), 'dd/MM/yyyy HH:mm', { locale: vi })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTransaction(transaction.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Pagination */}
      {transactions.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Hiển thị {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, data?.total || 0)} của {data?.total || 0}
            </p>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(parseInt(value))
                setPage(1)
              }}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
            >
              Sau
            </Button>
          </div>
        </div>
      )}

      {/* Transaction Detail Dialog */}
      {selectedTransaction && (
        <TransactionDetailDialog
          transactionId={selectedTransaction}
          open={!!selectedTransaction}
          onOpenChange={(open) => !open && setSelectedTransaction(null)}
        />
      )}
    </div>
  )
}
