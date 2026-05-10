import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normalize string: remove special characters and convert to uppercase
function normalizeString(str: string): string {
  return str.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

interface SepayTransaction {
  id: number;
  transaction_date: string;
  amount_in: number;
  amount_out: number;
  accumulated: number;
  transaction_content: string;
  reference_number: string;
  code: string | null;
  sub_account: string | null;
  bank_brand_name: string;
  account_number: string;
}

interface PendingPayment {
  id: string;
  amount: number;
  transaction_reference: string | null;
  tenant_id: string;
  invoice_id: string | null;
  metadata: Record<string, unknown> | null;
  invoice: {
    id: string;
    invoice_number: string;
    status: string;
    tenant_id: string;
  } | null;
}

Deno.serve(async (req) => {
  console.log('=== Sync SePay Transactions ===');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const SEPAY_API_KEY = Deno.env.get('SEPAY_API_KEY');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Verify user is authenticated and is owner/super_admin
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        console.log('Auth error or no user:', authError?.message);
      } else {
        // Check user level
        const { data: userData } = await supabase
          .from('users')
          .select('user_level_code')
          .eq('id', user.id)
          .single();
        
        if (userData && !['super_admin', 'tenant_owner'].includes(userData.user_level_code)) {
          return new Response(
            JSON.stringify({ success: false, error: 'Unauthorized - Owner or Super Admin required' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Get pending bank transfer payments
    const { data: pendingPayments, error: queryError } = await supabase
      .from('payment_transactions')
      .select(`
        *,
        invoice:invoices(id, invoice_number, status, tenant_id)
      `)
      .eq('payment_status', 'pending')
      .eq('payment_method', 'bank_transfer');

    if (queryError) {
      console.error('Error querying pending payments:', queryError);
      throw queryError;
    }

    console.log(`Found ${pendingPayments?.length || 0} pending payments`);

    if (!pendingPayments || pendingPayments.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No pending payments to sync',
          matched: 0,
          pending: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get bank settings to find account number
    const { data: bankSettings } = await supabase
      .from('bank_payment_settings')
      .select('account_number')
      .eq('is_active', true)
      .single();

    if (!bankSettings) {
      return new Response(
        JSON.stringify({ success: false, error: 'No active bank payment settings found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch transactions from SePay API
    // SePay API: GET https://my.sepay.vn/userapi/transactions/list
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7); // Last 7 days
    const toDate = new Date();

    const sepayUrl = new URL('https://my.sepay.vn/userapi/transactions/list');
    sepayUrl.searchParams.set('account_number', bankSettings.account_number);
    sepayUrl.searchParams.set('transaction_date_min', fromDate.toISOString().split('T')[0]);
    sepayUrl.searchParams.set('transaction_date_max', toDate.toISOString().split('T')[0]);
    sepayUrl.searchParams.set('limit', '100');

    console.log('Fetching SePay transactions from:', sepayUrl.toString());

    const sepayResponse = await fetch(sepayUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SEPAY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!sepayResponse.ok) {
      const errorText = await sepayResponse.text();
      console.error('SePay API error:', sepayResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `SePay API error: ${sepayResponse.status}`,
          details: errorText
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sepayData = await sepayResponse.json();
    const transactions: SepayTransaction[] = sepayData.transactions || [];
    
    console.log(`Fetched ${transactions.length} transactions from SePay`);

    // Only process incoming transactions (amount_in > 0)
    const incomingTransactions = transactions.filter(t => t.amount_in > 0);
    console.log(`${incomingTransactions.length} incoming transactions`);

    let matchedCount = 0;
    const matchedPayments: string[] = [];

    // Try to match each pending payment with SePay transactions
    for (const payment of pendingPayments as PendingPayment[]) {
      const invoiceNumber = payment.invoice?.invoice_number || '';
      const transactionRef = payment.transaction_reference || '';
      const normalizedInvoiceNum = normalizeString(invoiceNumber);
      const normalizedTransRef = normalizeString(transactionRef);

      console.log(`\nChecking payment ${payment.id}:`);
      console.log(`  Invoice: ${invoiceNumber} -> ${normalizedInvoiceNum}`);
      console.log(`  TransRef: ${transactionRef} -> ${normalizedTransRef}`);

      for (const sepayTx of incomingTransactions) {
        const content = sepayTx.transaction_content || '';
        const normalizedContent = normalizeString(content);

        const invoiceMatch = normalizedInvoiceNum && normalizedContent.includes(normalizedInvoiceNum);
        const transRefMatch = normalizedTransRef && normalizedContent.includes(normalizedTransRef);

        if (invoiceMatch || transRefMatch) {
          // Verify amount matches (with tolerance)
          const amountDiff = Math.abs(payment.amount - sepayTx.amount_in);
          
          if (amountDiff <= 1000) { // Allow 1000 VND tolerance
            console.log(`  ✅ MATCHED with SePay tx ${sepayTx.id}`);
            console.log(`    Content: ${content}`);
            console.log(`    Amount: ${sepayTx.amount_in}`);

            // Update payment transaction
            const { error: updatePaymentError } = await supabase
              .from('payment_transactions')
              .update({
                payment_status: 'completed',
                payment_date: new Date().toISOString(),
                gateway_transaction_id: sepayTx.id.toString(),
                notes: `Đồng bộ từ SePay. Ref: ${sepayTx.reference_number}`,
                updated_at: new Date().toISOString()
              })
              .eq('id', payment.id);

            if (updatePaymentError) {
              console.error('Error updating payment:', updatePaymentError);
              continue;
            }

            // Update invoice status
            if (payment.invoice_id) {
              await supabase
                .from('invoices')
                .update({
                  status: 'paid',
                  paid_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .eq('id', payment.invoice_id);
            }

            // Update tenant subscription
            const tenantId = payment.tenant_id;
            const metadata = payment.metadata || {};

            if (metadata.type === 'extend' || metadata.duration_days) {
              const durationDays = (metadata.duration_days as number) || 30;
              const rooms = metadata.rooms as number | undefined;

              const { data: tenant } = await supabase
                .from('tenants')
                .select('subscription_end_date, registered_rooms')
                .eq('id', tenantId)
                .single();

              if (tenant) {
                let currentEndDate = tenant.subscription_end_date 
                  ? new Date(tenant.subscription_end_date) 
                  : new Date();
                
                if (currentEndDate < new Date()) {
                  currentEndDate = new Date();
                }
                
                const newEndDate = new Date(currentEndDate);
                newEndDate.setDate(newEndDate.getDate() + durationDays);

                // Get plan max_rooms for validation
                const { data: tenantWithPlan } = await supabase
                  .from('tenants')
                  .select('subscription_plan_id, subscription_plans(max_rooms)')
                  .eq('id', tenantId)
                  .single();

                const planMaxRooms = (tenantWithPlan?.subscription_plans as any)?.max_rooms;

                const updateData: Record<string, unknown> = {
                  subscription_end_date: newEndDate.toISOString(),
                  subscription_status: 'active',
                  grace_period_ends_at: null,
                  updated_at: new Date().toISOString()
                };

                if (rooms) {
                  // Cap rooms to plan limit
                  updateData.registered_rooms = planMaxRooms ? Math.min(rooms, planMaxRooms) : rooms;
                }

                await supabase
                  .from('tenants')
                  .update(updateData)
                  .eq('id', tenantId);

                console.log(`  Updated tenant ${tenantId}: extended to ${newEndDate.toISOString()}`);
              }
            } else if (metadata.type === 'add_rooms' && metadata.additional_rooms) {
              const { data: tenant } = await supabase
                .from('tenants')
                .select('registered_rooms')
                .eq('id', tenantId)
                .single();

              if (tenant) {
                // Get plan max_rooms for validation
                const { data: tenantPlan } = await supabase
                  .from('tenants')
                  .select('subscription_plans(max_rooms)')
                  .eq('id', tenantId)
                  .single();

                const maxRooms = (tenantPlan?.subscription_plans as any)?.max_rooms;
                let newTotalRooms = (tenant.registered_rooms || 0) + (metadata.additional_rooms as number);
                
                // Cap to plan limit
                if (maxRooms) {
                  newTotalRooms = Math.min(newTotalRooms, maxRooms);
                }
                
                await supabase
                  .from('tenants')
                  .update({
                    registered_rooms: newTotalRooms,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', tenantId);

                console.log(`  Updated tenant ${tenantId}: added rooms, total: ${newTotalRooms}`);
              }
            }

            // Create notification
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
                  title: 'Thanh toán đã được đồng bộ',
                  body: `Đơn hàng ${invoiceNumber} đã được xác nhận thanh toán.`,
                  type: 'payment',
                  action_url: '/settings/subscription',
                  icon: 'CheckCircle'
                });
            }

            matchedCount++;
            matchedPayments.push(invoiceNumber);
            break; // Move to next payment
          }
        }
      }
    }

    // ====== ANOMALY DETECTION (Sprint 3.1) ======
    // Find SePay transactions that didn't match any payment, or matched but with amount diff > tolerance.
    // Skip transactions older than 30 days to avoid backlog spam.
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)

    const matchedSepayTxIds = new Set<string>()
    // Re-scan to know which sepay tx were matched (matchedPayments only stores invoice numbers)
    for (const payment of pendingPayments as PendingPayment[]) {
      const invoiceNumber = payment.invoice?.invoice_number || ''
      if (matchedPayments.includes(invoiceNumber)) {
        const normalizedInv = normalizeString(invoiceNumber)
        for (const tx of incomingTransactions) {
          const normalizedContent = normalizeString(tx.transaction_content || '')
          if (normalizedInv && normalizedContent.includes(normalizedInv)) {
            matchedSepayTxIds.add(String(tx.id))
            break
          }
        }
      }
    }

    let anomalyCount = 0
    for (const tx of incomingTransactions) {
      if (matchedSepayTxIds.has(String(tx.id))) continue
      const txDate = tx.transaction_date ? new Date(tx.transaction_date) : null
      if (txDate && txDate < cutoff) continue

      // Try to find a partial match (invoice number in content, but amount differs >1k)
      const normalizedContent = normalizeString(tx.transaction_content || '')
      let partialMatch: PendingPayment | null = null
      for (const p of pendingPayments as PendingPayment[]) {
        const inv = normalizeString(p.invoice?.invoice_number || '')
        if (inv && normalizedContent.includes(inv)) {
          partialMatch = p
          break
        }
      }

      const anomalyType = partialMatch ? 'amount_mismatch' : 'unmatched'
      const tenantId = partialMatch?.tenant_id || null

      const { error: anomalyErr } = await supabase
        .from('payment_anomalies')
        .upsert(
          {
            tenant_id: tenantId,
            anomaly_type: anomalyType,
            sepay_tx_id: String(tx.id),
            sepay_reference: tx.reference_number,
            sepay_content: tx.transaction_content,
            sepay_amount: tx.amount_in,
            sepay_date: tx.transaction_date,
            sepay_account: tx.account_number,
            expected_payment_id: partialMatch?.id || null,
            expected_invoice_number: partialMatch?.invoice?.invoice_number || null,
            expected_amount: partialMatch?.amount || null,
            amount_diff: partialMatch ? tx.amount_in - partialMatch.amount : null,
          },
          { onConflict: 'sepay_tx_id,anomaly_type', ignoreDuplicates: false },
        )
      if (!anomalyErr) anomalyCount++
    }
    console.log(`Logged ${anomalyCount} anomalies`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${matchedCount} payment(s), ${anomalyCount} anomalies`,
        matched: matchedCount,
        matchedInvoices: matchedPayments,
        pending: pendingPayments.length - matchedCount,
        anomalies: anomalyCount,
        totalTransactions: incomingTransactions.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error) {
    console.error('Sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
