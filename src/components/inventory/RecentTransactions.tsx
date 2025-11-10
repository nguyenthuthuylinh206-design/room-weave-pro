import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Download, 
  Upload, 
  Settings, 
  AlertCircle,
  Clock,
  User,
  MapPin,
  Package,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { TransactionDetailDialog } from './TransactionDetailDialog'
import { useInventoryTransactions } from '@/hooks/useInventoryTransactions'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '@/lib/utils'

const transactionIcons: Record<string, any> = {
  in: Download,
  out: Upload,
  adjust: Settings,
  damaged: AlertCircle,
  lost: AlertCircle,
}

const transactionColors: Record<string, string> = {
  in: 'text-success bg-success/10',
  out: 'text-warning bg-warning/10',
  adjust: 'text-yellow-600 bg-yellow-50',
  damaged: 'text-destructive bg-destructive/10',
  lost: 'text-destructive bg-destructive/10',
}

const transactionLabels: Record<string, string> = {
  in: 'NHẬP',
  out: 'XUẤT',
  transfer: 'CHUYỂN',
  adjust: 'ĐIỀU CHỈNH',
  damaged: 'HƯ HỎNG',
  lost: 'MẤT MÁT',
}

export function RecentTransactions() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<string>('all')
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null)
  
  const { data, isLoading } = useInventoryTransactions(
    filter === 'all' ? {} : { transaction_type: filter as any },
    1,
    10
  )
  
  const transactions = data?.transactions || []
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Giao dịch gần đây</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/inventory/transactions')}
            >
              Xem tất cả
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          
          <Tabs value={filter} onValueChange={setFilter} className="mt-4">
            <TabsList>
              <TabsTrigger value="all">Tất cả</TabsTrigger>
              <TabsTrigger value="in">Nhập</TabsTrigger>
              <TabsTrigger value="out">Xuất</TabsTrigger>
              <TabsTrigger value="adjust">Điều chỉnh</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        
        <CardContent>
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                Chưa có giao dịch nào
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => {
                const Icon = transactionIcons[transaction.transaction_type] || Package
                const colorClass = transactionColors[transaction.transaction_type] || ''
                const label = transactionLabels[transaction.transaction_type] || transaction.transaction_type
                
                return (
                  <div
                    key={transaction.id}
                    className="group relative rounded-lg border p-4 transition-colors hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedTransaction(transaction.id)}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg bg-gradient-to-b from-primary/50 to-transparent" />
                    
                    <div className="flex items-start gap-4">
                      <div className={cn('rounded-lg p-2', colorClass)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{transaction.transaction_code}</p>
                              <Badge variant="outline" className={cn('text-xs', colorClass)}>
                                {label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(transaction.created_at), {
                                addSuffix: true,
                                locale: vi,
                              })}
                            </p>
                          </div>
                          
                          <div className="text-right">
                            <p className={cn(
                              'font-bold',
                              transaction.transaction_type === 'in' ? 'text-success' : 'text-warning'
                            )}>
                              {transaction.transaction_type === 'in' ? '+' : '-'}{transaction.quantity}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Intl.NumberFormat('vi-VN', {
                                style: 'currency',
                                currency: 'VND',
                                notation: 'compact',
                              }).format(transaction.total_value || 0)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {transaction.item_images?.[0] && (
                            <img
                              src={transaction.item_images[0]}
                              alt={transaction.item_name}
                              className="h-8 w-8 rounded object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{transaction.item_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {transaction.item_code} • {transaction.category_name}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{transaction.created_by_name}</span>
                          </div>
                          
                          {transaction.from_location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>
                                {transaction.from_location}
                                {transaction.to_location && ` → ${transaction.to_location}`}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {transaction.notes && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {transaction.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      <TransactionDetailDialog
        transactionId={selectedTransaction}
        open={!!selectedTransaction}
        onOpenChange={(open) => !open && setSelectedTransaction(null)}
      />
    </>
  )
}
