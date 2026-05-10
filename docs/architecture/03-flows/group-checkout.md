# Flow: Group Checkout

## Tổng quan
Checkout group booking sau khi payment đã đủ. **Manual enforcement** — không auto-checkout khi paid.

## Sequence

```mermaid
sequenceDiagram
    actor R as Reception
    participant FE as Group Checkout UI
    participant RPC as perform_group_checkout
    participant DB
    participant INSP as Inspection prerequisite

    R->>FE: Mở group booking
    FE->>DB: load master + sub bookings + payments
    FE->>FE: compute distribution roomCostsByBooking
    FE->>R: hiển thị tổng + sub breakdown

    R->>FE: Inspection từng phòng
    FE->>DB: insert checkout_inspections (pass/issue)
    Note over INSP: Tất cả sub phải có inspection PASS

    R->>FE: Collect payment (QR/cash)
    FE->>DB: payment_transactions
    FE->>FE: amount_paid >= total

    R->>FE: Tap "Hoàn tất checkout group"
    FE->>RPC: perform_group_checkout(master_id)
    RPC->>RPC: assert all subs inspected
    RPC->>RPC: assert paid in full (tolerance ±1000đ)
    RPC->>DB: loop subs → transition_booking_status checked_out
    RPC->>DB: loop rooms → transition_room_status cleaning
    RPC->>DB: create invoices per sub (hoặc 1 master)
    RPC->>DB: distribute payment metadata
    RPC->>DB: audit_log
    RPC-->>FE: success
```

## Distribution payment
Memory `group-payment-distribution-fix-v1`:
```
roomCostsByBooking[sub_id] = sub.total / master.total * payment_amount
```
Áp dụng khi webhook match payment vào master → fan-out vào subs.

## Validation
- Mọi sub phải `checkout_inspection.status = 'pass'`
- `master.amount_paid + deposit >= master.total - tolerance`
- Không có sub đang `checked_in` mà chưa inspect

## Memory
`unified-group-checkout-spec`, `group-checkout-manual-enforcement-v1`, `group-payment-realtime-v1`.
