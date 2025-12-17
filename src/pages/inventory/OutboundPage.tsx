import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, AlertTriangle, Info, Users } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ItemSelect } from '@/components/shared/ItemSelect';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { LaundryVendorSelect } from '@/components/shared/LaundryVendorSelect';
import { MaintenanceRequestSelect } from '@/components/shared/MaintenanceRequestSelect';
import { RoomMultiSelect } from '@/components/distribution/RoomMultiSelect';
import { DistributionItemMatrix, RoomItemAllocation, StockValidation } from '@/components/distribution/DistributionItemMatrix';
import { useCreateOutboundTransaction } from '@/hooks/useInventoryTransactions';
import { useCreateDistributionOrder } from '@/hooks/useDistributionOrders';
import { useUsers } from '@/hooks/useUsers';
import { useBreakpoint } from '@/lib/breakpoints';
import { MobileOutboundForm } from '@/components/inventory/MobileOutboundForm';

// Schema cho các category không phải room_assign
const createOutboundSchema = (t: (key: string) => string) => z.object({
  transaction_category: z.enum(['room_assign', 'laundry', 'maintenance', 'disposal', 'other']),
  from_location: z.string().min(1, t('inventory:validation.fromRequired')),
  to_location: z.string().optional(),
  vendor_id: z.string().uuid().optional(),
  maintenance_request_id: z.string().uuid().optional(),
  items: z.array(z.object({
    item_id: z.string().uuid(t('inventory:validation.itemRequired')),
    quantity: z.number().min(1, t('inventory:validation.quantityMin')),
    available_quantity: z.number(),
    notes: z.string().optional()
  })).optional(),
  recipient_name: z.string().optional(),
  photos: z.array(z.string()).optional(),
  notes: z.string().optional(),
}).refine(data => {
  // Skip item validation for room_assign (handled separately)
  if (data.transaction_category === 'room_assign') return true;
  return data.items && data.items.length > 0;
}, {
  message: t('inventory:validation.itemsMin'),
  path: ['items']
}).refine(data => {
  if (data.transaction_category === 'room_assign') return true;
  return data.items?.every(item => item.quantity <= item.available_quantity) ?? true;
}, {
  message: t('inventory:outbound.stockError'),
  path: ['items']
}).refine(data => {
  if (data.transaction_category === 'laundry') return !!data.vendor_id;
  if (data.transaction_category === 'maintenance') return !!data.maintenance_request_id || !!data.to_location;
  return true;
}, {
  message: t('inventory:validation.destinationRequired'),
  path: ['to_location']
});

type OutboundFormData = {
  transaction_category: 'room_assign' | 'laundry' | 'maintenance' | 'disposal' | 'other';
  from_location: string;
  to_location?: string;
  vendor_id?: string;
  maintenance_request_id?: string;
  items?: Array<{
    item_id: string;
    quantity: number;
    available_quantity: number;
    notes?: string;
  }>;
  recipient_name?: string;
  photos?: string[];
  notes?: string;
};

export function OutboundPage() {
  const { t } = useTranslation(['inventory', 'common', 'distribution'])
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  
  // Distribution states for room_assign
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [allocations, setAllocations] = useState<RoomItemAllocation[]>([]);
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [distributionNotes, setDistributionNotes] = useState('');
  const [stockValidation, setStockValidation] = useState<StockValidation>({ isValid: true, overStockItems: [] });
  
  // Create schema with translations
  const outboundSchema = createOutboundSchema(t);
  
  // ALL hooks MUST be declared BEFORE any conditional returns
  const { mutate: createOutbound, isPending: isLoading } = useCreateOutboundTransaction();
  const { mutate: createDistributionOrder, isPending: isDistributionLoading } = useCreateDistributionOrder();
  const { users } = useUsers();
  
  // Filter staff users for assignment
  const staffUsers = users?.filter(u => 
    u.user_level_code === 'staff' || u.user_level_code === 'manager'
  ) || [];
  
  const form = useForm<OutboundFormData>({
    resolver: zodResolver(outboundSchema),
    defaultValues: {
      transaction_category: 'room_assign',
      from_location: t('inventory:outbound.placeholders.defaultWarehouse'),
      to_location: '',
      vendor_id: undefined,
      maintenance_request_id: undefined,
      items: [{
        item_id: '',
        quantity: 1,
        available_quantity: 0,
        notes: ''
      }],
      recipient_name: '',
      photos: [],
      notes: '',
    }
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  });
  
  const formItems = form.watch('items') || [];
  const category = form.watch('transaction_category');
  const totalQuantity = formItems.reduce((sum, item) => sum + item.quantity, 0);
  const hasStockError = formItems.some(item => item.quantity > item.available_quantity);
  const lowStockWarnings = formItems.filter(item => item.available_quantity > 0 && item.available_quantity - item.quantity < 10);
  
  const handleStockValidationChange = useCallback((validation: StockValidation) => {
    setStockValidation(validation);
  }, []);

  // Mobile view - AFTER all hooks
  if (isMobile) {
    return <MobileOutboundForm />;
  }
  
  const onSubmit = (data: OutboundFormData) => {
    if (data.transaction_category === 'room_assign') {
      // Use Distribution Order for room assignments
      if (selectedRoomIds.length === 0) {
        return;
      }
      
      createDistributionOrder({
        assigned_to: assignedTo || undefined,
        notes: distributionNotes || undefined,
        rooms: allocations.filter(a => a.items.length > 0),
      }, {
        onSuccess: (result) => {
          navigate(`/inventory/distributions/${result.order_id}`);
        }
      });
    } else {
      // Use regular outbound for other categories
      createOutbound(data as any, {
        onSuccess: () => {
          navigate('/inventory/transactions');
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t('inventory:outbound.title')} description={t('inventory:outbound.description')}>
        <Button variant="outline" onClick={() => navigate('/inventory')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common:back')}
        </Button>
      </PageHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('inventory:outbound.generalInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField 
                control={form.control} 
                name="transaction_category" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inventory:outbound.type')} *</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('inventory:outbound.type')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="room_assign">🏠 {t('inventory:outbound.toRoom')}</SelectItem>
                          <SelectItem value="laundry">🧺 {t('inventory:outbound.toLaundry')}</SelectItem>
                          <SelectItem value="maintenance">🔧 {t('inventory:outbound.toMaintenance')}</SelectItem>
                          <SelectItem value="disposal">🗑️ {t('inventory:outbound.toDisposal')}</SelectItem>
                          <SelectItem value="other">➖ {t('inventory:outbound.toOther')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} 
              />
              
              <div className="grid gap-4 md:grid-cols-2">
                <FormField 
                  control={form.control} 
                  name="from_location" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('inventory:outbound.fromLocation')} *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('inventory:outbound.placeholders.fromLocation')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
                
                {/* Dynamic destination field based on category - NOT for room_assign */}

                {category === 'laundry' && (
                  <FormField 
                    control={form.control} 
                    name="vendor_id" 
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('inventory:outbound.selectVendor')} *</FormLabel>
                        <FormControl>
                          <LaundryVendorSelect
                            value={field.value || ''}
                            onChange={(value) => field.onChange(value)}
                            placeholder={t('inventory:outbound.placeholders.selectVendor')}
                          />
                        </FormControl>
                        <FormDescription>
                          <Info className="h-3 w-3 inline mr-1" />
                          {t('inventory:outbound.laundryDescription')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />
                )}

                {category === 'maintenance' && (
                  <FormField 
                    control={form.control} 
                    name="maintenance_request_id" 
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('inventory:outbound.selectMaintenanceRequest')}</FormLabel>
                        <FormControl>
                          <MaintenanceRequestSelect
                            value={field.value || ''}
                            onChange={(value) => field.onChange(value)}
                            placeholder={t('inventory:outbound.placeholders.selectMaintenanceRequest')}
                          />
                        </FormControl>
                        <FormDescription>
                          <Info className="h-3 w-3 inline mr-1" />
                          {t('inventory:outbound.maintenanceDescription')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />
                )}

                {(category === 'disposal' || category === 'other') && (
                  <FormField 
                    control={form.control} 
                    name="to_location" 
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('inventory:outbound.toLocation')} *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('inventory:outbound.placeholders.toLocation')} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Distribution Form for room_assign */}
          {category === 'room_assign' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t('distribution:createOrder.title')}
                </CardTitle>
                <CardDescription>
                  {t('distribution:createOrder.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Step 1: Select rooms */}
                <div className="space-y-2">
                  <Label>{t('distribution:createOrder.selectRooms')} *</Label>
                  <RoomMultiSelect
                    selectedRoomIds={selectedRoomIds}
                    onSelectionChange={setSelectedRoomIds}
                    maxHeight="250px"
                  />
                </div>
                
                {/* Step 2: Item allocation matrix */}
                <div className="space-y-2">
                  <Label>{t('distribution:createOrder.itemAllocation')}</Label>
                  <DistributionItemMatrix
                    selectedRoomIds={selectedRoomIds}
                    allocations={allocations}
                    onAllocationsChange={setAllocations}
                    onStockValidationChange={handleStockValidationChange}
                  />
                </div>
                
                {/* Stock validation warnings */}
                {!stockValidation.isValid && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {t('distribution:createOrder.stockExceeded')}:
                      <ul className="mt-2 list-disc list-inside">
                        {stockValidation.overStockItems.map(item => (
                          <li key={item.itemId}>
                            {item.itemName}: {t('distribution:createOrder.requested')} {item.requested}, {t('distribution:createOrder.available')} {item.available}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Step 3: Assignee and notes */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('distribution:createOrder.assignTo')}</Label>
                    <Select value={assignedTo} onValueChange={setAssignedTo}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('distribution:createOrder.selectStaff')} />
                      </SelectTrigger>
                      <SelectContent>
                        {staffUsers.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name} ({user.position?.name || user.user_level_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('distribution:createOrder.notes')}</Label>
                    <Textarea 
                      value={distributionNotes}
                      onChange={(e) => setDistributionNotes(e.target.value)}
                      placeholder={t('distribution:createOrder.notesPlaceholder')}
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Items Card - for non room_assign categories */}
          {category !== 'room_assign' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t('inventory:outbound.itemsToOutbound')}</CardTitle>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => append({
                      item_id: '',
                      quantity: 1,
                      available_quantity: 0,
                      notes: ''
                    })}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t('inventory:outbound.addItem')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {fields.map((field, index) => {
                    const currentItem = formItems[index];
                    const hasError = currentItem?.quantity > currentItem?.available_quantity;
                    const willBeLowStock = currentItem?.available_quantity > 0 && currentItem?.available_quantity - currentItem?.quantity < 10;
                    
                    return (
                      <Card key={field.id} className="relative">
                        <CardContent className="pt-6">
                          {fields.length > 1 && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="absolute right-2 top-2" 
                              onClick={() => remove(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <div className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <FormField 
                                control={form.control} 
                                name={`items.${index}.item_id`} 
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>{t('inventory:fields.item')} *</FormLabel>
                                    <FormControl>
                                      <ItemSelect 
                                        value={field.value} 
                                        onChange={(value, item) => {
                                          field.onChange(value);
                                          if (item) {
                                            form.setValue(`items.${index}.available_quantity`, item.quantity_in_stock);
                                          }
                                        }} 
                                        placeholder={t('inventory:outbound.selectItem')} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )} 
                              />
                              
                              <FormField 
                                control={form.control} 
                                name={`items.${index}.quantity`} 
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>{t('inventory:outbound.quantityToOutbound')} *</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        placeholder="0" 
                                        max={currentItem?.available_quantity} 
                                        {...field} 
                                        onChange={e => field.onChange(parseInt(e.target.value) || 0)} 
                                        className={hasError ? 'border-destructive' : ''} 
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      {t('inventory:outbound.stockAvailable')}: <span className="font-bold">{currentItem?.available_quantity || 0}</span>
                                      {currentItem?.available_quantity > 0 && (
                                        <>
                                          {' '}• {t('inventory:outbound.remaining')}:{' '}
                                          <span className={willBeLowStock ? 'text-orange-600 font-bold' : ''}>
                                            {(currentItem?.available_quantity || 0) - (currentItem?.quantity || 0)}
                                          </span>
                                        </>
                                      )}
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )} 
                              />
                            </div>
                            
                            {hasError && (
                              <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                  {t('inventory:outbound.exceedStock')}
                                </AlertDescription>
                              </Alert>
                            )}
                            
                            {!hasError && willBeLowStock && (
                              <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                  ⚠️ {t('inventory:outbound.lowStockWarning')}
                                </AlertDescription>
                              </Alert>
                            )}
                            
                            <FormField 
                              control={form.control} 
                              name={`items.${index}.notes`} 
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>{t('inventory:outbound.itemNote')}</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder={t('inventory:outbound.placeholders.itemNote')} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Photos and Notes - for non room_assign categories */}
          {category !== 'room_assign' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{t('inventory:outbound.photos')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField 
                    control={form.control} 
                    name="photos" 
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <ImageUpload images={field.value || []} onChange={field.onChange} maxImages={10} />
                        </FormControl>
                        <FormDescription>
                          {t('inventory:outbound.photosDescription')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>{t('inventory:outbound.generalNotes')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField 
                    control={form.control} 
                    name="notes" 
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea {...field} placeholder={t('inventory:outbound.notesPlaceholder')} rows={4} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>{t('inventory:outbound.summary')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border p-4 text-center">
                      <p className="text-sm text-muted-foreground">{t('inventory:outbound.totalTypes')}</p>
                      <p className="text-3xl font-bold">{formItems.length}</p>
                    </div>
                    <div className="rounded-lg border p-4 text-center">
                      <p className="text-sm text-muted-foreground">{t('inventory:outbound.totalQuantity')}</p>
                      <p className="text-3xl font-bold text-blue-600">-{totalQuantity}</p>
                    </div>
                  </div>
                  
                  {lowStockWarnings.length > 0 && (
                    <Alert className="mt-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        ⚠️ {t('inventory:outbound.lowStockWarningCount', { count: lowStockWarnings.length })}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </>
          )}
          
          {/* Summary for room_assign */}
          {category === 'room_assign' && allocations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('distribution:createOrder.summary')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-sm text-muted-foreground">{t('distribution:createOrder.totalRooms')}</p>
                    <p className="text-3xl font-bold">{selectedRoomIds.length}</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-sm text-muted-foreground">{t('distribution:createOrder.totalItemTypes')}</p>
                    <p className="text-3xl font-bold">
                      {new Set(allocations.flatMap(a => a.items.map(i => i.item_id))).size}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-sm text-muted-foreground">{t('distribution:createOrder.totalUnits')}</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {allocations.reduce((sum, a) => sum + a.items.reduce((s, i) => s + i.quantity, 0), 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/inventory')}>
              {t('common:cancel')}
            </Button>
            {category === 'room_assign' ? (
              <Button 
                type="submit" 
                disabled={isDistributionLoading || !stockValidation.isValid || selectedRoomIds.length === 0 || allocations.length === 0}
              >
                {isDistributionLoading ? t('distribution:createOrder.creating') : t('distribution:createOrder.create')}
              </Button>
            ) : (
              <Button type="submit" disabled={isLoading || hasStockError}>
                {isLoading ? t('inventory:outbound.processing') : t('inventory:outbound.confirm')}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
