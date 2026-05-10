# State Machines

Tóm tắt 5 FSM chính. Mọi transition đi qua RPC có audit log + permission check.

## 1. Room Status (11 trạng thái — v2)

```mermaid
stateDiagram-v2
  [*] --> available
  available --> reserved : booking confirmed
  available --> occupied : walk-in checkin
  available --> dnd : manager
  available --> oos : manager
  available --> maintenance : maintenance request
  reserved --> occupied : checkin
  reserved --> reserved_no_show : timeout
  reserved_no_show --> available : auto cron
  occupied --> checked_out_pending : checkout
  checked_out_pending --> cleaning : auto
  cleaning --> inspected : housekeeping done
  inspected --> available : QC pass
  inspected --> cleaning : QC reject
  dnd --> available : auto cron lift_expired
  oos --> available : auto cron lift_expired
  maintenance --> available : maintenance done
```

RPC: `transition_room_status(p_room_id, p_new_status, p_reason)`. Cron: `lift-expired-dnd-oos`.

## 2. Booking Status

```mermaid
stateDiagram-v2
  [*] --> draft
  draft --> pending : submit
  pending --> confirmed : payment OK / manual
  pending --> cancelled : timeout / user
  confirmed --> checked_in : perform_checkin
  confirmed --> cancelled
  checked_in --> checked_out : perform_checkout
  checked_out --> completed : invoice closed
```

RPC: `transition_booking_status`, `perform_checkin`, `perform_checkout`, `cancel_booking`.

## 3. Task QC

```mermaid
stateDiagram-v2
  [*] --> pending
  pending --> assigned : round-robin
  assigned --> in_progress : staff start
  in_progress --> done : staff complete
  done --> reviewed : manager approve
  done --> rejected : manager reject (multi-channel notify)
  rejected --> assigned : reassign
```

RPC: `transition_task_status`, `approve_task`.

## 4. Laundry Batch

```mermaid
stateDiagram-v2
  [*] --> draft
  draft --> delivered : send to vendor
  delivered --> washing
  washing --> ready : vendor done
  ready --> received : KS pickup
  received --> stocked : QC + restock
  delivered --> compensation_requested : missing/damaged
  compensation_requested --> resolved : approved
```

## 5. Payment Transaction

```mermaid
stateDiagram-v2
  [*] --> pending
  pending --> completed : SePay webhook match
  pending --> expired : cron expire-pending-payments
  pending --> failed : manual cancel
  completed --> refunded : manual refund
```

## 6. Subscription

```mermaid
stateDiagram-v2
  [*] --> trial
  trial --> active : payment OK
  active --> expiring_soon : T-14
  expiring_soon --> active : extend
  expiring_soon --> grace_period : T-0
  grace_period --> active : extend
  grace_period --> suspended : T+7
  suspended --> active : extend
  active --> cancelled : owner action
```

Flag `is_read_only=true` khi suspended → block mutations.

## 7. Distribution Order

```mermaid
stateDiagram-v2
  [*] --> draft
  draft --> pending_approval
  pending_approval --> approved : manager
  pending_approval --> rejected
  approved --> in_delivery
  in_delivery --> delivered
  delivered --> confirmed : batch_confirm_room_deliveries
```
