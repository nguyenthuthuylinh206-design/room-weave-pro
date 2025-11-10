import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useInventoryTransactions } from '@/hooks/useInventoryTransactions'
import { Download, Upload, ArrowRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export function RecentTransactions() {
  const navigate = useNavigate()
  const { data, isLoading } = useInventoryTransactions({}, 1, 10)
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
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
  
  const transactions = data?.transactions || []
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Giao dịch gần đây</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/inventory/transactions')}
        >
          Xem tất cả
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Chưa có giao dịch nào
            </div>
          ) : (
            transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center gap-4 rounded-lg border p-3 hover:bg-accent cursor-pointer transition-colors"
                onClick={() => navigate(`/inventory/transactions/${transaction.id}`)}
              >
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  transaction.transaction_type === 'in' 
                    ? "bg-success/10 text-success" 
                    : "bg-warning/10 text-warning"
                )}>
                  {transaction.transaction_type === 'in' ? (
                    <Download className="h-5 w-5" />
                  ) : (
                    <Upload className="h-5 w-5" />
                  )}
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{transaction.item_name}</p>
                    <Badge variant="outline" className="text-xs">
                      {transaction.transaction_category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {transaction.transaction_code} • {' '}
                    {formatDistanceToNow(new Date(transaction.created_at), {
                      addSuffix: true,
                      locale: vi,
                    })}
                  </p>
                </div>
                
                <div className="text-right">
                  <p className={cn(
                    "font-semibold",
                    transaction.transaction_type === 'in' ? "text-success" : "text-warning"
                  )}>
                    {transaction.transaction_type === 'in' ? '+' : '-'}{transaction.quantity}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                      maximumFractionDigits: 0,
                    }).format(transaction.total_value || 0)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
