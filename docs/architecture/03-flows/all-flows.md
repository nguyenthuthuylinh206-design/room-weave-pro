# Flows tổng hợp (sequence diagrams)

> Gom các flow chính vào 1 file để dễ đối chiếu.

## 1. Booking lifecycle (daily)

```mermaid
sequenceDiagram
  autonumber
  participant Rec as Reception
  participant FE as Frontend
  participant DB as DB (RPC)
  participant Out as Outbox
  Rec->>FE: Booking wizard 5 bước
  FE->>DB: insert room_bookings (status=pending)
  Rec->>FE: Thu cọc (deposit)
  FE->>DB: insert booking_payments
  Note over Rec,DB: Khách đến
  Rec->>FE: Bấm Check-in
  FE->>DB: perform_checkin(booking_id)
  DB->>DB: validate room status, transition_room_status → occupied
  DB->>DB: transition_booking_status → checked_in
  DB->>DB: audit_log
  DB-->>FE: ok
  Note over Rec,DB: Khách trả phòng
  Rec->>FE: Bấm Check-out
  FE->>DB: perform_checkout(booking_id, final_amount)
  DB->>DB: tính tiền (room + service + minibar + vat - discount)
  DB->>DB: transition_room_status → checked_out_pending
  DB->>DB: transition_booking_status → checked_out
  DB->>Out: enqueue room cleaning task
```

## 2. Room Check Lean

```mermaid
sequenceDiagram
  autonumber
  participant HK as Housekeeping staff
  participant FE as Frontend (Lean)
  participant LS as LocalStorage (draft)
  participant DB as DB
  participant Out as Outbox
  HK->>FE: /rooms/:id/check-lean
  FE->>DB: get_last_room_check + load room_items
  FE->>LS: useLeanDraft (resume nếu có)
  alt Quick path (daily/periodic)
    HK->>FE: "Phòng OK toàn bộ"
    FE->>DB: perform_quick_room_check(room_id, type)
    DB->>DB: insert room_check (no issues), audit
  else Lean
    HK->>FE: tap items → ReportIssueSheet
    FE->>LS: autosave draft 24h
    HK->>FE: Submit
    FE->>DB: submit_room_check_lean(session, issues[])
    DB->>DB: validate qty>0, photo per-bucket
    DB->>DB: insert room_check_issues (2-pass: primary + derived)
    DB->>Out: outbox events
  end
  Out->>DB: process-room-check-outbox (cron)
  DB->>DB: stock--, distribution_order create, chargeable_consumptions
```

## 3. SePay payment match

(Xem `01-modules/payment.md` — đã có sequence diagram đầy đủ.)

## 4. Group checkout (manual post-payment)

```mermaid
sequenceDiagram
  autonumber
  participant Rec as Reception
  participant FE
  participant DB
  Rec->>FE: Tổng hợp nhóm + tạo QR pay tổng
  FE->>DB: insert payment_transactions (group)
  Note over FE,DB: Khách chuyển khoản → SePay webhook → completed
  DB-->>FE: realtime: payment completed
  FE->>Rec: Hiển thị "Thanh toán thành công - Cần checkout thủ công"
  Rec->>FE: (yêu cầu) Inspection từng phòng (Room Check)
  FE->>DB: submit room checks
  Rec->>FE: Bấm "Checkout cả nhóm"
  loop mỗi booking
    FE->>DB: perform_checkout(booking_id)
  end
  DB->>DB: distribute payment theo roomCostsByBooking
```

## 5. Subscription renewal

```mermaid
sequenceDiagram
  autonumber
  participant Cron
  participant DB
  participant Email
  participant Owner
  Cron->>DB: check-subscription-status (daily)
  DB->>DB: mark expiring_soon / grace / suspended
  Cron->>Email: send-notification-email (theo rule)
  Email->>Owner: nhắc gia hạn
  Owner->>FE: vào /settings/subscription, chọn extend
  FE->>DB: tạo invoice + payment_transaction (metadata.type=extend)
  Owner->>Bank: chuyển khoản
  Bank->>SePay: báo có
  SePay->>FE: /sepay-webhook
  FE->>DB: update tx.status=completed
  DB->>DB: subscription_end_date += duration, status=active, is_read_only=false
```

## 6. Document scan (mobile capture)

```mermaid
sequenceDiagram
  autonumber
  participant PC as PC (reception)
  participant Mob as Mobile (anonymous)
  participant FE as Frontend
  participant SE as Edge Functions
  participant AI as Gemini Flash
  participant ST as Storage
  PC->>FE: Tạo session scan CCCD
  FE->>SE: get-scan-session → tạo session id + QR
  PC->>Mob: Show QR
  Mob->>SE: open /scan-document/:sessionId (no auth)
  Mob->>SE: mobile-scan-upload (anonymous proxy)
  SE->>ST: upload to guest-documents bucket
  SE->>SE: scan-guest-document
  SE->>AI: OCR + validate (CCCD/passport)
  AI-->>SE: parsed JSON / 422 nếu invalid
  SE-->>FE: realtime push scanned data
  FE->>PC: prefill booking guest fields
```
