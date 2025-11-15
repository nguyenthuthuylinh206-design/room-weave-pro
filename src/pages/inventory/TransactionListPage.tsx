import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, Search, Eye } from 'lucide-react'
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

export function TransactionListPage() {
  const navigate = useNavigate()
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
  
  const { data, isLoading } = useInventoryTransactions(filters, page, pageSize)
  
  const transactions = data?.transactions || []
  const totalPages = data?.totalPages || 0
  
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
                <SelectItem value="transfer">Chuyển kho</SelectItem>
                <SelectItem value="adjust">Điều chỉnh</SelectItem>
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
                <SelectItem value="all">Tất cả danh mục</SelectItem>
                <SelectItem value="purchase">Mua hàng</SelectItem>
                <SelectItem value="return">Trả hàng</SelectItem>
                <SelectItem value="laundry_return">Nhận từ giặt là</SelectItem>
                <SelectItem value="room_assign">Giao phòng</SelectItem>
                <SelectItem value="laundry">Gửi giặt</SelectItem>
                <SelectItem value="maintenance">Bảo trì</SelectItem>
                <SelectItem value="disposal">Thanh lý</SelectItem>
                <SelectItem value="other">Khác</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              onClick={() => setFilters({
                search: '',
                transactionType: '',
                categoryId: '',
                createdBy: '',
                dateFrom: null,
                dateTo: null,
              })}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã giao dịch</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Đồ dùng</TableHead>
                  <TableHead className="text-center">Số lượng</TableHead>
                  <TableHead className="text-right">Giá trị</TableHead>
                  <TableHead>Vị trí</TableHead>
                  <TableHead>Người thực hiện</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Đang tải...
                    </TableCell>
                  </TableRow>
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Không có giao dịch nào
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((transaction) => (
                    <TableRow
                      key={transaction.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedTransaction(transaction.id)}
                    >
                      <TableCell className="font-medium">
                        {transaction.transaction_code}
                      </TableCell>
                      <TableCell>
                        <TransactionTypeBadge type={transaction.transaction_type as any} />
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
                            <p className="text-xs text-muted-foreground">
                              {transaction.item_code}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={
                          transaction.quantity > 0 
                            ? 'font-bold text-green-600' 
                            : 'font-bold text-red-600'
                        }>
                          {transaction.quantity > 0 ? '+' : ''}{transaction.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(transaction.total_value)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="text-muted-foreground">
                            {transaction.from_location}
                          </p>
                          {transaction.to_location && (
                            <p>→ {transaction.to_location}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={transaction.created_by_avatar} />
                            <AvatarFallback>
                              {transaction.created_by_name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{transaction.created_by_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{format(new Date(transaction.created_at), 'dd/MM/yyyy', { locale: vi })}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(transaction.created_at), 'HH:mm')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedTransaction(transaction.id)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Hiển thị
                </span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    setPageSize(parseInt(value))
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                  trên trang
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Trước
                </Button>
                <span className="text-sm">
                  Trang {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <TransactionDetailDialog
        transactionId={selectedTransaction}
        open={!!selectedTransaction}
        onOpenChange={(open) => !open && setSelectedTransaction(null)}
      />
    </div>
  )
}
