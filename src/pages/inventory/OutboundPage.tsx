import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, AlertTriangle, Info, Users, WashingMachine, Calendar, Scale, DollarSign } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { format, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { ItemSelect } from '@/components/shared/ItemSelect';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { LaundryVendorSelect } from '@/components/shared/LaundryVendorSelect';
import { MaintenanceRequestSelect } from '@/components/shared/MaintenanceRequestSelect';
import { DistributionForm } from '@/components/distribution/forms/DistributionForm';
import { useDistributionForm, RoomItemAllocation, StockValidation } from '@/components/distribution/hooks/useDistributionForm';
import { useCreateOutboundTransaction } from '@/hooks/useInventoryTransactions';
import { useCreateDistributionOrder } from '@/hooks/useDistributionOrders';
import { useCreateLaundryBatch } from '@/hooks/useLaundryBatches';
import { useLaundryVendors } from '@/hooks/useLaundryVendors';
import { useUsers } from '@/hooks/useUsers';
import { useItems } from '@/hooks/useItems';
import { useBreakpoint } from '@/lib/breakpoints';
import { MobileOutboundForm } from '@/components/inventory/MobileOutboundForm';
import { cn } from '@/lib/utils';

// Schema cho các category không phải room_assign
const createOutboundSchema = (t: (key: string) => string) => z.object({
  transaction_category: z.enum(['room_assign', 'laundry', 'maintenance', 'disposal', 'other']),
  from_location: z.string().min(1, t('inventory:validation.fromRequired')),
  to_location: z.string().optional(),
  vendor_id: z.string().uuid().optional(),
  maintenance_request_id: z.string().uuid().optional(),
  items: z.array(z.object({
    item_id: z.string().refine(val => val === '' || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val), {
      message: t('inventory:validation.itemRequired')
    }),
    quantity: z.number().min(1, t('inventory:validation.quantityMin')),
    available_quantity: z.number(),
    notes: z.string().optional()
  })).optional(),
  recipient_name: z.string().optional(),
  photos: z.array(z.string()).optional(),
  notes: z.string().optional(),
  // Laundry-specific fields
  delivery_date: z.date().optional(),
  expected_return_date: z.date().optional(),
  delivery_staff_id: z.string().uuid().optional(),
  receiver_name: z.string().optional(),
  laundry_items: z.array(z.object({
    item_id: z.string().refine(val => val === '' || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)),
    quantity: z.number().min(1),
    weight_kg: z.number().min(0),
    available_quantity: z.number(),
    condition_note: z.string().optional()
  })).optional(),
}).refine(data => {
  // Skip item validation for room_assign and laundry (handled separately)
  if (data.transaction_category === 'room_assign') return true;
  if (data.transaction_category === 'laundry') {
    return data.laundry_items && data.laundry_items.length > 0 && data.laundry_items.some(i => i.item_id);
  }
  return data.items && data.items.length > 0;
}, {
  message: t('inventory:validation.itemsMin'),
  path: ['items']
}).refine(data => {
  if (data.transaction_category === 'room_assign') return true;
  if (data.transaction_category === 'laundry') {
    return data.laundry_items?.every(item => item.quantity <= item.available_quantity) ?? true;
  }
  return data.items?.every(item => item.quantity <= item.available_quantity) ?? true;
}, {
  message: t('inventory:outbound.stockError'),
  path: ['items']
}).refine(data => {
  if (data.transaction_category === 'laundry') {
    return !!data.vendor_id && !!data.delivery_date && !!data.expected_return_date && !!data.delivery_staff_id && !!data.receiver_name;
  }
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
  // Laundry-specific
  delivery_date?: Date;
  expected_return_date?: Date;
  delivery_staff_id?: string;
  receiver_name?: string;
  laundry_items?: Array<{
    item_id: string;
    quantity: number;
    weight_kg: number;
    available_quantity: number;
    condition_note?: string;
  }>;
};

export function OutboundPage() {
  const { t } = useTranslation(['inventory', 'common', 'distribution', 'laundry'])
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  
  // Distribution form hook for room_assign
  const distributionForm = useDistributionForm();
  
  // Laundry state
  
  // Laundry state
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  
  // Create schema with translations
  const outboundSchema = createOutboundSchema(t);
  
  // ALL hooks MUST be declared BEFORE any conditional returns
  const { mutate: createOutbound, isPending: isLoading } = useCreateOutboundTransaction();
  const { mutate: createDistributionOrder, isPending: isDistributionLoading } = useCreateDistributionOrder();
  const { mutate: createLaundryBatch, isPending: isLaundryLoading } = useCreateLaundryBatch();
  const { data: vendors = [] } = useLaundryVendors({ status: 'active' });
  const { users } = useUsers();
  const { data: itemsData } = useItems();
  const allItems = itemsData?.items || [];
  
  // Filter launderable items (linen type items can be sent to laundry)
  const launderableItems = useMemo(() => {
    return allItems.filter(item => item.item_type === 'linen');
  }, [allItems]);
  
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
      // Laundry defaults
      delivery_date: new Date(),
      expected_return_date: addDays(new Date(), 3),
      delivery_staff_id: undefined,
      receiver_name: '',
      laundry_items: [{
        item_id: '',
        quantity: 1,
        weight_kg: 0,
        available_quantity: 0,
        condition_note: ''
      }],
    }
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  });
  
  const { fields: laundryFields, append: appendLaundryItem, remove: removeLaundryItem } = useFieldArray({
    control: form.control,
    name: 'laundry_items'
  });
  
  const formItems = form.watch('items') || [];
  const laundryItems = form.watch('laundry_items') || [];
  const category = form.watch('transaction_category');
  const totalQuantity = formItems.reduce((sum, item) => sum + item.quantity, 0);
  const hasStockError = formItems.some(item => item.quantity > item.available_quantity);
  const lowStockWarnings = formItems.filter(item => item.available_quantity > 0 && item.available_quantity - item.quantity < 10);
  
  // Laundry calculations
  const laundryTotalItems = laundryItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const laundryTotalWeight = laundryItems.reduce((sum, item) => sum + (item.weight_kg || 0), 0);
  const laundryEstimatedCost = useMemo(() => {
    if (!selectedVendor?.contract_info) return laundryTotalWeight * 20000; // Default 20k/kg
    const pricePerKg = selectedVendor.contract_info.price_per_kg || 20000;
    return laundryTotalWeight * pricePerKg;
  }, [selectedVendor, laundryTotalWeight]);
  const laundryHasStockError = laundryItems.some(item => item.quantity > item.available_quantity);
  
  // No longer needed - using distributionForm hook

  // Mobile view - AFTER all hooks
  if (isMobile) {
    return <MobileOutboundForm />;
  }
  
  const onSubmit = (data: OutboundFormData) => {
    if (data.transaction_category === 'room_assign') {
      // Use Distribution Order for room assignments
      const validAllocations = distributionForm.allocations.filter(a => a.items.length > 0);
      if (validAllocations.length === 0) {
        return;
      }
      
      createDistributionOrder({
        assigned_to: distributionForm.assignedTo || undefined,
        notes: distributionForm.notes || undefined,
        rooms: validAllocations,
      }, {
        onSuccess: (result) => {
          navigate(`/inventory/distributions/${result.order_id}`);
        }
      });
    } else if (data.transaction_category === 'laundry') {
      // Use Create Laundry Batch
      if (!data.vendor_id || !data.delivery_date || !data.expected_return_date || !data.delivery_staff_id || !data.receiver_name) {
        return;
      }
      
      const validLaundryItems = (data.laundry_items || []).filter(item => item.item_id && item.quantity > 0);
      if (validLaundryItems.length === 0) {
        return;
      }
      
      createLaundryBatch({
        step1: {
          vendor_id: data.vendor_id,
          delivery_date: data.delivery_date,
          expected_return_date: data.expected_return_date,
          delivery_staff_id: data.delivery_staff_id,
          receiver_name: data.receiver_name,
          notes: data.notes,
        },
        step2: {
          items: validLaundryItems.map(item => ({
            item_id: item.item_id,
            quantity: item.quantity,
            weight_kg: item.weight_kg || 0,
            condition_note: item.condition_note,
          }))
        },
        step3: { confirmed: true }
      }, {
        onSuccess: (result) => {
          navigate(`/laundry/batches/${result.id}`);
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
    <div className="space-y-4">
      <PageHeader title={t('inventory:outbound.title')} description={t('inventory:outbound.description')}>
        <Button variant="outline" size="sm" onClick={() => navigate('/inventory')}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {t('common:back')}
        </Button>
      </PageHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="border rounded-lg p-4 space-y-4">
            <p className="text-sm font-medium">{t('inventory:outbound.generalInfo')}</p>
            <FormField 
              control={form.control} 
              name="transaction_category" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">{t('inventory:outbound.type')} *</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-9">
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
            
            <div className="grid gap-3 md:grid-cols-2">
              <FormField 
                control={form.control} 
                name="from_location" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{t('inventory:outbound.fromLocation')} *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('inventory:outbound.placeholders.fromLocation')} className="h-9" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} 
              />
              
              {category === 'laundry' && (
                <FormField 
                  control={form.control} 
                  name="vendor_id" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t('inventory:outbound.selectVendor')} *</FormLabel>
                      <FormControl>
                        <LaundryVendorSelect
                          value={field.value || ''}
                          onChange={(value, vendor) => {
                            field.onChange(value);
                            setSelectedVendor(vendor);
                          }}
                          placeholder={t('inventory:outbound.placeholders.selectVendor')}
                        />
                      </FormControl>
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
                      <FormLabel className="text-xs">{t('inventory:outbound.selectMaintenanceRequest')}</FormLabel>
                      <FormControl>
                        <MaintenanceRequestSelect
                          value={field.value || ''}
                          onChange={(value) => field.onChange(value)}
                          placeholder={t('inventory:outbound.placeholders.selectMaintenanceRequest')}
                        />
                      </FormControl>
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
                      <FormLabel className="text-xs">{t('inventory:outbound.toLocation')} *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('inventory:outbound.placeholders.toLocation')} className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </div>
          
          {/* Distribution Form for room_assign */}
          {category === 'room_assign' && (
            <DistributionForm form={distributionForm} />
          )}
          
          {/* Laundry Batch Form */}
          {category === 'laundry' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <WashingMachine className="h-5 w-5" />
                  {t('laundry:batch.createNew')}
                </CardTitle>
                <CardDescription>
                  {t('laundry:batch.createDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Dates and Staff */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <FormField 
                    control={form.control} 
                    name="delivery_date" 
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>{t('laundry:batch.deliveryDate')} *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "dd/MM/yyyy", { locale: vi })
                                ) : (
                                  <span>{t('common:selectDate')}</span>
                                )}
                                <Calendar className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarUI
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />
                  
                  <FormField 
                    control={form.control} 
                    name="expected_return_date" 
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>{t('laundry:batch.expectedReturnDate')} *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "dd/MM/yyyy", { locale: vi })
                                ) : (
                                  <span>{t('common:selectDate')}</span>
                                )}
                                <Calendar className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarUI
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />
                  
                  <FormField 
                    control={form.control} 
                    name="delivery_staff_id" 
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('laundry:batch.deliveryStaff')} *</FormLabel>
                        <Select value={field.value || ''} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('laundry:batch.selectStaff')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {staffUsers.map(user => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />
                  
                  <FormField 
                    control={form.control} 
                    name="receiver_name" 
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('laundry:batch.receiverName')} *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('laundry:batch.receiverNamePlaceholder')} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />
                </div>
                
                {/* Laundry Items List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">{t('laundry:batch.itemsList')}</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => appendLaundryItem({
                        item_id: '',
                        quantity: 1,
                        weight_kg: 0,
                        available_quantity: 0,
                        condition_note: ''
                      })}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {t('laundry:batch.addItem')}
                    </Button>
                  </div>
                  
                  <div className="rounded-lg border">
                    <div className="grid grid-cols-12 gap-2 p-3 bg-muted/50 text-sm font-medium border-b">
                      <div className="col-span-4">{t('inventory:fields.item')}</div>
                      <div className="col-span-2 text-center">{t('laundry:batch.inStock')}</div>
                      <div className="col-span-2 text-center">{t('laundry:batch.quantity')}</div>
                      <div className="col-span-2 text-center">{t('laundry:batch.weightKg')}</div>
                      <div className="col-span-1 text-center">{t('laundry:batch.note')}</div>
                      <div className="col-span-1"></div>
                    </div>
                    
                    <div className="divide-y">
                      {laundryFields.map((field, index) => {
                        const currentItem = laundryItems[index];
                        const hasError = currentItem?.quantity > currentItem?.available_quantity;
                        
                        return (
                          <div key={field.id} className={cn("grid grid-cols-12 gap-2 p-3 items-center", hasError && "bg-destructive/5")}>
                            <div className="col-span-4">
                              <FormField 
                                control={form.control} 
                                name={`laundry_items.${index}.item_id`} 
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Select 
                                        value={field.value || ''} 
                                        onValueChange={(value) => {
                                          field.onChange(value);
                                          const selectedItem = launderableItems.find(i => i.id === value);
                                          if (selectedItem) {
                                            form.setValue(`laundry_items.${index}.available_quantity`, selectedItem.quantity_in_stock || 0);
                                          }
                                        }}
                                      >
                                        <SelectTrigger className="w-full">
                                          <SelectValue placeholder={t('laundry:batch.selectItem')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {launderableItems.map(item => (
                                            <SelectItem key={item.id} value={item.id}>
                                              {item.name} ({item.code})
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )} 
                              />
                            </div>
                            
                            <div className="col-span-2 text-center">
                              <span className={cn(
                                "font-medium",
                                (currentItem?.available_quantity || 0) < 10 && "text-orange-600"
                              )}>
                                {currentItem?.available_quantity || 0}
                              </span>
                            </div>
                            
                            <div className="col-span-2">
                              <FormField 
                                control={form.control} 
                                name={`laundry_items.${index}.quantity`} 
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        min={1}
                                        max={currentItem?.available_quantity}
                                        className={cn("text-center", hasError && "border-destructive")}
                                        {...field} 
                                        onChange={e => field.onChange(parseInt(e.target.value) || 1)} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )} 
                              />
                            </div>
                            
                            <div className="col-span-2">
                              <FormField 
                                control={form.control} 
                                name={`laundry_items.${index}.weight_kg`} 
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        step="0.1"
                                        min={0}
                                        className="text-center"
                                        placeholder="0.0"
                                        {...field} 
                                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )} 
                              />
                            </div>
                            
                            <div className="col-span-1">
                              <FormField 
                                control={form.control} 
                                name={`laundry_items.${index}.condition_note`} 
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input 
                                        className="text-xs"
                                        placeholder="..."
                                        {...field} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )} 
                              />
                            </div>
                            
                            <div className="col-span-1 text-center">
                              {laundryFields.length > 1 && (
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={() => removeLaundryItem(index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {laundryHasStockError && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {t('inventory:outbound.exceedStock')}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                
                {/* Notes */}
                <FormField 
                  control={form.control} 
                  name="notes" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('laundry:batch.notes')}</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder={t('laundry:batch.notesPlaceholder')} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
                
                {/* Summary */}
                <div className="rounded-lg border bg-muted/30 p-4">
                  <h4 className="font-medium mb-3">{t('laundry:batch.summary')}</h4>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">{t('laundry:batch.totalItems')}</p>
                      <p className="text-2xl font-bold">{laundryTotalItems}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                        <Scale className="h-3 w-3" />
                        {t('laundry:batch.totalWeight')}
                      </div>
                      <p className="text-2xl font-bold">{laundryTotalWeight.toFixed(1)} kg</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                        <DollarSign className="h-3 w-3" />
                        {t('laundry:batch.estimatedCost')}
                      </div>
                      <p className="text-2xl font-bold text-primary">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(laundryEstimatedCost)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">{t('laundry:batch.pricePerKg')}</p>
                      <p className="text-lg font-medium">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedVendor?.contract_info?.price_per_kg || 20000)}/kg
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Items Card - for non room_assign and non laundry categories */}
          {category !== 'room_assign' && category !== 'laundry' && (
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
          
          {/* Photos and Notes - for non room_assign and non laundry categories */}
          {category !== 'room_assign' && category !== 'laundry' && (
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
          {category === 'room_assign' && distributionForm.allocations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('distribution:createOrder.summary')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-sm text-muted-foreground">{t('distribution:createOrder.totalRooms')}</p>
                    <p className="text-3xl font-bold">{distributionForm.summary.roomCount}</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-sm text-muted-foreground">{t('distribution:createOrder.totalItemTypes')}</p>
                    <p className="text-3xl font-bold">
                      {distributionForm.summary.itemTypesCount}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-sm text-muted-foreground">{t('distribution:createOrder.totalUnits')}</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {distributionForm.summary.totalItems}
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
                disabled={isDistributionLoading || !distributionForm.isValid}
              >
                {isDistributionLoading ? t('distribution:createOrder.creating') : t('distribution:createOrder.create')}
              </Button>
            ) : category === 'laundry' ? (
              <Button 
                type="submit" 
                disabled={isLaundryLoading || laundryHasStockError || laundryItems.filter(i => i.item_id).length === 0}
              >
                <WashingMachine className="mr-2 h-4 w-4" />
                {isLaundryLoading ? t('laundry:batch.creating') : t('laundry:batch.createBatch')}
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
