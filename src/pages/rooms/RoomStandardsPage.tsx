import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Trash2, Droplets, Wrench, ShoppingBag, Armchair } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useRoomStandards, useUpdateStandard, useDeleteStandard, useAddStandard, useCloneStandards } from '@/hooks/useRoomStandards'
import type { RoomType } from '@/types/rooms.types'
import type { ItemType } from '@/types/items.types'
import { useCategories } from '@/hooks/useCategories'
import { useItems } from '@/hooks/useItems'
import { toast } from 'sonner'
import { RoomStandardItemPicker } from '@/components/rooms/RoomStandardItemPicker'
import { CloneStandardsDialog } from '@/components/rooms/CloneStandardsDialog'

const ROOM_TYPE_KEYS: RoomType[] = ['standard', 'deluxe', 'suite', 'vip']

// Item type configuration with icons, colors, and labels
const ITEM_TYPE_CONFIG: Record<ItemType, { icon: typeof Droplets; color: string; bgColor: string; label: string }> = {
  linen: { icon: Droplets, color: 'text-emerald-600', bgColor: 'bg-emerald-100', label: 'Đồ vải' },
  consumable: { icon: ShoppingBag, color: 'text-violet-600', bgColor: 'bg-violet-100', label: 'Tiêu hao' },
  equipment: { icon: Wrench, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Thiết bị' },
  furniture: { icon: Armchair, color: 'text-amber-600', bgColor: 'bg-amber-100', label: 'Nội thất' },
}

export function RoomStandardsPage() {
  const { t } = useTranslation('rooms')
  const navigate = useNavigate()
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType>('standard')

  const { data: standards, isLoading } = useRoomStandards(selectedRoomType)
  const { data: categories } = useCategories()
  const { data: itemsData, isLoading: isLoadingItems } = useItems({ status: 'active' }, 1, 1000)
  const items = itemsData?.items || []
  const addStandard = useAddStandard()
  const updateStandard = useUpdateStandard()
  const deleteStandard = useDeleteStandard()
  const cloneStandards = useCloneStandards()

  // Get list of item IDs already in standards
  const excludeItemIds = useMemo(() => {
    return standards?.map((s: any) => s.item_id) || []
  }, [standards])

  // Group standards by category for better display
  const groupedStandards = useMemo(() => {
    if (!standards || standards.length === 0) return []
    
    const groups: Record<string, { categoryName: string; categoryColor: string | null; items: any[] }> = {}
    
    standards.forEach((standard: any) => {
      const catName = standard.category_name || 'Khác'
      if (!groups[catName]) {
        // Find category color from categories list
        const category = categories?.find((c: any) => c.name === catName)
        groups[catName] = {
          categoryName: catName,
          categoryColor: category?.color || null,
          items: []
        }
      }
      groups[catName].items.push(standard)
    })
    
    // Sort groups by category name
    return Object.values(groups).sort((a, b) => a.categoryName.localeCompare(b.categoryName))
  }, [standards, categories])

  const handleAddItem = async (itemId: string, quantity: number) => {
    if (!itemId || quantity < 1) {
      toast.error(t('standards.validation.selectAsset'))
      return
    }

    try {
      await addStandard.mutateAsync({
        roomType: selectedRoomType,
        itemId,
        quantity,
      })
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleRemoveItem = async (standardId: string) => {
    try {
      await deleteStandard.mutateAsync({
        id: standardId,
        roomType: selectedRoomType,
      })
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleUpdateQuantity = async (standardId: string, quantity: number) => {
    if (quantity < 1) return

    try {
      await updateStandard.mutateAsync({
        id: standardId,
        quantity,
        roomType: selectedRoomType,
      })
    } catch (error) {
      // Error handled by mutation
    }
  }
  const handleCloneStandards = async (sourceRoomType: RoomType) => {
    await cloneStandards.mutateAsync({
      sourceRoomType,
      targetRoomType: selectedRoomType,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/rooms')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t('standards.title')}</h1>
            <p className="text-muted-foreground">
              {t('standards.description')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Standards */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle>{t('standards.currentStandards', 'Danh sách chuẩn')}</CardTitle>
              <div className="flex items-center gap-2">
                <CloneStandardsDialog
                  currentRoomType={selectedRoomType}
                  currentStandardsCount={standards?.length || 0}
                  onClone={handleCloneStandards}
                />
                <Select value={selectedRoomType} onValueChange={(value) => setSelectedRoomType(value as RoomType)}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_TYPE_KEYS.map((typeKey) => (
                      <SelectItem key={typeKey} value={typeKey}>
                        {t(`roomTypes.${typeKey}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">{t('standards.loading')}</div>
            ) : groupedStandards.length > 0 ? (
              <div className="divide-y">
                {groupedStandards.map((group) => (
                  <div key={group.categoryName}>
                    {/* Category Header */}
                    <div 
                      className="sticky top-0 px-4 py-2 bg-muted/50 border-b flex items-center gap-2"
                      style={{
                        borderLeftWidth: '4px',
                        borderLeftColor: group.categoryColor || 'hsl(var(--muted-foreground))',
                      }}
                    >
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: group.categoryColor || 'hsl(var(--muted-foreground))' }}
                      />
                      <span className="font-medium text-sm">{group.categoryName}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {group.items.length}
                      </Badge>
                    </div>
                    
                    {/* Items in this category */}
                    <div className="divide-y">
                      {group.items.map((standard: any) => {
                        const itemType = (standard.item_type || 'equipment') as ItemType
                        const typeConfig = ITEM_TYPE_CONFIG[itemType]
                        const TypeIcon = typeConfig.icon
                        
                        return (
                          <div 
                            key={standard.id} 
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
                          >
                            {/* Item Type Icon */}
                            <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${typeConfig.bgColor}`}>
                              <TypeIcon className={`h-3.5 w-3.5 ${typeConfig.color}`} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm truncate">{standard.item_name}</p>
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 shrink-0 ${typeConfig.color} border-current`}>
                                  {typeConfig.label}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground font-mono truncate">
                                {standard.item_code}
                              </p>
                            </div>
                            <Input
                              type="number"
                              min="1"
                              value={standard.quantity}
                              onChange={(e) =>
                                handleUpdateQuantity(
                                  standard.id,
                                  parseInt(e.target.value) || 1
                                )
                              }
                              className="w-16 h-8 text-center shrink-0"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={() => handleRemoveItem(standard.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {t('standards.empty')}
              </div>
            )}

            {groupedStandards.length > 0 && (
              <div className="p-4 border-t bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  <strong>{t('standards.noteLabel')}:</strong> {t('standards.note', { type: t(`roomTypes.${selectedRoomType}`) })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Item Picker */}
        <Card>
          <CardHeader>
            <CardTitle>{t('standards.addAsset', 'Thêm tài sản')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <RoomStandardItemPicker
              items={items}
              categories={categories || []}
              excludeItemIds={excludeItemIds}
              onAdd={handleAddItem}
              isLoading={isLoadingItems}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
