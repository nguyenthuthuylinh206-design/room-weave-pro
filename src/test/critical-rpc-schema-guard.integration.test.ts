/**
 * Integration test: Critical RPC schema guard
 *
 * Mục đích: Chặn regression dạng "cột/bảng/function không tồn tại" (Postgres
 * 42703 / 42P01 / 42883 / 42P18) cho các RPC critical mà toàn bộ flow vận
 * hành dựa vào. Mỗi RPC được gọi qua anon client với tham số tối thiểu hợp
 * lệ về type. Test KHÔNG kiểm tra business logic — chỉ assert lỗi trả về
 * (nếu có) KHÔNG phải lỗi schema.
 *
 * Bối cảnh: Sprint A3+B đã từng để lọt `lv.logo_url` (cột không tồn tại)
 * trong RPC mới làm /laundry trả 500. Test này bắt sớm các regression
 * tương tự ở 7 RPC critical:
 *   - create_distribution_order
 *   - create_inbound_transaction
 *   - create_outbound_transaction
 *   - create_laundry_loss_transaction
 *   - create_laundry_return_transaction
 *   - perform_checkin
 *   - perform_checkout
 *
 * Liên quan: docs/architecture/09-refactor/findings.md → F-RPC-OVERLOAD-02.
 */
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ehjtoajnlnuvuiwkpmbp.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoanRvYWpubG51dnVpd2twbWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MTg4MzMsImV4cCI6MjA3ODA5NDgzM30.O_N46ZbUblhWmiJk2VAm9thcOkyFKcDqcMcsb44kqjI';

// Tenant + hotel test thật trong Cloud — dùng để các RPC qua được tiền-validate
// auth/permission rồi chạm tới phần SQL có thể reveal lỗi cột/bảng. Không
// thực sự ghi dữ liệu vì items=[] hoặc fail ở foreign key.
const TEST_TENANT_ID = 'de5d8d2c-1cc5-4926-a841-1a597747308b';
const FAKE_UUID = '00000000-0000-0000-0000-000000000000';

// Postgres error codes báo hiệu schema/binding regression — KHÔNG được phép.
//  - 42703: undefined_column
//  - 42P01: undefined_table
//  - 42883: undefined_function (sai signature / overload bị drop)
//  - 42P18: indeterminate_datatype
//  - 42P17: invalid_object_definition (function body hỏng)
const SCHEMA_ERROR_CODES = new Set(['42703', '42P01', '42883', '42P18', '42P17']);

function assertNoSchemaError(error: unknown, label: string) {
  if (!error) return;
  const err = error as { code?: string; message?: string };
  if (err.code && SCHEMA_ERROR_CODES.has(err.code)) {
    throw new Error(
      `[${label}] Schema regression detected (code=${err.code}): ${err.message}`,
    );
  }
  // Cũng bắt schema error qua message khi PostgREST không gắn code.
  const msg = (err.message || '').toLowerCase();
  if (
    msg.includes('does not exist') &&
    (msg.includes('column') || msg.includes('relation') || msg.includes('function'))
  ) {
    throw new Error(
      `[${label}] Schema regression detected (message): ${err.message}`,
    );
  }
}

describe('Critical RPC schema guard (integration)', () => {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  it('create_distribution_order: không có schema error', async () => {
    const { error } = await client.rpc('create_distribution_order', {
      p_tenant_id: TEST_TENANT_ID,
      p_hotel_id: FAKE_UUID,
      p_created_by: FAKE_UUID,
      p_assigned_to: FAKE_UUID,
      p_rooms: [],
      p_notes: null,
      p_auto_release: false,
      p_supplement_request_ids: null,
    });
    assertNoSchemaError(error, 'create_distribution_order');
  });

  it('create_inbound_transaction: không có schema error', async () => {
    const { error } = await client.rpc('create_inbound_transaction', {
      p_tenant_id: TEST_TENANT_ID,
      p_hotel_id: FAKE_UUID,
      p_transaction_category: 'purchase',
      p_from_location: 'Test',
      p_to_location: 'Test',
      p_created_by: FAKE_UUID,
      p_items: [],
      p_related_type: null,
      p_related_id: null,
      p_documents: null,
      p_photos: null,
      p_notes: null,
      p_to_warehouse_id: null,
    });
    assertNoSchemaError(error, 'create_inbound_transaction');
  });

  it('create_outbound_transaction: không có schema error', async () => {
    const { error } = await client.rpc('create_outbound_transaction', {
      p_tenant_id: TEST_TENANT_ID,
      p_hotel_id: FAKE_UUID,
      p_transaction_category: 'consumption',
      p_from_location: 'Test',
      p_to_location: 'Test',
      p_created_by: FAKE_UUID,
      p_items: [],
      p_related_type: null,
      p_related_id: null,
      p_recipient_name: null,
      p_recipient_signature: null,
      p_documents: null,
      p_photos: null,
      p_notes: null,
      p_from_warehouse_id: null,
    });
    assertNoSchemaError(error, 'create_outbound_transaction');
  });

  it('create_laundry_loss_transaction: không có schema error', async () => {
    const { error } = await client.rpc('create_laundry_loss_transaction', {
      p_tenant_id: TEST_TENANT_ID,
      p_hotel_id: FAKE_UUID,
      p_created_by: FAKE_UUID,
      p_items: [],
      p_loss_type: 'lost',
      p_related_id: null,
      p_notes: null,
    });
    assertNoSchemaError(error, 'create_laundry_loss_transaction');
  });

  it('create_laundry_return_transaction: không có schema error', async () => {
    const { error } = await client.rpc('create_laundry_return_transaction', {
      p_tenant_id: TEST_TENANT_ID,
      p_hotel_id: FAKE_UUID,
      p_from_location: 'Đơn vị giặt',
      p_to_location: 'Test',
      p_created_by: FAKE_UUID,
      p_items: [],
      p_related_id: null,
      p_notes: null,
    });
    assertNoSchemaError(error, 'create_laundry_return_transaction');
  });

  it('perform_checkin: không có schema error', async () => {
    const { error } = await client.rpc('perform_checkin', {
      p_booking_id: FAKE_UUID,
      p_room_id: FAKE_UUID,
      p_early_checkin_charge: 0,
    });
    assertNoSchemaError(error, 'perform_checkin');
  });

  it('perform_checkout: không có schema error', async () => {
    const { error } = await client.rpc('perform_checkout', {
      p_booking_id: FAKE_UUID,
      p_room_id: FAKE_UUID,
      p_late_checkout_charge: 0,
      p_service_charges: 0,
      p_subtotal: 0,
      p_vat_amount: 0,
      p_service_fee_amount: 0,
      p_total_amount: 0,
      p_damage_charges: 0,
      p_damage_notes: null,
      p_damage_items: [],
      p_new_amount_paid: null,
      p_check_out_date: null,
    });
    assertNoSchemaError(error, 'perform_checkout');
  });
});
