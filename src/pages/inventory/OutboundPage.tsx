import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, AlertTriangle, Truck } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ItemSelect } from '@/components/shared/ItemSelect';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { useCreateOutboundTransaction } from '@/hooks/useInventoryTransactions';
import { useBreakpoint } from '@/lib/breakpoints';
import { MobileOutboundForm } from '@/components/inventory/MobileOutboundForm';

// Schema được tạo bên trong component để sử dụng t() function
const createOutboundSchema = (t: (key: string) => string) => z.object({
  transaction_category: z.enum(['room_assign', 'laundry', 'maintenance', 'disposal', 'other']),
  from_location: z.string().min(1, t('inventory:validation.fromRequired')),
  to_location: z.string().min(1, t('inventory:validation.toRequired')),
  items: z.array(z.object({
    item_id: z.string().uuid(t('inventory:validation.itemRequired')),
    quantity: z.number().min(1, t('inventory:validation.quantityMin')),
    available_quantity: z.number(),
    notes: z.string().optional()
  })).min(1, t('inventory:validation.itemsMin')),
  recipient_name: z.string().optional(),
  recipient_signature: z.string().optional(),
  photos: z.array(z.string()).optional(),
  notes: z.string().optional(),
  auto_assign_to_room: z.boolean().optional()
}).refine(data => data.items.every(item => item.quantity <= item.available_quantity), {
  message: t('inventory:outbound.stockError'),
  path: ['items']
});
type OutboundFormData = {
  transaction_category: 'room_assign' | 'laundry' | 'maintenance' | 'disposal' | 'other';
  from_location: string;
  to_location: string;
  items: Array<{
    item_id: string;
    quantity: number;
    available_quantity: number;
    notes?: string;
  }>;
  recipient_name?: string;
  recipient_signature?: string;
  photos?: string[];
  notes?: string;
  auto_assign_to_room?: boolean;
};

export function OutboundPage() {
  const { t } = useTranslation(['inventory', 'common'])
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  
  // Create schema with translations
  const outboundSchema = createOutboundSchema(t);
  
  // ALL hooks MUST be declared BEFORE any conditional returns
  const { mutate: createOutbound, isPending: isLoading } = useCreateOutboundTransaction();
  
  const form = useForm<OutboundFormData>({
    resolver: zodResolver(outboundSchema),
    defaultValues: {
      transaction_category: 'room_assign',
      from_location: t('inventory:outbound.placeholders.defaultWarehouse'),
      to_location: '',
      items: [{
        item_id: '',
        quantity: 1,
        available_quantity: 0,
        notes: ''
      }],
      recipient_name: '',
      recipient_signature: '',
      photos: [],
      notes: '',
      auto_assign_to_room: false
    }
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  });
  
  const items = form.watch('items');
  const category = form.watch('transaction_category');
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const hasStockError = items.some(item => item.quantity > item.available_quantity);
  const lowStockWarnings = items.filter(item => item.available_quantity > 0 && item.available_quantity - item.quantity < 10);

  // Mobile view - AFTER all hooks
  if (isMobile) {
    return <MobileOutboundForm />;
  }
  
  const onSubmit = (data: OutboundFormData) => {
    createOutbound(data as any, {
      onSuccess: () => {
        navigate('/inventory/transactions');
      }
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t('inventory:outbound.title')} description={t('inventory:outbound.description')}>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/inventory/distributions/new')}>
            <Truck className="mr-2 h-4 w-4" />
            {t('inventory:outbound.deliverToMultiRooms')}
          </Button>
          <Button variant="outline" onClick={() => navigate('/inventory')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common:back')}
          </Button>
        </div>
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
                      <RadioGroup 
                        onValueChange={field.onChange} 
                        defaultValue={field.value} 
                        className="grid grid-cols-2 gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="room_assign" id="room_assign" />
                          <label htmlFor="room_assign" className="cursor-pointer">
                            🏠 {t('inventory:outbound.toRoom')}
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="laundry" id="laundry" />
                          <label htmlFor="laundry" className="cursor-pointer">
                            🧺 {t('inventory:outbound.toLaundry')}
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="maintenance" id="maintenance" />
                          <label htmlFor="maintenance" className="cursor-pointer">
                            🔧 {t('inventory:outbound.toMaintenance')}
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="disposal" id="disposal" />
                          <label htmlFor="disposal" className="cursor-pointer">
                            🗑️ {t('inventory:outbound.toDisposal')}
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="other" id="other" />
                          <label htmlFor="other" className="cursor-pointer">
                            ➖ {t('inventory:outbound.toOther')}
                          </label>
                        </div>
                      </RadioGroup>
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
              </div>
              
              {category === 'room_assign' && (
                <FormField 
                  control={form.control} 
                  name="auto_assign_to_room" 
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          {t('inventory:outbound.autoAssignToRoom')}
                        </FormLabel>
                        <FormDescription>
                          {t('inventory:outbound.autoAssignDescription')}
                        </FormDescription>
                      </div>
                    </FormItem>
                  )} 
                />
              )}
            </CardContent>
          </Card>
          
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
                  const currentItem = items[index];
                  const hasError = currentItem.quantity > currentItem.available_quantity;
                  const willBeLowStock = currentItem.available_quantity > 0 && currentItem.available_quantity - currentItem.quantity < 10;
                  
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
                                      max={currentItem.available_quantity} 
                                      {...field} 
                                      onChange={e => field.onChange(parseInt(e.target.value) || 0)} 
                                      className={hasError ? 'border-destructive' : ''} 
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    {t('inventory:outbound.stockAvailable')}: <span className="font-bold">{currentItem.available_quantity}</span>
                                    {currentItem.available_quantity > 0 && (
                                      <>
                                        {' '}• {t('inventory:outbound.remaining')}:{' '}
                                        <span className={willBeLowStock ? 'text-orange-600 font-bold' : ''}>
                                          {currentItem.available_quantity - currentItem.quantity}
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
                  <p className="text-3xl font-bold">{items.length}</p>
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
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/inventory')}>
              {t('common:cancel')}
            </Button>
            <Button type="submit" disabled={isLoading || hasStockError}>
              {isLoading ? t('inventory:outbound.processing') : t('inventory:outbound.confirm')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
