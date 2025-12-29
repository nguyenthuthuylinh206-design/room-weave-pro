import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  Download, 
  Upload, 
  Settings, 
  AlertCircle,
  Clock,
  Filter,
  ArrowRight,
  Package,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  in: 'text-green-600 bg-green-100 dark:bg-green-900/30',
  out: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
  adjust: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
  damaged: 'text-red-600 bg-red-100 dark:bg-red-900/30',
  lost: 'text-red-600 bg-red-100 dark:bg-red-900/30',
}

const filterOptions = [
  { value: 'all', label: 'Tất cả' },
  { value: 'in', label: 'Nhập kho' },
  { value: 'out', label: 'Xuất kho' },
  { value: 'adjust', label: 'Điều chỉnh' },
]

function truncateCode(code: string): string {
  if (!code) return ''
  const parts = code.split('-')
  if (parts.length >= 2) {
    return `#${parts[parts.length - 1].slice(-4)}`
  }
  return `#${code.slice(-4)}`
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
    8
  )
  
  const transactions = data?.transactions || []
  
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }
  
  const currentFilter = filterOptions.find(f => f.value === filter)
  
  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              {t('recentTransactions.title')}
            </CardTitle>
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Filter className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {filterOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setFilter(option.value)}
                      className={cn(filter === option.value && "bg-muted")}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => navigate('/inventory/transactions')}
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {filter !== 'all' && (
            <Badge variant="secondary" className="text-[10px] w-fit mt-1">
              {currentFilter?.label}
            </Badge>
          )}
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-xs text-muted-foreground">
                {t('recentTransactions.noTransactions')}
              </p>
            </div>
          ) : (
            <div className="space-y-1 max-h-[340px] overflow-y-auto pr-1">
              {transactions.map((transaction) => {
                const Icon = transactionIcons[transaction.transaction_type] || Package
                const colorClass = transactionColors[transaction.transaction_type] || ''
                
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedTransaction(transaction.id)}
                  >
                    <div className={cn('rounded-md p-1.5 flex-shrink-0', colorClass)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {/* Line 1: Item name + quantity badge */}
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate flex-1">
                          {transaction.item_name}
                        </p>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[10px] px-1.5 py-0 flex-shrink-0 font-bold",
                            transaction.transaction_type === 'in' 
                              ? 'text-green-600 border-green-200' 
                              : 'text-orange-600 border-orange-200'
                          )}
                        >
                          {transaction.transaction_type === 'in' ? '+' : '-'}{transaction.quantity}
                        </Badge>
                      </div>
                      
                      {/* Line 2: Timestamp + user + code */}
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span>
                          {formatDistanceToNow(new Date(transaction.created_at), {
                            addSuffix: true,
                            locale: dateLocale,
                          })}
                        </span>
                        <span>•</span>
                        <span className="truncate">{transaction.created_by_name}</span>
                        <span className="ml-auto text-[9px] opacity-60">
                          {truncateCode(transaction.transaction_code)}
                        </span>
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
