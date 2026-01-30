import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ChevronDown, ChevronUp, Package, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { usePendingSupplementCount, useSupplementRequests, type SupplementRequest } from '@/hooks/useSupplementRequests'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface PendingSupplementsBannerProps {
  onCreateFromSupplements?: (selectedIds: string[]) => void
}

export function PendingSupplementsBanner({ onCreateFromSupplements }: PendingSupplementsBannerProps) {
  const navigate = useNavigate()
  const { data: pendingCount = 0, isLoading: isLoadingCount } = usePendingSupplementCount()
  const { data: pendingRequests = [], isLoading: isLoadingRequests } = useSupplementRequests({ status: 'pending' })
  
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  if (isLoadingCount || pendingCount === 0) {
    return null
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === pendingRequests.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(pendingRequests.map(r => r.id))
    }
  }

  const handleCreateDistribution = () => {
    if (selectedIds.length > 0) {
      const params = new URLSearchParams()
      selectedIds.forEach(id => params.append('ids', id))
      navigate(`/inventory/distributions/from-supplements?${params.toString()}`)
    } else {
      navigate('/inventory/distributions/from-supplements')
    }
  }

  const getRequestTypeClass = (type: string) => {
    switch (type) {
      case 'lost': return 'text-red-600 dark:text-red-400'
      case 'damaged': return 'text-amber-600 dark:text-amber-400'
      case 'consumed': return 'text-blue-600 dark:text-blue-400'
      case 'mixed': return 'text-purple-600 dark:text-purple-400'
      default: return 'text-muted-foreground'
    }
  }

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case 'lost': return 'Mất'
      case 'damaged': return 'Hỏng'
      case 'consumed': return 'Tiêu hao'
      case 'mixed': return 'Hỗn hợp'
      default: return type
    }
  }

  return (
    <div className="border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full p-3 flex items-center justify-between hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
              <span className="font-medium text-amber-800 dark:text-amber-200">
                {pendingCount} yêu cầu bổ sung đang chờ xử lý
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="default"
                onClick={(e) => {
                  e.stopPropagation()
                  handleCreateDistribution()
                }}
                className="h-8"
              >
                Xử lý ngay
              </Button>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-amber-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-amber-600" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-amber-200 dark:border-amber-800 p-3 space-y-3">
            {/* Select all */}
            {pendingRequests.length > 1 && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedIds.length === pendingRequests.length}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">Chọn tất cả</span>
                </label>
                <span className="text-xs text-muted-foreground">
                  {selectedIds.length}/{pendingRequests.length} đã chọn
                </span>
              </div>
            )}

            {/* Request cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {isLoadingRequests ? (
                <div className="col-span-full text-center text-sm text-muted-foreground py-4">
                  Đang tải...
                </div>
              ) : (
                pendingRequests.slice(0, 10).map((request) => (
                  <SupplementCard
                    key={request.id}
                    request={request}
                    isSelected={selectedIds.includes(request.id)}
                    onToggle={() => toggleSelect(request.id)}
                    getRequestTypeLabel={getRequestTypeLabel}
                    getRequestTypeClass={getRequestTypeClass}
                  />
                ))
              )}
            </div>

            {pendingRequests.length > 10 && (
              <p className="text-xs text-muted-foreground text-center">
                Và {pendingRequests.length - 10} yêu cầu khác...
              </p>
            )}

            {/* Action buttons */}
            {selectedIds.length > 0 && (
              <div className="flex justify-end pt-2 border-t border-amber-200/50">
                <Button onClick={handleCreateDistribution} size="sm" className="gap-2">
                  <Package className="h-4 w-4" />
                  Tạo phiếu từ {selectedIds.length} yêu cầu
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

interface SupplementCardProps {
  request: SupplementRequest
  isSelected: boolean
  onToggle: () => void
  getRequestTypeLabel: (type: string) => string
  getRequestTypeClass: (type: string) => string
}

function SupplementCard({ request, isSelected, onToggle, getRequestTypeLabel, getRequestTypeClass }: SupplementCardProps) {
  const itemCount = request.items?.length || 0
  const timeAgo = formatDistanceToNow(new Date(request.created_at), { addSuffix: true, locale: vi })

  return (
    <div
      onClick={onToggle}
      className={cn(
        'py-1.5 px-2 rounded border cursor-pointer transition-all',
        isSelected 
          ? 'border-l-4 border-l-primary border-t border-r border-b bg-muted/30'
          : 'border-l-4 border-l-transparent hover:border-l-primary/50'
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="font-mono text-xs font-medium truncate">
          {request.request_code}
        </span>
        <Checkbox
          checked={isSelected}
          className="h-4 w-4"
          onClick={(e) => e.stopPropagation()}
          onCheckedChange={onToggle}
        />
      </div>
      <div className="mt-1">
        <div className="font-semibold text-sm">P.{request.room?.room_number}</div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Package className="h-3 w-3" />
          {itemCount} SP
          <span className={cn('text-[10px] ml-1', getRequestTypeClass(request.request_type))}>
            {getRequestTypeLabel(request.request_type)}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
          <Clock className="h-3 w-3" />
          {timeAgo}
        </div>
      </div>
    </div>
  )
}
