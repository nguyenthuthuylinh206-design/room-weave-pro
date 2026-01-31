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
    refetchInterval: 300000, // Refetch every 5 minutes
  })
}

export function useDailyMetrics(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['daily-metrics', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('payment_date, amount')
        .eq('payment_status', 'completed')
        .gte('payment_date', startDate)
        .lte('payment_date', endDate)
        .order('payment_date', { ascending: true })

      if (error) throw error
      return data as Array<{ payment_date: string; amount: number }>
    },
  })
}

export function useRevenueByPlan() {
  return useQuery({
    queryKey: ['revenue-by-plan'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          subscription_plan_id,
          subscription_plan:subscription_plans(name, price_monthly, price_yearly),
          billing_cycle
        `)
        .eq('subscription_status', 'active') as any

      if (error) throw error

      const revenueByPlan = (data || []).reduce((acc: any, tenant: any) => {
        const planId = tenant.subscription_plan_id
        const planName = tenant.subscription_plan?.name
        const revenue = tenant.billing_cycle === 'yearly'
          ? tenant.subscription_plan?.price_yearly
          : tenant.subscription_plan?.price_monthly

        if (!acc[planId]) {
          acc[planId] = {
            planName,
            totalRevenue: 0,
            tenantCount: 0,
          }
        }

        acc[planId].totalRevenue += revenue || 0
        acc[planId].tenantCount += 1

        return acc
      }, {})

      return Object.values(revenueByPlan)
    },
  })
}

export function useTenantGrowth(days: number = 30) {
  return useQuery({
    queryKey: ['tenant-growth', days],
    queryFn: async () => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data, error } = await supabase
        .from('tenants')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .neq('id', '00000000-0000-0000-0000-000000000000')
        .order('created_at', { ascending: true })

      if (error) throw error

      const growthByDate = data.reduce((acc: any, tenant: any) => {
        const date = new Date(tenant.created_at).toISOString().split('T')[0]
        acc[date] = (acc[date] || 0) + 1
        return acc
      }, {})

      return Object.entries(growthByDate).map(([date, count]) => ({
        date,
        newTenants: count,
      }))
    },
  })
}

export function useChurnRate(days: number = 30) {
  return useQuery({
    queryKey: ['churn-rate', days],
    queryFn: async () => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { count: startCount, error: startError } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'active')
        .lte('created_at', startDate.toISOString())

      if (startError) throw startError

      const { count: churnedCount, error: churnError } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })
        .in('subscription_status', ['cancelled', 'suspended'])
        .gte('cancelled_at', startDate.toISOString())

      if (churnError) throw churnError

      const churnRate = startCount && startCount > 0
        ? ((churnedCount || 0) / startCount) * 100
        : 0

      return {
        churnedTenants: churnedCount || 0,
        churnRate: churnRate.toFixed(2),
      }
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

// Get conversion metrics (trial to paid)
export function useConversionMetrics(days: number = 30) {
  return useQuery({
    queryKey: ['conversion-metrics', days],
    queryFn: async () => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data, error } = await supabase
        .from('tenants')
        .select('subscription_status, trial_ends_at, created_at')
        .gte('created_at', startDate.toISOString())
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (error) throw error

      // Calculate conversion metrics
      const trials = data.filter(t => t.trial_ends_at)
      const converted = data.filter(t => 
        t.trial_ends_at && 
        t.subscription_status === 'active'
      )

      return {
        totalTrials: trials.length,
        converted: converted.length,
        conversionRate: trials.length > 0 
          ? ((converted.length / trials.length) * 100).toFixed(2)
          : '0'
      }
    },
  })
}
