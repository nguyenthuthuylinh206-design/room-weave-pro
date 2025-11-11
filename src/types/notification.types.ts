// =====================================================
// EMAIL NOTIFICATIONS
// =====================================================

export type EmailNotificationType = 
  | 'subscription_expiring'
  | 'subscription_expired'
  | 'trial_ending'
  | 'trial_ended'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'quota_warning'
  | 'quota_exceeded'
  | 'welcome'
  | 'password_reset'
  | 'account_locked';

export interface EmailNotification {
  id: string;
  tenant_id?: string;
  user_id?: string;
  
  notification_type: EmailNotificationType;
  
  to_email: string;
  to_name?: string;
  
  subject: string;
  
  template_data: Record<string, any>;
  
  status: 'queued' | 'sending' | 'sent' | 'failed' | 'bounced';
  
  sent_at?: string;
  failed_at?: string;
  failure_reason?: string;
  
  retry_count: number;
  max_retries: number;
  next_retry_at?: string;
  
  provider: 'resend' | 'sendgrid' | 'ses';
  provider_message_id?: string;
  
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  type: EmailNotificationType;
  subject: string;
  previewText: string;
}

// Template data interfaces
export interface SubscriptionExpiringData {
  tenant_name: string;
  plan_name: string;
  expires_at: string;
  days_remaining: number;
  renewal_url: string;
}

export interface PaymentSucceededData {
  tenant_name: string;
  amount: number;
  currency: string;
  plan_name: string;
  next_billing_date: string;
  invoice_url?: string;
  receipt_url?: string;
}

export interface PaymentFailedData {
  tenant_name: string;
  amount: number;
  currency: string;
  plan_name: string;
  failure_reason: string;
  retry_date?: string;
  update_payment_url: string;
}

export interface QuotaWarningData {
  tenant_name: string;
  resource_type: string;
  current_usage: number;
  limit: number;
  percentage: number;
  upgrade_url: string;
}

export interface QuotaExceededData {
  tenant_name: string;
  resource_type: string;
  current_usage: number;
  limit: number;
  action_required: string;
  upgrade_url: string;
}
