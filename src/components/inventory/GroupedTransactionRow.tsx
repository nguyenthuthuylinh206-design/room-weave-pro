import { useState } from 'react'
import { ChevronDown, ChevronRight, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { TableCell, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { TransactionTypeBadge } from './TransactionTypeBadge'
import { cn } from '@/lib/utils'
import type { TransactionType } from '@/types/inventory.types'

interface TransactionItem {
  id: string
  transaction_code: string
  transaction_type: string
  item_name: string
  item_code: string
  item_images?: string[]
  quantity: number
  from_location?: string | null
  to_location?: string | null
  created_by_name: string
  created_by_avatar?: string
  created_at: string
}

interface GroupedTransactionRowProps {
  transactions: TransactionItem[]
  onViewDetail: (id: string) => void
}

export function GroupedTransactionRow({ transactions, onViewDetail }: GroupedTransactionRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  if (transactions.length === 0) return null
  
  const first = transactions[0]
  const isSingleItem = transactions.length === 1
  
  // Calculate totals for group
  const totalIn = transactions
    .filter(t => t.transaction_type === 'in')
    .reduce((sum, t) => sum + Math.abs(t.quantity), 0)
  const totalOut = transactions
    .filter(t => t.transaction_type === 'out')
    .reduce((sum, t) => sum + Math.abs(t.quantity), 0)
  
  // For single item, render simple row
  if (isSingleItem) {
    return (
      <TableRow className="hover:bg-muted/30">
        <TableCell className="font-mono text-xs py-2">
          <div className="flex items-center gap-1">
            <span className="w-4" /> {/* Placeholder for alignment */}
            {first.transaction_code}
          </div>
        </TableCell>
        <TableCell className="py-2">
          <TransactionTypeBadge type={first.transaction_type === 'adjustment' ? 'adjust' : first.transaction_type as TransactionType} />
        </TableCell>
        <TableCell className="py-2">
          <div className="flex items-center gap-2">
            {first.item_images?.[0] && (
              <img 
                src={first.item_images[0]} 
                alt={first.item_name}
                className="h-6 w-6 rounded object-cover"
              />
            )}
            <p className="text-sm">{first.item_name}</p>
          </div>
        </TableCell>
        <TableCell className="py-2">
          <span className={first.transaction_type === 'in' ? 'text-green-600 font-medium text-sm' : 'text-amber-600 font-medium text-sm'}>
            {first.transaction_type === 'in' ? '+' : '-'}{Math.abs(first.quantity)}
          </span>
        </TableCell>
        <TableCell className="text-xs py-2">
          {first.from_location && <div>{first.from_location}</div>}
          {first.to_location && <div>→ {first.to_location}</div>}
        </TableCell>
        <TableCell className="py-2">
          <div className="flex items-center gap-1.5">
            <Avatar className="h-5 w-5">
              <AvatarImage src={first.created_by_avatar} />
              <AvatarFallback className="text-[10px]">
                {first.created_by_name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs">{first.created_by_name}</span>
          </div>
        </TableCell>
        <TableCell className="text-xs py-2">
          {first.created_at ? format(new Date(first.created_at), 'dd/MM HH:mm', { locale: vi }) : 'N/A'}
        </TableCell>
        <TableCell className="text-right py-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onViewDetail(first.id)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </TableCell>
      </TableRow>
    )
  }
  
  // For multiple items, render expandable group
  return (
    <>
      {/* Group Header Row */}
      <TableRow 
        className={cn(
          "hover:bg-muted/30 cursor-pointer",
          isExpanded && "bg-muted/20"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <TableCell className="font-mono text-xs py-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-4 w-4 p-0" type="button">
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </Button>
            {first.transaction_code}
          </div>
        </TableCell>
        <TableCell className="py-2">
          <TransactionTypeBadge type={first.transaction_type === 'adjustment' ? 'adjust' : first.transaction_type as TransactionType} />
        </TableCell>
        <TableCell className="py-2">
          <span className="text-sm text-muted-foreground">
            {transactions.length} sản phẩm
          </span>
        </TableCell>
        <TableCell className="py-2">
          <div className="flex items-center gap-2">
            {totalIn > 0 && (
              <span className="text-green-600 font-medium text-sm">+{totalIn}</span>
            )}
            {totalOut > 0 && (
              <span className="text-amber-600 font-medium text-sm">-{totalOut}</span>
            )}
          </div>
        </TableCell>
        <TableCell className="text-xs py-2">
          {first.from_location && <div>{first.from_location}</div>}
          {first.to_location && <div>→ {first.to_location}</div>}
        </TableCell>
        <TableCell className="py-2">
          <div className="flex items-center gap-1.5">
            <Avatar className="h-5 w-5">
              <AvatarImage src={first.created_by_avatar} />
              <AvatarFallback className="text-[10px]">
                {first.created_by_name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs">{first.created_by_name}</span>
          </div>
        </TableCell>
        <TableCell className="text-xs py-2">
          {first.created_at ? format(new Date(first.created_at), 'dd/MM HH:mm', { locale: vi }) : 'N/A'}
        </TableCell>
        <TableCell className="text-right py-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation()
              onViewDetail(first.id)
            }}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </TableCell>
      </TableRow>
      
      {/* Expanded Child Rows */}
      {isExpanded && transactions.map((transaction) => (
        <TableRow key={transaction.id} className="bg-muted/10 hover:bg-muted/20">
          <TableCell className="py-1.5 pl-10" />
          <TableCell className="py-1.5" />
          <TableCell className="py-1.5">
            <div className="flex items-center gap-2">
              {transaction.item_images?.[0] && (
                <img 
                  src={transaction.item_images[0]} 
                  alt={transaction.item_name}
                  className="h-5 w-5 rounded object-cover"
                />
              )}
              <p className="text-xs">{transaction.item_name}</p>
            </div>
          </TableCell>
          <TableCell className="py-1.5">
            <span className={cn(
              "font-medium text-xs",
              transaction.transaction_type === 'in' ? 'text-green-600' : 'text-amber-600'
            )}>
              {transaction.transaction_type === 'in' ? '+' : '-'}{Math.abs(transaction.quantity)}
            </span>
          </TableCell>
          <TableCell className="py-1.5" />
          <TableCell className="py-1.5" />
          <TableCell className="py-1.5" />
          <TableCell className="text-right py-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onViewDetail(transaction.id)}
            >
              <Eye className="h-3 w-3" />
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

// Helper function to group transactions by code
export function groupTransactionsByCode<T extends { transaction_code: string }>(
  transactions: T[]
): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  
  for (const transaction of transactions) {
    const code = transaction.transaction_code
    if (!groups.has(code)) {
      groups.set(code, [])
    }
    groups.get(code)!.push(transaction)
  }
  
  return groups
}
