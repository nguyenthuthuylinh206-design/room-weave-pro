import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SEPAY_API_KEY = Deno.env.get('SEPAY_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify API key from header (SePay sends it in Authorization header)
    const authHeader = req.headers.get('Authorization');
    const providedKey = authHeader?.replace('Bearer ', '').replace('Apikey ', '');
    
    if (SEPAY_API_KEY && providedKey !== SEPAY_API_KEY) {
      console.log('Invalid API key provided');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: SepayWebhookPayload = await req.json();
    console.log('Received SePay webhook:', JSON.stringify(payload));

    // Only process incoming transfers
    if (payload.transferType !== 'in') {
      console.log('Ignoring outgoing transfer');
      return new Response(
        JSON.stringify({ success: true, message: 'Ignored outgoing transfer' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
    let matchedPayment = null;
    for (const payment of pendingPayments || []) {
      const invoiceNumber = payment.invoice?.invoice_number || '';
      const transactionRef = payment.transaction_reference || '';
      
      // Check if the transfer content contains the invoice number or transaction reference
      if (
        (invoiceNumber && content.toUpperCase().includes(invoiceNumber.toUpperCase())) ||
        (transactionRef && content.toUpperCase().includes(transactionRef.toUpperCase()))
      ) {
        // Verify amount matches (with some tolerance for bank fees)
        const amountDiff = Math.abs(payment.amount - payload.transferAmount);
        if (amountDiff <= 1000) { // Allow 1000 VND tolerance
          matchedPayment = payment;
          break;
        } else {
          console.log(`Amount mismatch: expected ${payment.amount}, got ${payload.transferAmount}`);
        }
      }
    }

    if (!matchedPayment) {
      console.log('No matching pending payment found for content:', content);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No matching pending payment found',
          content: content,
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
