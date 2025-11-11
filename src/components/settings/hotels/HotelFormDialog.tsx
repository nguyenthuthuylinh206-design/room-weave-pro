import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Hotel, HotelFormData, useCreateHotel, useUpdateHotel } from '@/hooks/useHotels'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useUsers } from '@/hooks/useUsers'

const hotelSchema = z.object({
  code: z.string().min(2, 'Code must be at least 2 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.enum(['hotel', 'resort', 'apartment', 'hostel', 'other']),
  
  // Contact
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().min(1, 'Country is required'),
  postal_code: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  
  // Capacity
  total_rooms: z.coerce.number().min(1, 'Must have at least 1 room'),
  total_floors: z.coerce.number().min(1, 'Must have at least 1 floor'),
  
  // Manager
  manager_id: z.string().optional(),
  
  // Metadata
  description: z.string().optional(),
  status: z.enum(['active', 'inactive', 'maintenance']),
})

interface HotelFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  hotel?: Hotel | null
}

export function HotelFormDialog({ open, onOpenChange, hotel }: HotelFormDialogProps) {
  const [step, setStep] = useState(1)
  const createHotel = useCreateHotel()
  const updateHotel = useUpdateHotel()
  const { users } = useUsers()

  // Filter managers from users
  const managers = users?.filter(u => 
    u.role === 'hotel_manager' || u.role === 'owner' || u.role === 'super_admin'
  ) || []

  const form = useForm<HotelFormData>({
    resolver: zodResolver(hotelSchema),
    defaultValues: {
      code: hotel?.code || '',
      name: hotel?.name || '',
      type: hotel?.type || 'hotel',
      address: hotel?.address || '',
      city: hotel?.city || '',
      state: hotel?.state || '',
      country: hotel?.country || 'Vietnam',
      postal_code: hotel?.postal_code || '',
      phone: hotel?.phone || '',
      email: hotel?.email || '',
      website: hotel?.website || '',
      total_rooms: hotel?.total_rooms || 1,
      total_floors: hotel?.total_floors || 1,
      manager_id: hotel?.manager_id || undefined,
      description: hotel?.description || '',
      status: hotel?.status || 'active',
    },
  })

  useEffect(() => {
    if (open && hotel) {
      form.reset({
        code: hotel.code,
        name: hotel.name,
        type: hotel.type,
        address: hotel.address || '',
        city: hotel.city || '',
        state: hotel.state || '',
        country: hotel.country,
        postal_code: hotel.postal_code || '',
        phone: hotel.phone || '',
        email: hotel.email || '',
        website: hotel.website || '',
        total_rooms: hotel.total_rooms,
        total_floors: hotel.total_floors,
        manager_id: hotel.manager_id || undefined,
        description: hotel.description || '',
        status: hotel.status,
      })
    } else if (open && !hotel) {
      form.reset({
        code: '',
        name: '',
        type: 'hotel',
        address: '',
        city: '',
        state: '',
        country: 'Vietnam',
        postal_code: '',
        phone: '',
        email: '',
        website: '',
        total_rooms: 1,
        total_floors: 1,
        manager_id: undefined,
        description: '',
        status: 'active',
      })
    }
  }, [open, hotel, form])

  const onSubmit = async (data: HotelFormData) => {
    if (hotel) {
      await updateHotel.mutateAsync({ id: hotel.id, data })
    } else {
      await createHotel.mutateAsync(data)
    }
    onOpenChange(false)
    setStep(1)
  }

  const handleClose = () => {
    onOpenChange(false)
    setStep(1)
  }

  const nextStep = async () => {
    const fields = getStepFields(step)
    const valid = await form.trigger(fields as any)
    if (valid) setStep(step + 1)
  }

  const prevStep = () => setStep(step - 1)

  const getStepFields = (currentStep: number): string[] => {
    switch (currentStep) {
      case 1:
        return ['code', 'name', 'type']
      case 2:
        return ['address', 'city', 'state', 'country', 'postal_code']
      case 3:
        return ['phone', 'email', 'website']
      case 4:
        return ['total_rooms', 'total_floors', 'manager_id']
      case 5:
        return ['description', 'status']
      default:
        return []
    }
  }

  const totalSteps = 5
  const progress = (step / totalSteps) * 100

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{hotel ? 'Edit Hotel' : 'Add New Hotel'}</DialogTitle>
          <DialogDescription>
            {!hotel && `Step ${step} of ${totalSteps}`}
          </DialogDescription>
        </DialogHeader>

        {!hotel && <Progress value={progress} className="h-2" />}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hotel Code *</FormLabel>
                      <FormControl>
                        <Input placeholder="HN001" {...field} />
                      </FormControl>
                      <FormDescription>
                        Unique identifier for this hotel
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hotel Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Grand Hotel Hanoi" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="hotel">Hotel</SelectItem>
                          <SelectItem value="resort">Resort</SelectItem>
                          <SelectItem value="apartment">Apartment</SelectItem>
                          <SelectItem value="hostel">Hostel</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 2: Location */}
            {step === 2 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Hoan Kiem St" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="Hanoi" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State/Province</FormLabel>
                        <FormControl>
                          <Input placeholder="Hanoi" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country *</FormLabel>
                        <FormControl>
                          <Input placeholder="Vietnam" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="postal_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input placeholder="100000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Contact */}
            {step === 3 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+84 24 1234 5678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="info@hotel.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="https://www.grandhotel.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 4: Capacity & Manager */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="total_rooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Rooms *</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="total_floors"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Floors *</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="manager_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manager (Optional)</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === 'none' ? undefined : value)} 
                        value={field.value || 'none'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select manager" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No manager assigned</SelectItem>
                          {managers.map((manager) => (
                            <SelectItem key={manager.id} value={manager.id}>
                              {manager.full_name} ({manager.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 5: Description & Status */}
            {step === 5 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of the hotel..."
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4">
              {step > 1 && !hotel && (
                <Button type="button" variant="outline" onClick={prevStep}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
              )}
              {step < totalSteps && !hotel && (
                <Button type="button" onClick={nextStep} className="ml-auto">
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
              {(step === totalSteps || hotel) && (
                <Button
                  type="submit"
                  disabled={createHotel.isPending || updateHotel.isPending}
                  className={!hotel && step > 1 ? 'ml-auto' : ''}
                >
                  {hotel ? 'Update' : 'Create'} Hotel
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
