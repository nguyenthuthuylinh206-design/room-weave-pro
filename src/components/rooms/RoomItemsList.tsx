import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Package, CheckCircle2, AlertCircle, Loader2, BoxesIcon, Coffee, PackagePlus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useUpdateRoomItemQuantity } from '@/hooks/useRoomItems'
import { CustomerUsedDialog } from './CustomerUsedDialog'

interface RoomItem {
  item_id: string
  item_code: string
  item_name: string
  item_type: 'linen' | 'consumable' | 'equipment' | 'furniture'
  item_thumbnail?: string
  category_name?: string
  standard_quantity: number
  current_quantity: number
  missing_quantity: number
  condition: string
  is_verified: boolean
  verified_at?: string
  verified_by?: string
  room_item_id?: string | null
  has_standard: boolean
}

interface RoomItemsListProps {
  items: RoomItem[]
  roomId: string
  onRequestSupplement?: (item: RoomItem) => void
}

export function RoomItemsList({ items, roomId, onRequestSupplement }: RoomItemsListProps) {
  const { t } = useTranslation('rooms')
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [savingItemId, setSavingItemId] = useState<string | null>(null)
  const updateQuantity = useUpdateRoomItemQuantity()

  // Dialog state for customer used
  const [customerUsedDialogOpen, setCustomerUsedDialogOpen] = useState(false)
  const [selectedItemForUsed, setSelectedItemForUsed] = useState<RoomItem | null>(null)

  // Separate standard items and other items (distributed but not in standards)
  const standardItems = items.filter(item => item.has_standard)
  const otherItems = items.filter(item => !item.has_standard)
  
  const unverifiedCount = standardItems.filter(item => !item.is_verified).length
  
  // Calculate missing items dynamically based on current quantities
  const missingItems = standardItems.filter(item => {
    const currentQty = quantities[item.item_id] ?? item.current_quantity
    const missing = item.standard_quantity - currentQty
    return missing > 0
  })
  
  const totalMissing = missingItems.reduce((sum, item) => {
    const currentQty = quantities[item.item_id] ?? item.current_quantity
    const missing = Math.max(0, item.standard_quantity - currentQty)
    return sum + missing
  }, 0)

  const handleQuantityChange = (itemId: string, value: string) => {
    const qty = value === '' ? 0 : parseInt(value) || 0
    setQuantities(prev => ({ ...prev, [itemId]: qty }))
  }

  const handleQuantityBlur = async (item: RoomItem) => {
    const newQty = quantities[item.item_id]
    if (newQty !== undefined && newQty !== item.current_quantity) {
      setSavingItemId(item.item_id)
      try {
        await updateQuantity.mutateAsync({
          roomId,
          itemId: item.item_id,
          quantity: newQty,
          roomItemId: item.room_item_id || null,
        })
        // Reset local state after successful update
        setQuantities(prev => {
          const newState = { ...prev }
          delete newState[item.item_id]
          return newState
        })
      } catch (error) {
        // If save fails, revert the local state
        setQuantities(prev => {
          const newState = { ...prev }
          delete newState[item.item_id]
          return newState
        })
      } finally {
        setSavingItemId(null)
      }
    }
  }

  const handleCustomerUsed = (item: RoomItem) => {
    setSelectedItemForUsed(item)
    setCustomerUsedDialogOpen(true)
  }

  const handleRequestSupplement = (item: RoomItem) => {
    if (onRequestSupplement) {
      onRequestSupplement(item)
    }
  }

  const getConditionLabel = (condition: string) => {
    const conditionKey = condition as 'good' | 'fair' | 'poor' | 'damaged'
    return t(`itemsList.condition.${conditionKey}`, { defaultValue: condition })
  }

  // Render quick action buttons for an item
  const renderQuickActions = (item: RoomItem) => {
    const currentQty = quantities[item.item_id] ?? item.current_quantity
    // Only show "Customer Used" for consumable items (water, toothbrush, etc.)
    const showCustomerUsed = item.item_type === 'consumable' && currentQty > 0
    const showSupplement = item.has_standard ? (item.standard_quantity - currentQty) > 0 : false
    
    if (!showCustomerUsed && !showSupplement) return null

    return (
      <div className="flex gap-2 mt-3 pt-3 border-t">
        {showCustomerUsed && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9 gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-800 dark:hover:bg-amber-950"
            onClick={() => handleCustomerUsed(item)}
          >
            <Coffee className="h-4 w-4" />
            {t('quickActions.customerUsed')}
          </Button>
        )}
        {showSupplement && onRequestSupplement && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9 gap-1.5 text-primary border-primary/20 hover:bg-primary/5"
            onClick={() => handleRequestSupplement(item)}
          >
            <PackagePlus className="h-4 w-4" />
            {t('quickActions.supplement')}
          </Button>
        )}
      </div>
    )
  }

  // Show message if no items at all
  if (items.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {t('itemsList.noStandardSetupWithLink')}{' '}
          <Link to="/rooms/standards" className="font-medium underline">
            {t('itemsList.manageStandards')}
          </Link>{' '}
          {t('itemsList.toSetup')}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      {/* Customer Used Dialog */}
      <CustomerUsedDialog
        open={customerUsedDialogOpen}
        onOpenChange={setCustomerUsedDialogOpen}
        item={selectedItemForUsed}
        roomId={roomId}
      />

      {unverifiedCount > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('itemsList.unverifiedAlert', { count: unverifiedCount })}
            {missingItems.length > 0 && (
              <span className="font-semibold">
                {' '}{t('itemsList.missingSummary', { count: missingItems.length, total: totalMissing })}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue={standardItems.length > 0 ? "required" : "other"} className="w-full">
        <TabsList className="w-full flex overflow-x-auto no-scrollbar">
          <TabsTrigger value="required" className="flex-shrink-0 text-xs sm:text-sm">
            <Package className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="whitespace-nowrap">{t('itemsList.tabs.required')}</span>
            {standardItems.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{standardItems.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="current" className="flex-shrink-0 text-xs sm:text-sm">
            <CheckCircle2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="whitespace-nowrap">{t('itemsList.tabs.current')}</span>
            <Badge variant="secondary" className="ml-1 text-xs">{items.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="missing" className="flex-shrink-0 text-xs sm:text-sm">
            <AlertCircle className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="whitespace-nowrap">{t('itemsList.tabs.missing')}</span>
            {missingItems.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">{missingItems.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="other" className="flex-shrink-0 text-xs sm:text-sm">
            <BoxesIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="whitespace-nowrap">{t('itemsList.tabs.other')}</span>
            {otherItems.length > 0 && (
              <Badge variant="outline" className="ml-1 text-xs">{otherItems.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Required items (standards) */}
        <TabsContent value="required" className="space-y-2 mt-4">
          {standardItems.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('itemsList.noStandardSetup')}
              </AlertDescription>
            </Alert>
          ) : (
            standardItems.map((item) => {
              const currentQty = quantities[item.item_id] ?? item.current_quantity
              const diff = currentQty - item.standard_quantity
              
              return (
                <div key={item.item_id} className="p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-3">
                    {item.item_thumbnail ? (
                      <img
                        src={item.item_thumbnail}
                        alt={item.item_name}
                        className="h-14 w-14 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded bg-muted flex-shrink-0">
                        <Package className="h-7 w-7 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/items/${item.item_id}`}
                        className="font-medium hover:underline block truncate"
                      >
                        {item.item_name}
                      </Link>
                      <p className="text-sm text-muted-foreground">{item.item_code}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <div className="text-xl font-bold text-primary">{item.standard_quantity}</div>
                        <p className="text-xs text-muted-foreground">{t('itemsList.labels.required')}</p>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold">{currentQty}</div>
                        <p className="text-xs text-muted-foreground">{t('itemsList.labels.current')}</p>
                      </div>
                      <div className="w-20">
                        {diff === 0 ? (
                          <Badge className="w-full justify-center bg-success">{t('itemsList.status.enough')}</Badge>
                        ) : diff > 0 ? (
                          <Badge className="w-full justify-center bg-blue-500">{t('itemsList.status.excessAmount', { count: diff })}</Badge>
                        ) : (
                          <Badge variant="destructive" className="w-full justify-center">{t('itemsList.status.missingAmount', { count: Math.abs(diff) })}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {renderQuickActions(item)}
                </div>
              )
            })
          )}
        </TabsContent>

        {/* Tab 2: Current items - ALL items in room */}
        <TabsContent value="current" className="space-y-3 mt-4">
          {items.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('itemsList.noItems')}
              </AlertDescription>
            </Alert>
          ) : (
            items.map((item) => {
              const currentQty = quantities[item.item_id] ?? item.current_quantity
              const diff = item.has_standard ? currentQty - item.standard_quantity : null
              
              return (
                <div key={item.item_id} className="p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow space-y-3">
                  {/* Header with item info and status */}
                  <div className="flex items-center gap-3">
                    {item.item_thumbnail ? (
                      <img
                        src={item.item_thumbnail}
                        alt={item.item_name}
                        className="h-16 w-16 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded bg-muted flex-shrink-0">
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base truncate">{item.item_name}</p>
                      <p className="text-sm text-muted-foreground">{item.item_code}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline">
                          {getConditionLabel(item.condition)}
                        </Badge>
                        {!item.has_standard && (
                          <Badge variant="secondary">{t('itemsList.otherItem')}</Badge>
                        )}
                      </div>
                    </div>
                    {/* Status Badge - only for standard items */}
                    {item.has_standard && diff !== null && (
                      <div className="flex-shrink-0">
                        {diff === 0 ? (
                          <Badge className="bg-success text-white text-base px-3 py-1">
                            ✓ {t('itemsList.status.enough')}
                          </Badge>
                        ) : diff > 0 ? (
                          <Badge className="bg-blue-500 text-white text-base px-3 py-1">
                            ↑ {t('itemsList.status.excessAmount', { count: diff })}
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-base px-3 py-1">
                            ↓ {t('itemsList.status.missingAmount', { count: Math.abs(diff) })}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quantity comparison and input */}
                  <div className="flex items-center gap-4 bg-muted/50 p-3 rounded-lg">
                    {/* Current Quantity Input */}
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">{t('itemsList.tabs.current')}</label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          value={currentQty}
                          onChange={(e) => handleQuantityChange(item.item_id, e.target.value)}
                          onBlur={() => handleQuantityBlur(item)}
                          disabled={savingItemId === item.item_id}
                          className="h-12 text-center text-xl font-bold"
                          placeholder="0"
                        />
                        {savingItemId === item.item_id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-md">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Separator and standard info - only for standard items */}
                    {item.has_standard && (
                      <>
                        <div className="text-2xl font-light text-muted-foreground">/</div>
                        <div className="flex-1 space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">{t('itemsList.tabs.required')}</label>
                          <div className="h-12 flex items-center justify-center rounded-md border bg-background">
                            <span className="text-xl font-bold text-primary">{item.standard_quantity}</span>
                          </div>
                        </div>
                        <div className="flex-1 space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">{t('itemsList.labels.difference')}</label>
                          <div className={`h-12 flex items-center justify-center rounded-md border font-bold text-xl ${
                            diff === 0 ? 'bg-success/10 text-success border-success/20' :
                            diff !== null && diff > 0 ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                            'bg-destructive/10 text-destructive border-destructive/20'
                          }`}>
                            {diff === 0 ? '0' : diff !== null && diff > 0 ? `+${diff}` : diff}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Quick Actions */}
                  {renderQuickActions(item)}
                </div>
              )
            })
          )}
        </TabsContent>

        {/* Tab 3: Missing items */}
        <TabsContent value="missing" className="space-y-2 mt-4">
          {missingItems.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-3" />
              <p className="font-medium text-lg">{t('itemsList.allComplete')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('itemsList.allCompleteDesc')}
              </p>
            </div>
          ) : (
            <>
              <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20 mb-4">
                <p className="font-medium text-destructive">
                  {t('itemsList.missingTypes', { count: missingItems.length })}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('itemsList.totalMissing', { count: totalMissing })}
                </p>
              </div>
              {missingItems.map((item) => {
                const currentQty = quantities[item.item_id] ?? item.current_quantity
                const missing = Math.max(0, item.standard_quantity - currentQty)
                
                return (
                  <div key={item.item_id} className="p-4 rounded-lg border border-destructive/20 bg-destructive/5 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3">
                      {item.item_thumbnail ? (
                        <img
                          src={item.item_thumbnail}
                          alt={item.item_name}
                          className="h-14 w-14 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded bg-muted flex-shrink-0">
                          <Package className="h-7 w-7 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.item_name}</p>
                        <p className="text-sm text-muted-foreground">{item.item_code}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">{t('itemsList.tabs.current')}</div>
                          <div className="text-lg font-medium">{currentQty}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">{t('itemsList.tabs.required')}</div>
                          <div className="text-lg font-medium">{item.standard_quantity}</div>
                        </div>
                        <div className="text-center bg-destructive/10 px-3 py-2 rounded">
                          <div className="text-sm text-destructive font-medium">{t('itemsList.status.missing')}</div>
                          <div className="text-2xl font-bold text-destructive">{missing}</div>
                        </div>
                      </div>
                    </div>
                    {/* Quick Actions for missing items */}
                    {onRequestSupplement && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-destructive/20">
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1 h-9 gap-1.5"
                          onClick={() => handleRequestSupplement(item)}
                        >
                          <PackagePlus className="h-4 w-4" />
                          {t('quickActions.supplementNow', { count: missing })}
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </TabsContent>

        {/* Tab 4: Other items (not in standards - distributed items) */}
        <TabsContent value="other" className="space-y-2 mt-4">
          {otherItems.length === 0 ? (
            <div className="text-center py-12">
              <BoxesIcon className="h-16 w-16 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-lg">{t('itemsList.noOtherItems')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('itemsList.noOtherItemsDesc')}
              </p>
            </div>
          ) : (
            <>
              <div className="bg-muted p-4 rounded-lg border mb-4">
                <p className="font-medium">
                  {t('itemsList.otherItemsCount', { count: otherItems.length })}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('itemsList.otherItemsDesc')}
                </p>
              </div>
              {otherItems.map((item) => {
                const currentQty = quantities[item.item_id] ?? item.current_quantity
                
                return (
                  <div key={item.item_id} className="p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3">
                      {item.item_thumbnail ? (
                        <img
                          src={item.item_thumbnail}
                          alt={item.item_name}
                          className="h-14 w-14 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded bg-muted flex-shrink-0">
                          <Package className="h-7 w-7 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/items/${item.item_id}`}
                          className="font-medium hover:underline block truncate"
                        >
                          {item.item_name}
                        </Link>
                        <p className="text-sm text-muted-foreground">{item.item_code}</p>
                        {item.category_name && (
                          <Badge variant="outline" className="mt-1 text-xs">{item.category_name}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <div className="text-xl font-bold">{currentQty}</div>
                          <p className="text-xs text-muted-foreground">{t('itemsList.labels.current')}</p>
                        </div>
                        <Badge variant="outline" className="px-3 py-1">
                          {getConditionLabel(item.condition)}
                        </Badge>
                      </div>
                    </div>
                    {/* Quick action for other items - only customer used */}
                    {currentQty > 0 && (
                      <div className="flex gap-2 mt-3 pt-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-9 gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-800 dark:hover:bg-amber-950"
                          onClick={() => handleCustomerUsed(item)}
                        >
                          <Coffee className="h-4 w-4" />
                          {t('quickActions.customerUsed')}
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
