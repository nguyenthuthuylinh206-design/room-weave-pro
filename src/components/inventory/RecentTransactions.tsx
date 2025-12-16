import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
import { vi, enUS } from 'date-fns/locale'
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

export function RecentTransactions() {
  const { t, i18n } = useTranslation(['inventory'])
  const navigate = useNavigate()
  const [filter, setFilter] = useState<string>('all')
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null)
  const dateLocale = i18n.language === 'vi' ? vi : enUS
  
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
            <CardTitle>{t('recentTransactions.title')}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/inventory/transactions')}
            >
              {t('recentTransactions.viewAll')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          
          <Tabs value={filter} onValueChange={setFilter} className="mt-4">
            <TabsList>
              <TabsTrigger value="all">{t('filters.all')}</TabsTrigger>
              <TabsTrigger value="in">{t('transactionType.in')}</TabsTrigger>
              <TabsTrigger value="out">{t('transactionType.out')}</TabsTrigger>
              <TabsTrigger value="adjust">{t('transactionType.adjustment')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        
        <CardContent>
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                {t('recentTransactions.noTransactions')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => {
                const Icon = transactionIcons[transaction.transaction_type] || Package
                const colorClass = transactionColors[transaction.transaction_type] || ''
                const label = t(`transactionLabel.${transaction.transaction_type}`, { defaultValue: transaction.transaction_type })
                
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
                              {transaction.transaction_category && (
                                <Badge variant="secondary" className="text-xs">
                                  {t(`category.${transaction.transaction_category}`, { defaultValue: transaction.transaction_category })}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(transaction.created_at), {
                                addSuffix: true,
                                locale: dateLocale,
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
                              {new Intl.NumberFormat(i18n.language === 'vi' ? 'vi-VN' : 'en-US', {
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
                            <Link
                              to={`/items/${transaction.item_id}`}
                              className="text-sm font-medium hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {transaction.item_name}
                            </Link>
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