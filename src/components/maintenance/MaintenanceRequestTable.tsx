import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PriorityBadge } from './PriorityBadge'
import { StatusBadge } from './StatusBadge'
import { Button } from '@/components/ui/button'
import { MoreHorizontal } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface MaintenanceRequestTableProps {
  requests: any[]
  isLoading?: boolean
}

export const MaintenanceRequestTable = ({ requests, isLoading }: MaintenanceRequestTableProps) => {
  const issueTypeLabels: Record<string, string> = {
    repair: '🔧 Sửa chữa',
    replace: '🔄 Thay thế',
    inspection: '🔍 Kiểm tra',
    cleaning: '🧹 Vệ sinh',
    other: '➕ Khác',
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Không có yêu cầu bảo trì nào
      </div>
    )
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã yêu cầu</TableHead>
            <TableHead>Độ ưu tiên</TableHead>
            <TableHead>Loại</TableHead>
            <TableHead>Tiêu đề</TableHead>
            <TableHead>Vị trí</TableHead>
            <TableHead>Người báo cáo</TableHead>
            <TableHead>Người xử lý</TableHead>
            <TableHead>Thời gian</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request: any) => (
            <TableRow key={request.id}>
              <TableCell>
                <Link
                  to={`/maintenance/requests/${request.id}`}
                  className="font-medium hover:underline"
                >
                  {request.request_code}
                </Link>
              </TableCell>
              <TableCell>
                <PriorityBadge priority={request.priority} />
              </TableCell>
              <TableCell>{issueTypeLabels[request.issue_type] || request.issue_type}</TableCell>
              <TableCell className="max-w-[200px] truncate">{request.title}</TableCell>
              <TableCell>
                {request.room ? `Phòng ${request.room.room_number}` : request.location}
              </TableCell>
              <TableCell>{request.reporter?.full_name || 'N/A'}</TableCell>
              <TableCell>{request.assignee?.full_name || 'Chưa gán'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(request.reported_at), { addSuffix: true, locale: vi })}
              </TableCell>
              <TableCell>
                <StatusBadge status={request.status} />
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={`/maintenance/requests/${request.id}`}>Xem chi tiết</Link>
                    </DropdownMenuItem>
                    {request.status === 'pending' && (
                      <>
                        <DropdownMenuItem>Gán thợ</DropdownMenuItem>
                        <DropdownMenuItem>Sửa</DropdownMenuItem>
                      </>
                    )}
                    {request.status === 'assigned' && (
                      <DropdownMenuItem>Bắt đầu xử lý</DropdownMenuItem>
                    )}
                    {request.status === 'in_progress' && (
                      <>
                        <DropdownMenuItem>Cập nhật tiến độ</DropdownMenuItem>
                        <DropdownMenuItem>Hoàn thành</DropdownMenuItem>
                      </>
                    )}
                    {(request.status === 'pending' || request.status === 'assigned') && (
                      <DropdownMenuItem className="text-destructive">Hủy</DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
