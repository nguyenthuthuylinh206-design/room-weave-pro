import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from './useUser'
import { toast } from '@/hooks/use-toast'
import type {
  SubscriptionPlan,
  PaymentTransaction,
  PaymentTransactionInsert,
  Invoice,
  InvoiceInsert,
  InvoiceWithRelations,
} from '@/types/subscription.types'

// Fetch all active subscription plans
export const useSubscriptionPlans = () => {
  return useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      if (error) throw error
      return data as SubscriptionPlan[]
    },
  })
}

// Fetch current tenant's subscription info
export const useTenantSubscription = () => {
  const { tenantId } = useUser()

  return useQuery({
    queryKey: ['tenant-subscription', tenantId],
    queryFn: async () => {
      if (!tenantId) return null

      const { data, error } = await supabase
        .from('tenants')
        .select(`
          *,
          subscription_plan:subscription_plan_id (*)
        `)
        .eq('id', tenantId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!tenantId,
  })
}

// Fetch invoices for tenant
export const useInvoices = () => {
  const { tenantId } = useUser()

  return useQuery({
    queryKey: ['invoices', tenantId],
    queryFn: async () => {
      if (!tenantId) return []

      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          subscription_plan:subscription_plan_id (*),
          created_by_user:created_by (id, full_name, email)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as InvoiceWithRelations[]
    },
    enabled: !!tenantId,
  })
}

// Fetch payment transactions for tenant
export const usePaymentTransactions = () => {
  const { tenantId } = useUser()

  return useQuery({
    queryKey: ['payment-transactions', tenantId],
    queryFn: async () => {
      if (!tenantId) return []

      const { data, error } = await supabase
        .from('payment_transactions')
        .select(`
          *,
          invoice:invoice_id (*)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!tenantId,
  })
}

// Create payment transaction
export const useCreatePayment = () => {
  const queryClient = useQueryClient()
  const { tenantId } = useUser()

  return useMutation({
    mutationFn: async (payment: Omit<PaymentTransactionInsert, 'tenant_id'>) => {
      if (!tenantId) throw new Error('Tenant ID not found')

      const { data, error } = await supabase
        .from('payment_transactions')
        .insert({ ...payment, tenant_id: tenantId })
        .select()
        .single()

      if (error) throw error
      return data as PaymentTransaction
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast({
        title: 'Thành công',
        description: 'Thanh toán đã được ghi nhận',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// Create invoice
export const useCreateInvoice = () => {
  const queryClient = useQueryClient()
  const { tenantId, user } = useUser()

  return useMutation({
    mutationFn: async (invoice: Omit<InvoiceInsert, 'tenant_id' | 'created_by'>) => {
      if (!tenantId || !user?.id) throw new Error('Tenant ID or User ID not found')

      const { data, error } = await supabase
        .from('invoices')
        .insert({
          ...invoice,
          tenant_id: tenantId,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error
      return data as Invoice
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast({
        title: 'Thành công',
        description: 'Hóa đơn đã được tạo',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// Update tenant subscription plan
export const useUpdateTenantSubscription = () => {
  const queryClient = useQueryClient()
  const { tenantId } = useUser()

  return useMutation({
    mutationFn: async ({
      planId,
      billingCycle,
    }: {
      planId: string
      billingCycle: 'monthly' | 'yearly'
    }) => {
      if (!tenantId) throw new Error('Tenant ID not found')

      const { data, error } = await supabase
        .from('tenants')
        .update({
          subscription_plan_id: planId,
          subscription_status: 'active',
          billing_cycle: billingCycle,
          subscription_start_date: new Date().toISOString().split('T')[0],
          subscription_end_date: billingCycle === 'monthly' 
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          subscription_current_period_start: new Date().toISOString(),
          subscription_current_period_end: billingCycle === 'monthly'
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          next_billing_date: billingCycle === 'monthly'
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        })
        .eq('id', tenantId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-subscription'] })
      queryClient.invalidateQueries({ queryKey: ['tenant-usage'] })
      toast({
        title: 'Thành công',
        description: 'Gói đăng ký đã được cập nhật',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}
