import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
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

const ROOM_TYPE_KEYS: RoomType[] = ['standard', 'deluxe', 'suite', 'vip']

export function RoomStandardsPage() {
  const { t } = useTranslation('rooms')
  const navigate = useNavigate()
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType>('standard')

  const { data: standards, isLoading } = useRoomStandards(selectedRoomType)
  const { data: categories } = useCategories()
  const { data: itemsData } = useItems({ status: 'active' }, 1, 1000)
  const items = itemsData?.items || []
  const addStandard = useAddStandard()
  const updateStandard = useUpdateStandard()
  const deleteStandard = useDeleteStandard()

  const [newItem, setNewItem] = useState({
    item_id: '',
    quantity: 1,
  })

  const handleAddItem = async () => {
    if (!newItem.item_id || newItem.quantity < 1) {
      toast.error(t('standards.validation.selectAsset'))
      return
    }

    try {
      await addStandard.mutateAsync({
        roomType: selectedRoomType,
        itemId: newItem.item_id,
        quantity: newItem.quantity,
      })
      setNewItem({ item_id: '', quantity: 1 })
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('standards.roomType')}</CardTitle>
            <Select value={selectedRoomType} onValueChange={(value) => setSelectedRoomType(value as RoomType)}>
              <SelectTrigger className="w-48">
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
                    <TableHead>{t('standards.table.code')}</TableHead>
                    <TableHead>{t('standards.table.category')}</TableHead>
                    <TableHead className="text-right">{t('standards.table.quantity')}</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standards && standards.length > 0 ? (
                    standards.map((standard: any) => (
                      <TableRow key={standard.id}>
                        <TableCell className="font-medium">
                          {standard.item_name}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">
                            {standard.item_code}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {standard.category_name}
                          </Badge>
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
                            className="w-20 ml-auto"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(standard.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="text-muted-foreground">
                          {t('standards.empty')}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Add new item row */}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={3}>
                      <Select
                        value={newItem.item_id}
                        onValueChange={(value) =>
                          setNewItem({ ...newItem, item_id: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('standards.addAsset')} />
                        </SelectTrigger>
                        <SelectContent>
                          {categories?.map((category) => {
                            const categoryItems = items.filter(
                              (item) => item.category_id === category.id
                            )
                            
                            if (categoryItems.length === 0) return null
                            
                            return (
                              <div key={category.id}>
                                <SelectItem value={category.id} disabled>
                                  <span className="font-semibold">{category.name}</span>
                                </SelectItem>
                                {categoryItems.map((item) => (
                                  <SelectItem key={item.id} value={item.id} className="pl-6">
                                    {item.name} ({item.code})
                                  </SelectItem>
                                ))}
                              </div>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="1"
                        value={newItem.quantity}
                        onChange={(e) =>
                          setNewItem({
                            ...newItem,
                            quantity: parseInt(e.target.value) || 1,
                          })
                        }
                        className="w-20 ml-auto"
                      />
                    </TableCell>
                    <TableCell>
                      <Button size="sm" onClick={handleAddItem}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>{t('standards.noteLabel')}:</strong> {t('standards.note', { type: t(`roomTypes.${selectedRoomType}`) })}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
