import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface SuperAdminStats {
  // Tenants
  total_tenants: number
  active_tenants: number
  trial_tenants: number
  suspended_tenants: number
  expiring_7_days: number
  expiring_today: number
  in_grace_period: number
  
  // Revenue
  revenue_today: number
  revenue_this_month: number
  revenue_last_month: number
  mrr: number
  
  // Growth
  new_signups_today: number
  new_signups_this_month: number
  churned_this_month: number
  
  // Campaigns
  active_campaigns: number
  active_promo_codes: number
  
  // Actions
  pending_renewal_reminders: number
}

export function useSuperAdminStats() {
  return useQuery({
    queryKey: ['super-admin-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_super_admin_dashboard_stats')

      if (error) throw error
      return data as unknown as SuperAdminStats
    },
  })
}

// Get tenant list with subscription details
export function useTenantList() {
  return useQuery({
    queryKey: ['tenant-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          id,
          name,
          subscription_status,
          current_period_end,
          trial_ends_at,
          created_at,
          subscription_plan_id,
          subscription_plan:subscription_plans(
            name,
            code,
            price_monthly,
            max_hotels,
            max_users
          )
        `)
        .neq('id', '00000000-0000-0000-0000-000000000000')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
  })
}

// Get revenue by month for chart
export function useRevenueByMonth(months: number = 6) {
  return useQuery({
    queryKey: ['revenue-by-month', months],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('payment_date, amount')
        .eq('payment_status', 'completed')
        .gte('payment_date', new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('payment_date', { ascending: true })

      if (error) throw error

      // Group by month
      const monthlyRevenue: Record<string, number> = {}
      data?.forEach(transaction => {
        const month = new Date(transaction.payment_date).toLocaleDateString('vi-VN', { 
          year: 'numeric', 
          month: 'short' 
        })
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (transaction.amount || 0)
      })

      return Object.entries(monthlyRevenue).map(([month, revenue]) => ({
        month,
        revenue,
      }))
    },
  })
}

// Get subscription distribution
export function useSubscriptionDistribution() {
  return useQuery({
    queryKey: ['subscription-distribution'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          subscription_plan_id,
          subscription_plan:subscription_plans(code)
        `)
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (error) throw error

      // Count by plan code
      const distribution: Record<string, number> = {}
      data?.forEach((tenant: any) => {
        const tier = tenant.subscription_plan?.code || 'free'
        distribution[tier] = (distribution[tier] || 0) + 1
      })

      return Object.entries(distribution).map(([tier, count]) => ({
        tier,
        count,
      }))
    },
  })
}
