import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { toast } from 'sonner';

export interface BookingPayment {
  id: string;
  tenant_id: string;
  hotel_id: string;
  booking_id: string;
  amount: number;
  payment_method: 'cash' | 'bank_transfer';
  payment_status: 'pending' | 'completed' | 'cancelled';
  transaction_reference: string | null;
  paid_at: string | null;
  created_by: string | null;
  metadata: Record<string, unknown>;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBookingPaymentInput {
  tenant_id: string;
  hotel_id: string;
  booking_id: string;
  amount: number;
  payment_method: 'cash' | 'bank_transfer';
  transaction_reference?: string;
  metadata?: Record<string, unknown>;
  notes?: string;
}

/**
 * Generate unique payment reference: BP-{roomNumber}-{timestamp36}
 */
export function generatePaymentReference(roomNumber: string): string {
  const timestamp = Date.now().toString(36).toUpperCase().slice(-6);
  const cleanRoom = roomNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `BP${cleanRoom}${timestamp}`;
}

/**
 * Hook to fetch a single payment by ID with realtime updates
 */
export function usePaymentById(paymentId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['booking-payment', paymentId],
    queryFn: async () => {
      if (!paymentId) return null;

      const { data, error } = await supabase
        .from('booking_payments')
        .select('*')
        .eq('id', paymentId)
        .maybeSingle();

      if (error) throw error;
      return data as BookingPayment | null;
    },
    enabled: !!paymentId,
  });

  // Subscribe to realtime updates for this specific payment
  useEffect(() => {
    if (!paymentId) return;

    const channel = supabase
      .channel(`booking-payment-${paymentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_payments',
          filter: `id=eq.${paymentId}`,
        },
        (payload) => {
          console.log('Payment update:', payload);
          queryClient.invalidateQueries({ queryKey: ['booking-payment', paymentId] });

          // If payment completed, show toast
          if (payload.eventType === 'UPDATE' && (payload.new as BookingPayment).payment_status === 'completed') {
            toast.success('Thanh toán đã được xác nhận!');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [paymentId, queryClient]);

  return query;
}

/**
 * Hook to fetch payments for a specific booking
 */
export function useBookingPayments(bookingId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['booking-payments', bookingId],
    queryFn: async () => {
      if (!bookingId) return [];
      
      const { data, error } = await supabase
        .from('booking_payments')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BookingPayment[];
    },
    enabled: !!bookingId,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!bookingId) return;

    const channel = supabase
      .channel(`booking-payments-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_payments',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          console.log('Booking payment update:', payload);
          queryClient.invalidateQueries({ queryKey: ['booking-payments', bookingId] });
          
          // If payment completed, show toast
          if (payload.eventType === 'UPDATE' && (payload.new as BookingPayment).payment_status === 'completed') {
            toast.success('Thanh toán đã được xác nhận!');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId, queryClient]);

  return query;
}

/**
 * Hook to create a new booking payment
 */
export function useCreateBookingPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBookingPaymentInput) => {
      const { data: user } = await supabase.auth.getUser();
      
      const insertData = {
        tenant_id: input.tenant_id,
        hotel_id: input.hotel_id,
        booking_id: input.booking_id,
        amount: input.amount,
        payment_method: input.payment_method,
        transaction_reference: input.transaction_reference || null,
        metadata: input.metadata || {},
        notes: input.notes || null,
        created_by: user.user?.id || null,
        payment_status: input.payment_method === 'cash' ? 'completed' : 'pending',
        paid_at: input.payment_method === 'cash' ? new Date().toISOString() : null,
      };
      
      // Use type assertion since types may not be regenerated yet
      const { data, error } = await supabase
        .from('booking_payments')
        .insert(insertData as never)
        .select()
        .single();

      if (error) throw error;
      return data as BookingPayment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['booking-payments', data.booking_id] });
      queryClient.invalidateQueries({ queryKey: ['room-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking-stats'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-report'] });
      queryClient.invalidateQueries({ queryKey: ['owner-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['all-pending-payments'] });
      queryClient.invalidateQueries({ queryKey: ['today-checkouts'] });
    },
  });
}

/**
 * Hook to confirm a pending payment (manual confirmation)
 */
export function useConfirmBookingPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentId: string) => {
      const { data, error } = await supabase
        .from('booking_payments')
        .update({
          payment_status: 'completed',
          paid_at: new Date().toISOString(),
        })
        .eq('id', paymentId)
        .select()
        .single();

      if (error) throw error;
      return data as BookingPayment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['booking-payments', data.booking_id] });
      queryClient.invalidateQueries({ queryKey: ['room-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Đã xác nhận thanh toán');
    },
  });
}

/**
 * Hook to cancel a pending payment
 */
export function useCancelBookingPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentId: string) => {
      const { data, error } = await supabase
        .from('booking_payments')
        .update({
          payment_status: 'cancelled',
        })
        .eq('id', paymentId)
        .select()
        .single();

      if (error) throw error;
      return data as BookingPayment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['booking-payments', data.booking_id] });
    },
  });
}

/**
 * Hook to update room booking amount_paid after payment
 */
export function useUpdateBookingAmountPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      bookingId, 
      amountToAdd,
      totalAmount 
    }: { 
      bookingId: string; 
      amountToAdd: number;
      totalAmount: number;
    }) => {
      // Use atomic RPC to prevent race conditions with concurrent payments
      const { data, error } = await supabase
        .rpc('update_booking_amount_paid', {
          p_booking_id: bookingId,
          p_amount_to_add: amountToAdd,
          p_total_amount: totalAmount,
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
