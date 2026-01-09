import { UseFormReturn } from 'react-hook-form';
import { Shirt, Droplets, Tv, Armchair, AlertCircle, Search, CheckCircle2 } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { 
  RoomCheckFormData, 
  RoomItemWithDetails, 
  LaundryItem, 
  ConsumedItem, 
  LostItem, 
  ReplacedItem,
  DamagedItem
} from '@/types/rooms.types';
import type { ItemType } from '@/types/items.types';
import { LinenTab, ConsumableTabBooking, EquipmentTab, FurnitureTab } from './item-type-tabs';

interface ItemsCheckStepProps {
  form: UseFormReturn<RoomCheckFormData>;
  items: RoomItemWithDetails[];
  roomId: string;
  hotelId: string;
  tenantId: string;
  bookingId?: string | null;
  onQuantitiesChange?: (quantities: Record<string, number>) => void;
}

// DamagedItem now imported from types

interface MissingItem {
  item_id: string;
  item_name: string;
  item_code?: string;
  item_type: 'linen' | 'consumable' | 'equipment' | 'furniture';
  missing_quantity: number;
  standard_quantity: number;
}

// Extended RoomItemWithDetails to include item_type and category_name
interface ExtendedRoomItem extends RoomItemWithDetails {
  item_type?: ItemType;
  category_name?: string | null;
}

export function ItemsCheckStep({
  form,
  items,
  roomId,
  hotelId,
  tenantId,
  bookingId,
  onQuantitiesChange
}: ItemsCheckStepProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('linen');
  const { toast } = useToast();

  // Track checked items
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  // State for tracking items by action
  const [laundryItems, setLaundryItems] = useState<LaundryItem[]>([]);
  const [consumedItems, setConsumedItems] = useState<ConsumedItem[]>([]);
  const [lostItems, setLostItems] = useState<LostItem[]>([]);
  const [replacedItems, setReplacedItems] = useState<ReplacedItem[]>([]);
  const [damagedItems, setDamagedItems] = useState<DamagedItem[]>([]);
  const [missingItems, setMissingItems] = useState<MissingItem[]>([]);

  // Fetch item_type and category_name for each item
  const [itemsWithType, setItemsWithType] = useState<ExtendedRoomItem[]>([]);

  useEffect(() => {
    const fetchItemTypesAndCategories = async () => {
      if (items.length === 0) return;
      
      const itemIds = items.map(i => i.item_id);
      const { data } = await supabase
        .from('items')
        .select('id, item_type, category_id, item_categories(name)')
        .in('id', itemIds);
      
      if (data) {
        const itemMap = new Map(data.map(d => [d.id, {
          item_type: d.item_type,
          category_name: (d.item_categories as any)?.name || null
        }]));
        setItemsWithType(items.map(item => {
          const itemData = itemMap.get(item.item_id);
          return {
            ...item,
            item_type: (itemData?.item_type as ItemType) || 'equipment',
            category_name: itemData?.category_name || null
          };
        }));
      } else {
        setItemsWithType(items.map(item => ({ 
          ...item, 
          item_type: 'equipment' as ItemType,
          category_name: null 
        })));
      }
    };

    fetchItemTypesAndCategories();
  }, [items]);

  // Filter items by type
  const linenItems = useMemo(() => 
    itemsWithType.filter(i => i.item_type === 'linen'), [itemsWithType]);
  const consumableItemsList = useMemo(() => 
    itemsWithType.filter(i => i.item_type === 'consumable'), [itemsWithType]);
  const equipmentItems = useMemo(() => 
    itemsWithType.filter(i => i.item_type === 'equipment'), [itemsWithType]);
  const furnitureItems = useMemo(() => 
    itemsWithType.filter(i => i.item_type === 'furniture'), [itemsWithType]);

  // Apply search filter
  const filterBySearch = (items: ExtendedRoomItem[]) => {
    if (!search) return items;
    return items.filter(item => 
      item.item_name.toLowerCase().includes(search.toLowerCase()) ||
      item.item_code.toLowerCase().includes(search.toLowerCase())
    );
  };

  // Update form whenever tracked items change
  useEffect(() => {
    form.setValue('items_sent_to_laundry', laundryItems)
    form.setValue('items_consumed', consumedItems)
    form.setValue('items_lost', lostItems)
    form.setValue('items_replaced', replacedItems)
    form.setValue('items_damaged', damagedItems as any)

    // Build items_missing with real shortages (laundry not yet replaced, lost, consumables needing refill, shortage items)
    const replacedQtyMap = replacedItems.reduce<Record<string, number>>((acc, it) => {
      acc[it.item_id] = (acc[it.item_id] || 0) + (it.quantity || 0)
      return acc
    }, {})

    const laundryMissing = laundryItems
      .map((it) => {
        const replacedQty = replacedQtyMap[it.item_id] || 0
        const shortage = Math.max(0, (it.quantity || 0) - replacedQty)
        return shortage > 0
          ? {
              item_id: it.item_id,
              item_name: it.item_name,
              item_code: it.item_code,
              shortage,
              reason: 'laundry',
            }
          : null
      })
      .filter(Boolean) as any[]

    const lostMissing = lostItems.map((it) => ({
      item_id: it.item_id,
      item_name: it.item_name,
      item_code: it.item_code,
      shortage: it.quantity,
      reason: 'lost',
    })) as any[]

    const consumedMissing = consumedItems
      .filter((it) => it.need_refill)
      .map((it) => ({
        item_id: it.item_id,
        item_name: it.item_name,
        item_code: it.item_code,
        shortage: it.quantity,
        reason: 'consumed',
      })) as any[]

    // Add shortage from missingItems (items marked as "Thiếu đồ")
    const shortageMissing = missingItems
      .filter(it => it.missing_quantity > 0)
      .map((it) => ({
        item_id: it.item_id,
        item_name: it.item_name,
        item_code: it.item_code,
        shortage: it.missing_quantity,
        reason: 'shortage',
      })) as any[]

    const itemsMissingCalculated = [...laundryMissing, ...lostMissing, ...consumedMissing, ...shortageMissing]
    form.setValue('items_missing', itemsMissingCalculated as any)

    // items_complete should be false when room is missing items or has damaged items
    const hasIssues = itemsMissingCalculated.length > 0 || damagedItems.length > 0
    form.setValue('items_complete', !hasIssues)
  }, [laundryItems, consumedItems, lostItems, replacedItems, damagedItems, missingItems, form])


  // Handler for Linen status change (OK/Laundry/Add/Change/Lost/Missing)
  const handleLinenStatusChange = (
    item: RoomItemWithDetails, 
    status: 'ok' | 'laundry' | 'add' | 'change' | 'lost' | 'missing', 
    quantity: number
  ) => {
    if (status === 'laundry') {
      // Only add to laundry (collect dirty, replace later)
      setLaundryItems(prev => [...prev, {
        item_id: item.item_id,
        item_name: item.item_name,
        item_code: item.item_code,
        quantity,
      }]);
      toast({ title: 'Lấy giặt', description: `${quantity}x ${item.item_name} - Sẽ thay đồ sạch sau` });
    } else if (status === 'add') {
      // Only add to replaced (setup new room, add clean items only)
      setReplacedItems(prev => [...prev, {
        item_id: item.item_id,
        item_name: item.item_name,
        item_code: item.item_code,
        quantity,
        from_stock: true,
      }]);
      toast({ title: 'Bổ sung đồ', description: `${quantity}x ${item.item_name} - Đặt đồ sạch vào phòng` });
    } else if (status === 'change') {
      // Add to both laundry AND replaced
      setLaundryItems(prev => [...prev, {
        item_id: item.item_id,
        item_name: item.item_name,
        item_code: item.item_code,
        quantity,
      }]);
      setReplacedItems(prev => [...prev, {
        item_id: item.item_id,
        item_name: item.item_name,
        item_code: item.item_code,
        quantity,
        from_stock: true,
      }]);
      toast({ title: 'Thay đổi đồ vải', description: `${quantity}x ${item.item_name} - Lấy giặt & thay sạch` });
    } else if (status === 'lost') {
      setLostItems(prev => [...prev, {
        item_id: item.item_id,
        item_name: item.item_name,
        item_code: item.item_code,
        item_type: 'linen',
        quantity,
      }]);
      toast({ title: 'Đã đánh dấu mất', description: `${quantity}x ${item.item_name}`, variant: 'destructive' });
    } else if (status === 'missing') {
      // Update or add to missingItems
      setMissingItems(prev => {
        const existing = prev.find(i => i.item_id === item.item_id);
        if (existing) {
          return prev.map(i => i.item_id === item.item_id 
            ? { ...i, missing_quantity: quantity } 
            : i
          );
        }
        return [...prev, {
          item_id: item.item_id,
          item_name: item.item_name,
          item_code: item.item_code,
          item_type: 'linen',
          missing_quantity: quantity,
          standard_quantity: item.standard_quantity,
        }];
      });
      toast({ title: 'Thiếu đồ', description: `${item.item_name}: thiếu ${quantity}` });
    }
  };

  // Reset linen status (remove from all lists)
  const resetLinenStatus = (itemId: string) => {
    setLaundryItems(prev => prev.filter(i => i.item_id !== itemId));
    setReplacedItems(prev => prev.filter(i => i.item_id !== itemId));
    setLostItems(prev => prev.filter(i => i.item_type === 'linen' ? i.item_id !== itemId : true));
    setMissingItems(prev => prev.filter(i => i.item_id !== itemId));
  };

  // Handlers for Consumable
  const handleMarkConsumed = (item: RoomItemWithDetails, quantity: number, needRefill: boolean) => {
    setConsumedItems(prev => [...prev, {
      item_id: item.item_id,
      item_name: item.item_name,
      item_code: item.item_code,
      quantity,
      need_refill: needRefill,
    }]);
    toast({ title: 'Đã ghi nhận sử dụng', description: `${quantity}x ${item.item_name}` });
  };

  // Handlers for Equipment/Furniture
  const handleEquipmentLost = (item: RoomItemWithDetails, quantity: number, estimatedValue?: number) => {
    const extendedItem = itemsWithType.find(i => i.item_id === item.item_id);
    setLostItems(prev => [...prev, {
      item_id: item.item_id,
      item_name: item.item_name,
      item_code: item.item_code,
      item_type: extendedItem?.item_type || 'equipment',
      quantity,
      estimated_value: estimatedValue,
    }]);
    toast({ title: 'Đã đánh dấu mất', description: item.item_name, variant: 'destructive' });
  };

  const handleMarkDamaged = (item: RoomItemWithDetails, damageInfo: { damage_type: 'repairable' | 'replacement_needed'; damage_cost: number; notes?: string }) => {
    setDamagedItems(prev => [...prev, {
      item_id: item.item_id,
      item_name: item.item_name,
      item_code: item.item_code,
      quantity: 1,
      damage_type: damageInfo.damage_type,
      damage_cost: damageInfo.damage_cost,
      notes: damageInfo.notes,
    }]);
    toast({ title: 'Đã đánh dấu hỏng', description: `${item.item_name} - ${damageInfo.damage_type === 'repairable' ? 'Cần sửa' : 'Cần thay'}` });
  };

  // Remove handlers
  const removeFromLaundry = (itemId: string) => {
    setLaundryItems(prev => prev.filter(i => i.item_id !== itemId));
  };

  const removeFromLost = (itemId: string) => {
    setLostItems(prev => prev.filter(i => i.item_id !== itemId));
  };

  const removeFromReplaced = (itemId: string) => {
    setReplacedItems(prev => prev.filter(i => i.item_id !== itemId));
  };

  const removeFromConsumed = (itemId: string) => {
    setConsumedItems(prev => prev.filter(i => i.item_id !== itemId));
  };

  const removeFromDamaged = (itemId: string) => {
    setDamagedItems(prev => prev.filter(i => i.item_id !== itemId));
  };

  // Count badges
  const getTabCount = (type: string) => {
    switch (type) {
      case 'linen': return linenItems.length;
      case 'consumable': return consumableItemsList.length;
      case 'equipment': return equipmentItems.length;
      case 'furniture': return furnitureItems.length;
      default: return 0;
    }
  };

  const getIssueCount = () => {
    return lostItems.length + damagedItems.length;
  };

  const getActionCount = () => {
    return laundryItems.length + consumedItems.length + replacedItems.length;
  };

  // Calculate total checked items (items with any status set)
  const getCheckedCount = () => {
    const allTrackedIds = new Set([
      ...laundryItems.map(i => i.item_id),
      ...consumedItems.map(i => i.item_id),
      ...lostItems.map(i => i.item_id),
      ...replacedItems.map(i => i.item_id),
      ...damagedItems.map(i => i.item_id),
      ...missingItems.map(i => i.item_id),
      ...checkedItems
    ]);
    return allTrackedIds.size;
  };

  const totalItems = itemsWithType.length;
  const checkedCount = getCheckedCount();
  const progressPercent = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Sticky Progress Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur -mx-4 px-4 py-2 border-b">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className={`h-4 w-4 ${progressPercent === 100 ? 'text-success' : 'text-muted-foreground'}`} />
            <span className="font-medium">
              {checkedCount}/{totalItems}
            </span>
            <span className="text-muted-foreground text-xs">items đã kiểm tra</span>
          </div>
          <Progress value={progressPercent} className="w-24 h-2" />
          {progressPercent === 100 && (
            <Badge variant="outline" className="border-success text-success bg-success/10 text-xs">
              Hoàn thành
            </Badge>
          )}
        </div>
      </div>

      {/* Summary Alert */}
      {(getIssueCount() > 0 || getActionCount() > 0) && (
        <Alert variant={getIssueCount() > 0 ? 'destructive' : 'default'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-wrap gap-2">
            {laundryItems.length > 0 && (
              <Badge variant="secondary">{laundryItems.length} lấy giặt</Badge>
            )}
            {consumedItems.length > 0 && (
              <Badge variant="secondary">{consumedItems.length} đã dùng</Badge>
            )}
            {replacedItems.length > 0 && (
              <Badge variant="secondary">{replacedItems.length} đã thay</Badge>
            )}
            {lostItems.length > 0 && (
              <Badge variant="destructive">{lostItems.length} mất</Badge>
            )}
            {damagedItems.length > 0 && (
              <Badge variant="outline" className="border-warning text-warning">
                {damagedItems.length} hỏng
              </Badge>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm kiếm đồ dùng..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs by Item Type */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="linen" className="flex items-center gap-1 text-xs sm:text-sm">
            <Shirt className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Đồ vải</span>
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {getTabCount('linen')}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="consumable" className="flex items-center gap-1 text-xs sm:text-sm">
            <Droplets className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Tiêu hao</span>
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {getTabCount('consumable')}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="equipment" className="flex items-center gap-1 text-xs sm:text-sm">
            <Tv className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Thiết bị</span>
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {getTabCount('equipment')}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="furniture" className="flex items-center gap-1 text-xs sm:text-sm">
            <Armchair className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Nội thất</span>
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {getTabCount('furniture')}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="linen" className="mt-4">
          <LinenTab
            items={filterBySearch(linenItems)}
            laundryItems={laundryItems}
            lostItems={lostItems.filter(i => i.item_type === 'linen')}
            replacedItems={replacedItems}
            onLinenStatusChange={handleLinenStatusChange}
            onResetStatus={resetLinenStatus}
          />
        </TabsContent>

        <TabsContent value="consumable" className="mt-4">
          <ConsumableTabBooking
            items={filterBySearch(consumableItemsList)}
            bookingId={bookingId || null}
            roomId={roomId}
            tenantId={tenantId}
            consumedItems={consumedItems}
            onMarkConsumed={handleMarkConsumed}
            onRemoveConsumed={removeFromConsumed}
          />
        </TabsContent>

        <TabsContent value="equipment" className="mt-4">
          <EquipmentTab
            items={filterBySearch(equipmentItems)}
            lostItems={lostItems.filter(i => i.item_type === 'equipment')}
            damagedItems={damagedItems}
            onMarkLost={handleEquipmentLost}
            onMarkDamaged={handleMarkDamaged}
            onRemoveFromLost={removeFromLost}
            onRemoveFromDamaged={removeFromDamaged}
          />
        </TabsContent>

        <TabsContent value="furniture" className="mt-4">
          <FurnitureTab
            items={filterBySearch(furnitureItems)}
            lostItems={lostItems.filter(i => i.item_type === 'furniture')}
            damagedItems={damagedItems}
            onMarkLost={(item, qty) => handleEquipmentLost(item, qty)}
            onMarkDamaged={handleMarkDamaged}
            onRemoveFromLost={removeFromLost}
            onRemoveFromDamaged={removeFromDamaged}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
