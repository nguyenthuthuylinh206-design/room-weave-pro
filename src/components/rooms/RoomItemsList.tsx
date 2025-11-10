import { Link } from 'react-router-dom'
import { Package, CheckCircle } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type { RoomItemWithDetails } from '@/types/rooms.types'

interface RoomItemsListProps {
  items: RoomItemWithDetails[]
  roomId: string
  showMissing?: boolean
}

export function RoomItemsList({ items, showMissing }: RoomItemsListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Package className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">
          Không có đồ dùng nào
        </p>
      </div>
    )
  }
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">Ảnh</TableHead>
          <TableHead>Tên đồ dùng</TableHead>
          {showMissing && <TableHead className="text-center">Chuẩn</TableHead>}
          <TableHead className="text-center">Hiện có</TableHead>
          {showMissing && <TableHead className="text-center">Thiếu</TableHead>}
          <TableHead>Tình trạng</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const missing = item.standard_quantity 
            ? item.standard_quantity - item.quantity 
            : 0
          
          return (
            <TableRow key={item.id}>
              <TableCell>
                {item.item_thumbnail ? (
                  <img
                    src={item.item_thumbnail}
                    alt={item.item_name}
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <Link 
                    to={`/items/${item.item_id}`}
                    className="font-medium hover:underline"
                  >
                    {item.item_name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{item.item_code}</p>
                  {item.category_name && (
                    <Badge variant="outline" className="text-xs">
                      {item.category_name}
                    </Badge>
                  )}
                </div>
              </TableCell>
              {showMissing && (
                <TableCell className="text-center font-medium">
                  {item.standard_quantity || '-'}
                </TableCell>
              )}
              <TableCell className="text-center font-medium">
                {item.quantity}
              </TableCell>
              {showMissing && (
                <TableCell className="text-center">
                  {missing > 0 ? (
                    <span className="font-medium text-red-600">-{missing}</span>
                  ) : (
                    <CheckCircle className="inline h-4 w-4 text-green-600" />
                  )}
                </TableCell>
              )}
              <TableCell>
                <Badge
                  variant={
                    item.condition === 'good' ? 'default' :
                    item.condition === 'damaged' ? 'destructive' :
                    'secondary'
                  }
                >
                  {item.condition === 'good' && 'Tốt'}
                  {item.condition === 'fair' && 'Khá'}
                  {item.condition === 'poor' && 'Kém'}
                  {item.condition === 'damaged' && 'Hỏng'}
                </Badge>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
