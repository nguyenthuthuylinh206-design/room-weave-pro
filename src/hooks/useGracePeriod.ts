import { useTenantSubscription } from './useSubscription';

export interface GracePeriodStatus {
  isExpired: boolean;
  isInGracePeriod: boolean;
  isGracePeriodExpired: boolean;
  graceDaysRemaining: number;
  graceEndDate: Date | null;
  subscriptionEndDate: Date | null;
  subscriptionStatus: string | null;
  isLoading: boolean;
}

/**
 * Hook to manage grace period status for subscriptions
 * 
 * Grace period is 7 days after subscription_end_date
 * During grace period:
 * - User can still use the system
 * - Warning banners are shown
 * - After grace period expires, account is suspended
 */
export function useGracePeriod(): GracePeriodStatus {
  const { data: subscription, isLoading } = useTenantSubscription();

  const now = new Date();
  
  const endDate = subscription?.subscription_end_date
    ? new Date(subscription.subscription_end_date)
    : null;
    
  const graceEndDate = subscription?.grace_period_ends_at
    ? new Date(subscription.grace_period_ends_at)
    : null;

  const subscriptionStatus = subscription?.subscription_status || null;

  // Calculate status based on dates
  const isExpired = endDate ? endDate < now : false;
  
  const isInGracePeriod = isExpired && graceEndDate ? now < graceEndDate : false;
  
  const isGracePeriodExpired = graceEndDate ? now >= graceEndDate : false;

  // Calculate remaining grace days
  const graceDaysRemaining = isInGracePeriod && graceEndDate
    ? Math.ceil((graceEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    isExpired,
    isInGracePeriod,
    isGracePeriodExpired,
    graceDaysRemaining,
    graceEndDate,
    subscriptionEndDate: endDate,
    subscriptionStatus,
    isLoading,
  };
}

/**
 * Calculate grace period status from subscription data
 * Used for server-side calculations or when subscription data is already available
 */
export function calculateGracePeriodStatus(
  subscriptionEndDate: string | null,
  gracePeriodEndsAt: string | null
): Omit<GracePeriodStatus, 'subscriptionStatus' | 'isLoading'> {
  const now = new Date();
  
  const endDate = subscriptionEndDate ? new Date(subscriptionEndDate) : null;
  const graceEndDate = gracePeriodEndsAt ? new Date(gracePeriodEndsAt) : null;

  const isExpired = endDate ? endDate < now : false;
  const isInGracePeriod = isExpired && graceEndDate ? now < graceEndDate : false;
  const isGracePeriodExpired = graceEndDate ? now >= graceEndDate : false;

  const graceDaysRemaining = isInGracePeriod && graceEndDate
    ? Math.ceil((graceEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    isExpired,
    isInGracePeriod,
    isGracePeriodExpired,
    graceDaysRemaining,
    graceEndDate,
    subscriptionEndDate: endDate,
  };
}
