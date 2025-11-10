import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ShoppingCart, Eye, ChevronDown, ChevronUp, Package } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useLowStockItems } from '@/hooks/useInventoryDashboard'
import { cn } from '@/lib/utils'

export function LowStockAlert() {
  const navigate = useNavigate()
  const [isExpanded, setIsExpanded] = useState(true)
  const { data: items, isLoading } = useLowStockItems(50)
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }
  
  if (!items || items.length === 0) {
    return null
  }
  
  return (
    <Card className="border-orange-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-orange-600">
              Cảnh báo tồn kho thấp
            </CardTitle>
            <Badge variant="destructive">{items.length} items</Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Ảnh</TableHead>
                  <TableHead>Tên đồ dùng</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead className="text-center">Trong kho</TableHead>
                  <TableHead className="text-center">Tối thiểu</TableHead>
                  <TableHead className="text-center">Thiếu</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const isCritical = item.shortage_percent >= 50
                  
                  return (
                    <TableRow
                      key={item.id}
                      className={cn(
                        isCritical ? 'bg-red-50 hover:bg-red-100' : 'bg-orange-50 hover:bg-orange-100'
                      )}
                    >
                      <TableCell>
                        {item.images?.[0] ? (
                          <img
                            src={item.images[0]}
                            alt={item.name}
                            className="h-10 w-10 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.code}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.category_name}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          'font-bold',
                          isCritical ? 'text-red-600' : 'text-orange-600'
                        )}>
                          {item.quantity_in_stock}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.minimum_stock}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          'font-bold',
                          isCritical ? 'text-red-600' : 'text-orange-600'
                        )}>
                          -{item.shortage}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/items/${item.id}`)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
