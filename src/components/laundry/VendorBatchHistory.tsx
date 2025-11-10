import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BatchStatusBadge } from './BatchStatusBadge'
import { useLaundryBatches } from '@/hooks/useLaundryBatches'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

interface VendorBatchHistoryProps {
  vendorId: string
}

export function VendorBatchHistory({ vendorId }: VendorBatchHistoryProps) {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({
    status: '',
  })
  const [page, setPage] = useState(1)
  
  const { data, isLoading } = useLaundryBatches(
    { ...filters, vendorId } as any,
    page,
    25
  )
  
  const batches = data?.batches || []
  
  const handleExport = () => {
    console.log('Export to Excel')
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Lịch sử đơn hàng</CardTitle>
          <div className="flex gap-2">
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tất cả</SelectItem>
                <SelectItem value="delivered">Đã giao</SelectItem>
                <SelectItem value="washing">Đang giặt</SelectItem>
                <SelectItem value="ready">Sẵn sàng</SelectItem>
                <SelectItem value="received">Đã nhận</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Xuất Excel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div>Loading...</div>
        ) : batches.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Chưa có đơn hàng nào
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã lô</TableHead>
                  <TableHead>Ngày giao</TableHead>
                  <TableHead>Ngày nhận</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead className="text-right">Chi phí</TableHead>
                  <TableHead className="text-center">Đánh giá</TableHead>
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
                    <TableCell>
                      {format(new Date(batch.delivery_date), 'dd/MM/yyyy', { locale: vi })}
                    </TableCell>
                    <TableCell>
                      {batch.actual_return_date
                        ? format(new Date(batch.actual_return_date), 'dd/MM/yyyy', { locale: vi })
                        : '-'}
                    </TableCell>
                    <TableCell className="text-center">{batch.total_items}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(batch.actual_cost || batch.estimated_cost)}
                    </TableCell>
                    <TableCell className="text-center">
                      {batch.quality_rating ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-yellow-400">★</span>
                          <span>{batch.quality_rating.toFixed(1)}</span>
                        </div>
                      ) : (
                        '-'
                      )}
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
        )}
      </CardContent>
    </Card>
  )
}
