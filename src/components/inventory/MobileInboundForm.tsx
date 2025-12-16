import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ShoppingCart, RotateCcw, Shirt, PackagePlus, Search, Plus, Minus, X, Save, Check, Tag, Package, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TouchButton } from '@/components/mobile/TouchOptimized';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { useCreateInboundTransaction } from '@/hooks/useInventoryTransactions';
import { useItems } from '@/hooks/useItems';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { triggerHaptic } from '@/lib/haptics';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const DRAFT_KEY = 'inbound_form_draft';

const createInboundSchema = (t: (key: string) => string) => z.object({
  transaction_category: z.enum(['purchase', 'return', 'laundry', 'other']),
  from_location: z.string().min(1, t('inventory:mobileForm.validation.fromLocationRequired')),
  to_location: z.string().min(1, t('inventory:mobileForm.validation.toLocationRequired')),
  items: z.array(z.object({
    item_id: z.string().uuid(t('inventory:mobileForm.validation.itemRequired')),
    quantity: z.number().min(1, t('inventory:mobileForm.validation.quantityMin')),
    notes: z.string().optional()
  })).min(1, t('inventory:mobileForm.validation.minOneItem')),
  documents: z.array(z.string()).optional(),
  photos: z.array(z.string()).optional(),
  notes: z.string().optional()
});

type InboundFormData = z.infer<ReturnType<typeof createInboundSchema>>;

export function MobileInboundForm() {
  const { t } = useTranslation(['inventory', 'common']);
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [shake, setShake] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const totalSteps = 3;

  const categories = [
    { value: 'purchase', label: t('inventory:inbound.categories.purchase'), icon: ShoppingCart, description: t('inventory:inbound.categories.purchaseDesc') },
    { value: 'return', label: t('inventory:inbound.categories.return'), icon: RotateCcw, description: t('inventory:inbound.categories.returnDesc') },
    { value: 'laundry', label: t('inventory:inbound.categories.laundry'), icon: Shirt, description: t('inventory:inbound.categories.laundryDesc') },
    { value: 'other', label: t('inventory:inbound.categories.other'), icon: PackagePlus, description: t('inventory:inbound.categories.otherDesc') }
  ];

  const steps = [
    { icon: Tag, label: t('inventory:mobileForm.steps.categoryLocation') },
    { icon: Package, label: t('inventory:mobileForm.steps.items') },
    { icon: CheckCircle, label: t('inventory:mobileForm.steps.confirm') }
  ];

  const { mutate: createInbound, isPending: isLoading } = useCreateInboundTransaction();
  const { data: itemsData, isLoading: isLoadingItems } = useItems({ search: searchQuery }, 1, 50);

  const inboundSchema = createInboundSchema(t);

  const form = useForm<InboundFormData>({
    resolver: zodResolver(inboundSchema),
    defaultValues: {
      transaction_category: 'purchase',
      from_location: '',
      to_location: t('inventory:mobileForm.inbound.toPlaceholder'),
      items: [],
      documents: [],
      photos: [],
      notes: ''
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  });

  const items = form.watch('items');
  const category = form.watch('transaction_category');
  const from_location = form.watch('from_location');
  const to_location = form.watch('to_location');
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft && !draftLoaded) {
      try {
        const data = JSON.parse(draft);
        if (data.transaction_category === 'laundry_return') {
          data.transaction_category = 'laundry';
        }
        form.reset(data);
        setDraftLoaded(true);
        toast.info(t('inventory:mobileForm.draftRestored'), {
          action: {
            label: t('inventory:mobileForm.clearDraft'),
            onClick: () => {
              localStorage.removeItem(DRAFT_KEY);
              form.reset({
                transaction_category: 'purchase',
                from_location: '',
                to_location: t('inventory:mobileForm.inbound.toPlaceholder'),
                items: [],
                documents: [],
                photos: [],
                notes: ''
              });
            }
          }
        });
      } catch {}
    }
  }, []);

  // Auto-save draft (debounced)
  useEffect(() => {
    const subscription = form.watch(data => {
      const timer = setTimeout(() => {
        if (form.formState.isDirty) {
          localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
        }
      }, 1000);
      return () => clearTimeout(timer);
    });
    return () => subscription.unsubscribe();
  }, [form.watch, form.formState.isDirty]);

  // Validation for each step
  const validateStep = useCallback((stepNumber: number) => {
    if (stepNumber === 1) {
      const errors: Record<string, string | null> = {};
      if (!from_location?.trim()) errors.from_location = t('inventory:mobileForm.validation.fromLocationRequired');
      if (!to_location?.trim()) errors.to_location = t('inventory:mobileForm.validation.toLocationRequired');
      return { isValid: !errors.from_location && !errors.to_location, errors };
    }
    if (stepNumber === 2) {
      return {
        isValid: items.length > 0 && items.every(item => item.item_id && item.quantity > 0),
        errors: items.length === 0 ? { items: t('inventory:mobileForm.validation.addAtLeastOneItem') } : {}
      };
    }
    return { isValid: true, errors: {} };
  }, [from_location, to_location, items, t]);

  const canProceedStep1 = Boolean(category && from_location?.trim() && to_location?.trim());
  const canProceedStep2 = items.length > 0 && items.every(item => item.item_id && item.quantity > 0);

  const getMissingFieldsStep1 = () => {
    const missing: string[] = [];
    if (!from_location?.trim()) missing.push(t('inventory:mobileForm.inbound.fromLocation').toLowerCase());
    if (!to_location?.trim()) missing.push(t('inventory:mobileForm.inbound.toLocation').toLowerCase());
    return missing;
  };

  const handleNext = () => {
    const { isValid, errors } = validateStep(step);
    if (!isValid) {
      setShake(true);
      triggerHaptic('error');
      setTimeout(() => setShake(false), 500);
      const firstError = Object.values(errors).find(e => e);
      if (firstError) toast.error(firstError as string);
      return;
    }
    triggerHaptic('light');
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step === 1) {
      if (form.formState.isDirty) {
        setShowExitDialog(true);
      } else {
        navigate(-1);
      }
    } else {
      triggerHaptic('light');
      setStep(step - 1);
    }
  };

  const handleSaveDraft = () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form.getValues()));
    triggerHaptic('success');
    toast.success(t('inventory:mobileForm.draftSaved'));
    navigate('/inventory/transactions');
  };

  const handleDiscard = () => {
    localStorage.removeItem(DRAFT_KEY);
    navigate(-1);
  };

  const handleSubmit = form.handleSubmit(data => {
    createInbound(data as any, {
      onSuccess: () => {
        localStorage.removeItem(DRAFT_KEY);
        triggerHaptic('success');
        toast.success(t('inventory:mobileForm.inbound.successMessage'));
        navigate('/inventory/transactions');
      }
    });
  }, errors => {
    const firstError = Object.values(errors).flat().find(e => e?.message);
    if (firstError) {
      toast.error((firstError as any).message || t('inventory:mobileForm.validation.checkInfo'));
    }
  });

  const addItem = (itemId: string) => {
    const existing = items.find(i => i.item_id === itemId);
    if (existing) {
      toast.info(t('inventory:mobileForm.itemAlreadyAdded'));
      return;
    }
    triggerHaptic('success');
    append({ item_id: itemId, quantity: 1, notes: '' });
    setShowItemSelector(false);
  };

  const handleRemoveItem = (index: number) => {
    triggerHaptic('warning');
    remove(index);
  };

  const updateQuantity = (index: number, quantity: number) => {
    const newQty = Math.max(1, quantity);
    form.setValue(`items.${index}.quantity`, newQty, { shouldDirty: true, shouldValidate: true });
    if (quantity >= 1) triggerHaptic('light');
  };

  const selectedCategory = categories.find(c => c.value === category);

  return (
    <div className="min-h-screen bg-background pb-40">
      {/* Progress Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <TouchButton variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </TouchButton>
            <TouchButton variant="ghost" onClick={handleSaveDraft} disabled={isLoading}>
              <Save className="h-4 w-4 mr-1" />
              {t('inventory:mobileForm.saveDraft')}
            </TouchButton>
          </div>
          
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-1">
            {steps.map((s, i) => {
              const stepNum = i + 1;
              const isCompleted = step > stepNum;
              const isCurrent = step === stepNum;
              const Icon = s.icon;
              return (
                <div key={i} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                      isCompleted ? "bg-primary text-primary-foreground" :
                      isCurrent ? "bg-primary/20 text-primary border-2 border-primary" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <span className={cn(
                      "text-[10px] mt-1 text-center w-16",
                      isCurrent ? "text-primary font-medium" : "text-muted-foreground"
                    )}>
                      {s.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={cn("w-8 h-0.5 mb-5 mx-1", step > stepNum ? "bg-primary" : "bg-muted")} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Step Content */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className={cn("p-4 space-y-6", shake && "animate-shake")}>
            <div>
              <h2 className="text-lg font-semibold mb-1">{t('inventory:mobileForm.inbound.categoryTitle')}</h2>
              <p className="text-sm text-muted-foreground mb-4">{t('inventory:mobileForm.inbound.categoryDescription')}</p>
              
              <div className="grid grid-cols-2 gap-3">
                {categories.map(cat => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.value;
                  return (
                    <TouchButton
                      key={cat.value}
                      variant={isSelected ? 'default' : 'outline'}
                      className="h-28 flex-col gap-2 justify-center"
                      onClick={() => {
                        form.setValue('transaction_category', cat.value as any);
                        triggerHaptic('light');
                      }}
                    >
                      <Icon className="h-8 w-8" />
                      <div className="text-center">
                        <div className="text-sm font-medium">{cat.label}</div>
                        <div className="text-xs opacity-70">{cat.description}</div>
                      </div>
                    </TouchButton>
                  );
                })}
              </div>
            </div>
            
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">{t('inventory:mobileForm.inbound.locationTitle')}</h2>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="from_location">{t('inventory:mobileForm.inbound.fromLocation')} *</Label>
                  <Input
                    id="from_location"
                    placeholder={t('inventory:mobileForm.inbound.fromPlaceholder')}
                    className={cn("min-h-[48px] mt-1", form.formState.errors.from_location && "border-destructive")}
                    {...form.register('from_location')}
                  />
                  {form.formState.errors.from_location && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {form.formState.errors.from_location.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="to_location">{t('inventory:mobileForm.inbound.toLocation')} *</Label>
                  <Input
                    id="to_location"
                    placeholder={t('inventory:mobileForm.inbound.toPlaceholder')}
                    className={cn("min-h-[48px] mt-1", form.formState.errors.to_location && "border-destructive")}
                    {...form.register('to_location')}
                  />
                  {form.formState.errors.to_location && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {form.formState.errors.to_location.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className={cn("space-y-4", shake && "animate-shake")}>
            {fields.length === 0 ? (
              <motion.div className="text-center py-12 px-4" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                <div className="w-20 h-20 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
                  <Package className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{t('inventory:mobileForm.noItems')}</h3>
                <p className="text-muted-foreground mb-6">{t('inventory:mobileForm.inbound.noItemsDescription')}</p>
                <TouchButton onClick={() => setShowItemSelector(true)} className="h-12 px-6">
                  <Plus className="mr-2 h-5 w-5" />
                  {t('inventory:mobileForm.addItem')}
                </TouchButton>
              </motion.div>
            ) : (
              <>
                <div className="px-4 space-y-2">
                  <h3 className="font-semibold">{t('inventory:mobileForm.selected')} ({fields.length})</h3>
                  {fields.map((field, index) => {
                    const item = itemsData?.items.find(i => i.id === field.item_id);
                    const primaryImage = item?.item_images?.[0]?.url;
                    return (
                      <Card key={field.id} className="p-4">
                        <div className="flex items-start gap-3 mb-3">
                          {primaryImage ? (
                            <img src={primaryImage} alt={item?.name} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <Package className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium leading-tight">{item?.name || t('inventory:mobileForm.itemDefault')}</p>
                            <p className="text-sm text-muted-foreground">{item?.code}</p>
                          </div>
                          <TouchButton variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive shrink-0" onClick={() => handleRemoveItem(index)}>
                            <X className="h-4 w-4" />
                          </TouchButton>
                        </div>
                        
                        <div className="space-y-2 mb-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm text-muted-foreground">{t('inventory:mobileForm.quantity')}:</Label>
                            <div className="flex items-center gap-2">
                              <TouchButton type="button" variant="outline" size="icon" className="h-10 w-10" onClick={() => updateQuantity(index, (items[index]?.quantity || 1) - 1)} disabled={(items[index]?.quantity || 1) <= 1}>
                                <Minus className="h-4 w-4" />
                              </TouchButton>
                              <Input type="number" value={items[index]?.quantity || 1} onChange={e => updateQuantity(index, parseInt(e.target.value) || 1)} min={1} className="h-10 w-16 text-center font-semibold" />
                              <TouchButton type="button" variant="outline" size="icon" className="h-10 w-10" onClick={() => updateQuantity(index, (items[index]?.quantity || 1) + 1)}>
                                <Plus className="h-4 w-4" />
                              </TouchButton>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
                
                <div className="px-4">
                  <TouchButton variant="outline" className="w-full h-12" onClick={() => setShowItemSelector(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('inventory:mobileForm.addMoreItems')}
                  </TouchButton>
                </div>
                
                <div className="px-4">
                  <Card className="p-4 bg-primary/5 border-primary/20">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('inventory:mobileForm.totalQuantity')}:</span>
                      <span className="font-semibold">{totalQuantity}</span>
                    </div>
                  </Card>
                </div>
              </>
            )}
          </motion.div>
        )}
        
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">{t('inventory:mobileForm.documentsPhotos')}</h2>
              
              <div className="space-y-4">
                <div>
                  <Label>{t('inventory:mobileForm.uploadPhotos')}</Label>
                  <ImageUpload images={form.watch('photos') || []} onChange={urls => form.setValue('photos', urls)} maxImages={10} className="mt-2" />
                </div>
                
                <div>
                  <Label htmlFor="notes">{t('inventory:mobileForm.notes')}</Label>
                  <Textarea id="notes" placeholder={t('inventory:mobileForm.notesPlaceholder')} rows={4} className="resize-none mt-2" {...form.register('notes')} />
                </div>
              </div>
            </div>
            
            <Card className="p-4 bg-muted/50">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                {t('inventory:mobileForm.confirmInfo')}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('inventory:mobileForm.type')}:</span>
                  <span className="font-medium">{selectedCategory?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('inventory:mobileForm.from')}:</span>
                  <span className="font-medium">{from_location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('inventory:mobileForm.to')}:</span>
                  <span className="font-medium">{to_location}</span>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('inventory:mobileForm.itemCount')}:</span>
                  <span className="font-medium">{items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('inventory:mobileForm.totalQuantity')}:</span>
                  <span className="font-medium">{totalQuantity}</span>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Navigation Footer */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-background border-t z-40">
        <div className="flex gap-2">
          {step > 1 && (
            <TouchButton variant="outline" onClick={() => { triggerHaptic('light'); setStep(step - 1); }} className="flex-1 h-12">
              {t('inventory:mobileForm.back')}
            </TouchButton>
          )}
          <div className="flex-1 flex flex-col">
            {step === 1 && !canProceedStep1 && (
              <p className="text-xs text-muted-foreground text-center mb-2">
                {t('inventory:mobileForm.validation.missingFields')}: {getMissingFieldsStep1().join(', ')}
              </p>
            )}
            {step === 2 && !canProceedStep2 && (
              <p className="text-xs text-muted-foreground text-center mb-2">
                {t('inventory:mobileForm.validation.addAtLeastOneItem')}
              </p>
            )}
            <TouchButton onClick={step === totalSteps ? handleSubmit : handleNext} className="w-full h-12" disabled={(step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2) || (step === 3 && isLoading)}>
              {step === totalSteps ? (
                isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('inventory:mobileForm.processing')}</>
                ) : (
                  <><Check className="mr-2 h-4 w-4" />{t('inventory:mobileForm.complete')}</>
                )
              ) : t('inventory:mobileForm.continue')}
            </TouchButton>
          </div>
        </div>
      </div>
      
      {/* Item Selector Sheet */}
      <Sheet open={showItemSelector} onOpenChange={setShowItemSelector}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle>{t('inventory:mobileForm.selectItem')}</SheetTitle>
          </SheetHeader>
          
          <div className="mt-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t('inventory:mobileForm.searchItems')} className="pl-10 min-h-[48px]" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            
            <div className="space-y-2 max-h-[55vh] overflow-y-auto">
              {isLoadingItems ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map(i => (
                    <Card key={i} className="p-3">
                      <div className="flex gap-3 animate-pulse">
                        <div className="w-12 h-12 rounded bg-muted" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-3/4" />
                          <div className="h-3 bg-muted rounded w-1/2" />
                          <div className="h-3 bg-muted rounded w-1/3" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : !itemsData?.items.length ? (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">{t('inventory:mobileForm.noItemsFound')}</p>
                </div>
              ) : itemsData.items.map(item => {
                const primaryImage = item.item_images?.[0]?.url;
                const isSelected = items.some(i => i.item_id === item.id);
                return (
                  <Card key={item.id} className={cn("p-3 cursor-pointer transition-colors", isSelected ? "bg-primary/10 border-primary" : "hover:bg-muted/50")} onClick={() => !isSelected && addItem(item.id)}>
                    <div className="flex gap-3">
                      {primaryImage ? (
                        <img src={primaryImage} alt={item.name} className="w-12 h-12 rounded object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{item.name}</p>
                          {isSelected && <Check className="h-4 w-4 text-primary" />}
                        </div>
                        <p className="text-sm text-muted-foreground">{item.code}</p>
                        <p className="text-xs text-muted-foreground">
                          {t('inventory:mobileForm.stock')}: {item.quantity_total || 0} {item.unit}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent className="max-w-[90vw] rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('inventory:mobileForm.inbound.exitTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('inventory:mobileForm.inbound.exitDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <TouchButton onClick={handleSaveDraft} className="w-full h-12">
              <Save className="mr-2 h-4 w-4" />
              {t('inventory:mobileForm.inbound.saveDraftAndExit')}
            </TouchButton>
            <TouchButton variant="outline" onClick={handleDiscard} className="w-full h-12">
              {t('inventory:mobileForm.inbound.discardAndExit')}
            </TouchButton>
            <TouchButton variant="ghost" onClick={() => setShowExitDialog(false)} className="w-full h-12">
              {t('inventory:mobileForm.inbound.continueEditing')}
            </TouchButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
