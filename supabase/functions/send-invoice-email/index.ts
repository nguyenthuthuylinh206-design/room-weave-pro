import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { invoice_id, to_email } = await req.json()

    if (!invoice_id || !to_email) {
      return new Response(JSON.stringify({ error: 'Missing invoice_id or to_email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: invoice, error: invoiceError } = await supabase
      .from('guest_invoices')
      .select('*')
      .eq('id', invoice_id)
      .single()

    if (invoiceError || !invoice) {
      return new Response(JSON.stringify({ error: 'Invoice not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const lineItems = (invoice.line_items || []) as any[]
    const remaining = invoice.total_amount - invoice.amount_paid

    const emailHtml = `
      <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;font-size:14px;color:#333;">
        <h2 style="text-align:center;">HÓA ĐƠN THANH TOÁN</h2>
        <p style="text-align:center;color:#666;">Số: ${invoice.invoice_number}</p>
        
        <div style="margin:16px 0;padding:12px;background:#f9f9f9;border-radius:8px;">
          <p><strong>Khách hàng:</strong> ${invoice.guest_name}</p>
          ${invoice.guest_phone ? `<p><strong>SĐT:</strong> ${invoice.guest_phone}</p>` : ''}
          ${invoice.room_number ? `<p><strong>Phòng:</strong> ${invoice.room_number}</p>` : ''}
        </div>

        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <thead>
            <tr style="border-bottom:2px solid #333;">
              <th style="text-align:left;padding:8px;">Nội dung</th>
              <th style="text-align:right;padding:8px;">SL</th>
              <th style="text-align:right;padding:8px;">Đơn giá</th>
              <th style="text-align:right;padding:8px;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${lineItems.map(item => `
              <tr style="border-bottom:1px solid #eee;">
                <td style="padding:6px 8px;">${item.description || ''}</td>
                <td style="text-align:right;padding:6px 8px;">${item.quantity}</td>
                <td style="text-align:right;padding:6px 8px;">${formatVND(item.unit_price)}</td>
                <td style="text-align:right;padding:6px 8px;">${formatVND(item.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="text-align:right;margin-top:16px;">
          <p>Tạm tính: <strong>${formatVND(invoice.subtotal)}</strong></p>
          ${invoice.vat_amount > 0 ? `<p>VAT (${Math.round(invoice.vat_rate * 100)}%): <strong>${formatVND(invoice.vat_amount)}</strong></p>` : ''}
          ${invoice.service_fee_amount > 0 ? `<p>Phí DV (${Math.round(invoice.service_fee_rate * 100)}%): <strong>${formatVND(invoice.service_fee_amount)}</strong></p>` : ''}
          <p style="font-size:18px;font-weight:bold;border-top:2px solid #333;padding-top:8px;">TỔNG: ${formatVND(invoice.total_amount)}</p>
          ${invoice.amount_paid > 0 ? `<p>Đã thanh toán: ${formatVND(invoice.amount_paid)}</p>` : ''}
          ${remaining > 0 ? `<p style="color:#c00;font-weight:bold;">Còn lại: ${formatVND(remaining)}</p>` : ''}
        </div>
      </div>
    `

    // Update guest_email on the invoice
    await supabase
      .from('guest_invoices')
      .update({ guest_email: to_email, email_sent_at: new Date().toISOString() })
      .eq('id', invoice_id)

    // Try to enqueue email if infrastructure exists, otherwise just log
    try {
      await supabase.rpc('enqueue_email', {
        p_message_id: `invoice-${invoice_id}-${Date.now()}`,
        p_queue_name: 'transactional_emails',
        p_to_email: to_email,
        p_subject: `Hóa đơn ${invoice.invoice_number}`,
        p_html_body: emailHtml,
        p_template_name: 'guest-invoice',
        p_metadata: { invoice_id, invoice_number: invoice.invoice_number },
      })
    } catch {
      // Email infrastructure not set up, just update the record
      console.log('Email queue not available, skipping send')
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
