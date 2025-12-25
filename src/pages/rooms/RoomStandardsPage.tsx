import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useRoomStandards, useUpdateStandard, useDeleteStandard, useAddStandard } from '@/hooks/useRoomStandards'
import type { RoomType } from '@/types/rooms.types'
import { useCategories } from '@/hooks/useCategories'
import { useItems } from '@/hooks/useItems'
import { toast } from 'sonner'
import { RoomStandardItemPicker } from '@/components/rooms/RoomStandardItemPicker'

const ROOM_TYPE_KEYS: RoomType[] = ['standard', 'deluxe', 'suite', 'vip']

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

  // Get list of item IDs already in standards
  const excludeItemIds = useMemo(() => {
    return standards?.map((s: any) => s.item_id) || []
  }, [standards])

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
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('standards.currentStandards', 'Danh sách chuẩn')}</CardTitle>
              <Select value={selectedRoomType} onValueChange={(value) => setSelectedRoomType(value as RoomType)}>
                <SelectTrigger className="w-40">
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
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">{t('standards.loading')}</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('standards.table.asset')}</TableHead>
                      <TableHead className="text-right w-24">{t('standards.table.quantity')}</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {standards && standards.length > 0 ? (
                      standards.map((standard: any) => (
                        <TableRow key={standard.id}>
                          <TableCell>
                            <div>
                              <span className="font-medium">{standard.item_name}</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-muted-foreground font-mono">
                                  {standard.item_code}
                                </span>
                                <Badge variant="outline" className="text-xs h-5">
                                  {standard.category_name}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
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
                              className="w-16 h-8 text-center ml-auto"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleRemoveItem(standard.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8">
                          <div className="text-muted-foreground">
                            {t('standards.empty')}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>{t('standards.noteLabel')}:</strong> {t('standards.note', { type: t(`roomTypes.${selectedRoomType}`) })}
                  </p>
                </div>
              </>
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
