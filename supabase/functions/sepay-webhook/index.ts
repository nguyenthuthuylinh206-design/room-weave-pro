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

// Phase 1 — Lượt 2: đọc payment_tolerance_vnd theo tenant.
// Cache trong process để tránh query lặp khi xử lý nhiều payment cùng webhook.
const TOLERANCE_FALLBACK_VND = 1000;
const toleranceCache = new Map<string, number>();
async function getTenantTolerance(supabase: any, tenantId: string | null | undefined): Promise<number> {
  if (!tenantId) return TOLERANCE_FALLBACK_VND;
  if (toleranceCache.has(tenantId)) return toleranceCache.get(tenantId)!;
  try {
    const { data } = await supabase
      .from('tenants')
      .select('payment_tolerance_vnd')
      .eq('id', tenantId)
      .maybeSingle();
    const v = Number(data?.payment_tolerance_vnd ?? TOLERANCE_FALLBACK_VND);
    const tol = Number.isFinite(v) && v >= 0 ? v : TOLERANCE_FALLBACK_VND;
    toleranceCache.set(tenantId, tol);
    return tol;
  } catch {
    return TOLERANCE_FALLBACK_VND;
  }
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
        // Verify amount matches (tolerance theo tenant — Phase 1)
        const tenantId = payment.invoice?.tenant_id || null;
        const tolerance = await getTenantTolerance(supabase, tenantId);
        const amountDiff = Math.abs(payment.amount - payload.transferAmount);
        console.log(`  - Amount check: expected ${payment.amount}, got ${payload.transferAmount}, diff: ${amountDiff}, tolerance: ${tolerance}`);

        if (amountDiff <= tolerance) {
          console.log(`  - ✅ MATCHED!`);
          matchedPayment = payment;
          break;
        } else {
          console.log(`  - ❌ Amount mismatch (diff > ${tolerance} VND)`);
        }
      } else {
        console.log(`  - ❌ No content match`);
      }
    }

    // If no matching payment_transaction, try booking_payments
    if (!matchedPayment) {
      console.log('No matching payment_transaction, trying booking_payments...');
      
      // Query pending booking payments
      const { data: bookingPayments, error: bookingQueryError } = await supabase
        .from('booking_payments')
        .select(`
          *,
          booking:room_bookings(id, total_amount, amount_paid, guest_name, tenant_id)
        `)
        .eq('payment_status', 'pending')
        .eq('payment_method', 'bank_transfer');

      if (bookingQueryError) {
        console.error('Error querying booking payments:', bookingQueryError);
      } else {
        console.log(`Found ${bookingPayments?.length || 0} pending booking payments`);

        for (const bp of bookingPayments || []) {
          const transRef = bp.transaction_reference || '';
          const normalizedTransRef = normalizeString(transRef);
          
          console.log(`Checking booking payment ${bp.id}:`);
          console.log(`  - TransRef: "${transRef}" -> normalized: "${normalizedTransRef}"`);
          
          if (normalizedTransRef && normalizedContent.includes(normalizedTransRef)) {
            const amountDiff = Math.abs(bp.amount - payload.transferAmount);
            console.log(`  - Amount check: expected ${bp.amount}, got ${payload.transferAmount}, diff: ${amountDiff}`);
            
            if (amountDiff <= 1000) {
              console.log(`  - ✅ MATCHED BOOKING PAYMENT!`);
              
              // Update booking payment status
              const { error: updateBpError } = await supabase
                .from('booking_payments')
                .update({
                  payment_status: 'completed',
                  paid_at: new Date().toISOString(),
                })
                .eq('id', bp.id);

              if (updateBpError) {
                console.error('Error updating booking payment:', updateBpError);
                throw updateBpError;
              }

              // Check if this is a group payment
              const bpMetadata = (bp.metadata as Record<string, unknown>) || {};
              const isGroupPayment = bpMetadata.is_group_payment === true;
              const bookingIds = (bpMetadata.booking_ids as string[]) || (bp.booking_id ? [bp.booking_id] : []);

              if (isGroupPayment && bookingIds.length > 1) {
                // Handle group payment - distribute across all bookings
                console.log(`Processing GROUP payment for ${bookingIds.length} bookings`);
                
                // Fetch all bookings in the group
                const { data: groupBookings, error: groupQueryError } = await supabase
                  .from('room_bookings')
                  .select('id, total_amount, amount_paid, status')
                  .in('id', bookingIds);

                if (groupQueryError) {
                  console.error('Error fetching group bookings:', groupQueryError);
                } else if (groupBookings && groupBookings.length > 0) {
                  // Build calculated totals map from metadata (includes overdue, VAT, fees)
                  const roomCostsByBooking = (bpMetadata.room_costs_by_booking as Array<{ bookingId: string; calculatedTotal: number }>) || [];
                  const calcTotalMap = new Map<string, number>();
                  for (const rc of roomCostsByBooking) {
                    calcTotalMap.set(rc.bookingId, rc.calculatedTotal);
                  }

                  // Sort: checked_out first, then checked_in, then others
                  const sortedBookings = [...groupBookings].sort((a, b) => {
                    const statusOrder = { 'checked_out': 0, 'checked_in': 1 };
                    const aOrder = statusOrder[a.status as keyof typeof statusOrder] ?? 2;
                    const bOrder = statusOrder[b.status as keyof typeof statusOrder] ?? 2;
                    return aOrder - bOrder;
                  });

                  // Distribute payment across bookings using atomic RPC
                  let remainingAmount = bp.amount;
                  for (const booking of sortedBookings) {
                    if (remainingAmount <= 0) break;

                    const currentPaid = booking.amount_paid || 0;
                    // Use calculated total from metadata if available, fallback to DB total_amount
                    const totalAmount = calcTotalMap.get(booking.id) ?? (booking.total_amount || 0);
                    const owed = totalAmount - currentPaid;

                    if (owed <= 0) continue;

                    const payForThis = Math.min(remainingAmount, owed);

                    console.log(`  Distributing ${payForThis} to booking ${booking.id} (owed: ${owed}, calcTotal: ${totalAmount})`);

                    const { error: updateError } = await supabase.rpc('update_booking_amount_paid', {
                      p_booking_id: booking.id,
                      p_amount_to_add: payForThis,
                      p_total_amount: totalAmount,
                    });

                    if (updateError) {
                      console.error(`Error updating booking ${booking.id}:`, updateError);
                    }

                    remainingAmount -= payForThis;
                  }

                  console.log(`Group payment distribution complete. Remaining: ${remainingAmount}`);
                }
              } else if (bp.booking) {
                // Single booking payment - use atomic RPC
                const totalAmount = bp.booking.total_amount || 0;

                const { error: updateBookingError } = await supabase.rpc('update_booking_amount_paid', {
                  p_booking_id: bp.booking_id,
                  p_amount_to_add: bp.amount,
                  p_total_amount: totalAmount,
                });

                if (updateBookingError) {
                  console.error('Error updating room booking:', updateBookingError);
                }
              }

              console.log('Booking payment processed successfully');
              await logWebhookAttempt(supabase, payload, 'success', `Booking payment confirmed: ${bp.transaction_reference}`, bp.id);

              return new Response(
                JSON.stringify({
                  success: true,
                  message: 'Booking payment confirmed',
                  transactionReference: bp.transaction_reference,
                  amount: payload.transferAmount
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }
        }
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

    // Fetch plan limit for validation
    let planMaxRooms: number | null = null;
    const { data: tenantWithPlan } = await supabase
      .from('tenants')
      .select('subscription_plan_id')
      .eq('id', tenantId)
      .single();

    if (tenantWithPlan?.subscription_plan_id) {
      const { data: plan } = await supabase
        .from('subscription_plans')
        .select('max_rooms')
        .eq('id', tenantWithPlan.subscription_plan_id)
        .single();
      planMaxRooms = plan?.max_rooms || null;
    }
    console.log(`Plan max_rooms for tenant ${tenantId}: ${planMaxRooms}`);

    // Update tenant subscription based on payment type
    if (metadata.type === 'extend' || metadata.duration_days) {
      // Extend subscription
      const durationDays = metadata.duration_days || 30;
      let rooms = metadata.rooms;

      // Validate rooms against plan limit
      if (rooms && planMaxRooms && rooms > planMaxRooms) {
        console.log(`Capping rooms from ${rooms} to plan max ${planMaxRooms}`);
        rooms = planMaxRooms;
      }

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
          subscription_status: 'active',
          grace_period_ends_at: null,
          updated_at: new Date().toISOString()
        };

        if (rooms) {
          updateData.registered_rooms = rooms;
        }

        await supabase
          .from('tenants')
          .update(updateData)
          .eq('id', tenantId);

        console.log(`Updated tenant ${tenantId}: extended to ${newEndDate.toISOString()}, status reset to active`);
      }
    } else if (metadata.type === 'add_rooms' && metadata.additional_rooms) {
      // Add rooms
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('registered_rooms')
        .eq('id', tenantId)
        .single();

      if (!tenantError && tenant) {
        let newTotalRooms = (tenant.registered_rooms || 0) + metadata.additional_rooms;
        
        // Validate against plan limit
        if (planMaxRooms && newTotalRooms > planMaxRooms) {
          console.log(`Capping add_rooms total from ${newTotalRooms} to plan max ${planMaxRooms}`);
          newTotalRooms = planMaxRooms;
        }
        
        await supabase
          .from('tenants')
          .update({
            registered_rooms: newTotalRooms,
            subscription_status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', tenantId);

        console.log(`Updated tenant ${tenantId}: added ${metadata.additional_rooms} rooms, total: ${newTotalRooms}, status reset to active`);
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
