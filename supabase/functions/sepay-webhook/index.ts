import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normalize string: remove special characters and convert to uppercase
// This helps match "HDMJX15ZZB" with "HD-MJX15ZZB"
function normalizeString(str: string): string {
  return str.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

interface SepayWebhookPayload {
  id: number;
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  subAccount: string | null;
  code: string | null;
  content: string;
  transferType: 'in' | 'out';
  description: string;
  transferAmount: number;
  referenceCode: string;
  accumulated: number;
}

// Log webhook attempt to database for audit trail
async function logWebhookAttempt(
  supabase: any,
  payload: SepayWebhookPayload | null,
  status: 'success' | 'failed' | 'rejected',
  message: string,
  matchedPaymentId?: string
) {
  try {
    await supabase.from('payment_webhook_logs').insert({
      provider: 'sepay',
      payload: payload ? JSON.stringify(payload) : null,
      status,
      message,
      matched_payment_id: matchedPaymentId,
      ip_address: null, // Cannot get IP in edge function
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to log webhook attempt:', err);
  }
}

Deno.serve(async (req) => {
  console.log('=== SePay Webhook Request Received ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  
  // Log headers for debugging
  const headersObj: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headersObj[key] = key.toLowerCase() === 'authorization' ? '[REDACTED]' : value;
  });
  console.log('Headers:', JSON.stringify(headersObj));

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // API key verification - MANDATORY when SEPAY_API_KEY is configured
    // This provides authentication for the webhook endpoint
    const SEPAY_API_KEY = Deno.env.get('SEPAY_API_KEY');
    const authHeader = req.headers.get('Authorization');
    
    if (SEPAY_API_KEY) {
      // If SEPAY_API_KEY is configured, require valid authentication
      if (!authHeader) {
        console.log('REJECTED: No Authorization header but SEPAY_API_KEY is configured');
        await logWebhookAttempt(supabase, null, 'rejected', 'Missing Authorization header');
        return new Response(
          JSON.stringify({ success: false, error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const providedKey = authHeader.replace('Bearer ', '').replace('Apikey ', '');
      if (providedKey !== SEPAY_API_KEY) {
        console.log('REJECTED: API key mismatch');
        await logWebhookAttempt(supabase, null, 'rejected', 'Invalid API key');
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid API key' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('API key verified successfully');
    } else {
      // SEPAY_API_KEY not configured - log warning but allow (for initial setup)
      console.log('WARNING: SEPAY_API_KEY not configured - webhook is not protected');
      console.log('Configure SEPAY_API_KEY secret and enable authentication in SePay dashboard');
    }

    // Parse request body
    let payload: SepayWebhookPayload;
    try {
      const rawBody = await req.text();
      console.log('Raw body:', rawBody);
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('Failed to parse JSON body:', parseError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('Received SePay webhook payload:', JSON.stringify(payload, null, 2));

    // Only process incoming transfers
    if (payload.transferType !== 'in') {
      console.log('Ignoring outgoing transfer');
      return new Response(
        JSON.stringify({ success: true, message: 'Ignored outgoing transfer' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // supabase client already created above

    // Extract invoice number from content (format: HD-XXXXXX or similar)
    const content = payload.content || payload.description || '';
    console.log('Transaction content:', content);

    // Try to find matching pending payment by transaction_reference
    // The transaction_reference is stored when creating the invoice
    const { data: pendingPayments, error: queryError } = await supabase
      .from('payment_transactions')
      .select(`
        *,
        invoice:invoices(id, invoice_number, status, tenant_id, notes)
      `)
      .eq('payment_status', 'pending')
      .eq('payment_method', 'bank_transfer');

    if (queryError) {
      console.error('Error querying pending payments:', queryError);
      throw queryError;
    }

    console.log(`Found ${pendingPayments?.length || 0} pending payments`);

    // Find matching payment by checking if content contains the invoice number or transaction reference
    // Normalize strings to handle banks removing special characters (e.g., "HD-MJX15ZZB" -> "HDMJX15ZZB")
    let matchedPayment = null;
    const normalizedContent = normalizeString(content);
    console.log('Normalized content:', normalizedContent);

    for (const payment of pendingPayments || []) {
      const invoiceNumber = payment.invoice?.invoice_number || '';
      const transactionRef = payment.transaction_reference || '';
      const normalizedInvoiceNum = normalizeString(invoiceNumber);
      const normalizedTransRef = normalizeString(transactionRef);
      
      console.log(`Checking payment ${payment.id}:`);
      console.log(`  - Invoice: "${invoiceNumber}" -> normalized: "${normalizedInvoiceNum}"`);
      console.log(`  - TransRef: "${transactionRef}" -> normalized: "${normalizedTransRef}"`);
      console.log(`  - Content normalized: "${normalizedContent}"`);
      
      // Check if the normalized transfer content contains the normalized invoice number or transaction reference
      const invoiceMatch = normalizedInvoiceNum && normalizedContent.includes(normalizedInvoiceNum);
      const transRefMatch = normalizedTransRef && normalizedContent.includes(normalizedTransRef);
      
      console.log(`  - Invoice match: ${invoiceMatch}, TransRef match: ${transRefMatch}`);
      
      if (invoiceMatch || transRefMatch) {
        // Verify amount matches (with some tolerance for bank fees)
        const amountDiff = Math.abs(payment.amount - payload.transferAmount);
        console.log(`  - Amount check: expected ${payment.amount}, got ${payload.transferAmount}, diff: ${amountDiff}`);
        
        if (amountDiff <= 1000) { // Allow 1000 VND tolerance
          console.log(`  - ✅ MATCHED!`);
          matchedPayment = payment;
          break;
        } else {
          console.log(`  - ❌ Amount mismatch (diff > 1000 VND)`);
        }
      } else {
        console.log(`  - ❌ No content match`);
      }
    }

    if (!matchedPayment) {
      console.log('No matching pending payment found for content:', content);
      console.log('Normalized content was:', normalizedContent);
      
      // Log no match for audit trail
      await logWebhookAttempt(supabase, payload, 'failed', `No matching pending payment found. Content: ${content}, Amount: ${payload.transferAmount}`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No matching pending payment found',
          content: content,
          normalizedContent: normalizedContent,
          amount: payload.transferAmount
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Matched payment: ${matchedPayment.id} for invoice: ${matchedPayment.invoice?.invoice_number}`);

    // Update payment transaction status
    const { error: updatePaymentError } = await supabase
      .from('payment_transactions')
      .update({
        payment_status: 'completed',
        payment_date: new Date().toISOString(),
        gateway_transaction_id: payload.id.toString(),
        notes: `Tự động xác nhận từ SePay. Ref: ${payload.referenceCode}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', matchedPayment.id);

    if (updatePaymentError) {
      console.error('Error updating payment:', updatePaymentError);
      throw updatePaymentError;
    }

    // Update invoice status
    if (matchedPayment.invoice_id) {
      const { error: updateInvoiceError } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', matchedPayment.invoice_id);

      if (updateInvoiceError) {
        console.error('Error updating invoice:', updateInvoiceError);
      }
    }

    // Get tenant to update subscription
    const tenantId = matchedPayment.tenant_id;
    const metadata = matchedPayment.metadata || {};

    // Update tenant subscription based on payment type
    if (metadata.type === 'extend' || metadata.duration_days) {
      // Extend subscription
      const durationDays = metadata.duration_days || 30;
      const rooms = metadata.rooms;

      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('subscription_end_date, registered_rooms')
        .eq('id', tenantId)
        .single();

      if (!tenantError && tenant) {
        const currentEndDate = tenant.subscription_end_date 
          ? new Date(tenant.subscription_end_date) 
          : new Date();
        
        if (currentEndDate < new Date()) {
          currentEndDate.setTime(Date.now());
        }
        
        const newEndDate = new Date(currentEndDate);
        newEndDate.setDate(newEndDate.getDate() + durationDays);

        const updateData: Record<string, unknown> = {
          subscription_end_date: newEndDate.toISOString(),
          updated_at: new Date().toISOString()
        };

        if (rooms) {
          updateData.registered_rooms = rooms;
        }

        await supabase
          .from('tenants')
          .update(updateData)
          .eq('id', tenantId);

        console.log(`Updated tenant ${tenantId}: extended to ${newEndDate.toISOString()}`);
      }
    } else if (metadata.type === 'add_rooms' && metadata.additional_rooms) {
      // Add rooms
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('registered_rooms')
        .eq('id', tenantId)
        .single();

      if (!tenantError && tenant) {
        const newTotalRooms = (tenant.registered_rooms || 0) + metadata.additional_rooms;
        
        await supabase
          .from('tenants')
          .update({
            registered_rooms: newTotalRooms,
            updated_at: new Date().toISOString()
          })
          .eq('id', tenantId);

        console.log(`Updated tenant ${tenantId}: added ${metadata.additional_rooms} rooms, total: ${newTotalRooms}`);
      }
    }

    // Create in-app notification for tenant owner
    const { data: tenantOwner } = await supabase
      .from('users')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('user_level_code', 'tenant_owner')
      .single();

    if (tenantOwner) {
      await supabase
        .from('in_app_notifications')
        .insert({
          user_id: tenantOwner.id,
          tenant_id: tenantId,
          title: 'Thanh toán thành công',
          body: `Đơn hàng ${matchedPayment.invoice?.invoice_number || matchedPayment.id} đã được xác nhận thanh toán tự động.`,
          type: 'payment',
          action_url: '/settings/subscription',
          icon: 'CheckCircle'
        });
    }

    console.log('Payment processed successfully');

    // Log success for audit trail
    await logWebhookAttempt(supabase, payload, 'success', `Payment confirmed for invoice ${matchedPayment.invoice?.invoice_number}`, matchedPayment.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Payment confirmed',
        invoiceNumber: matchedPayment.invoice?.invoice_number,
        amount: payload.transferAmount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
