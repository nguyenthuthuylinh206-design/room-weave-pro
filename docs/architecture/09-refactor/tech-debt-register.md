# Tech Debt Register

> Sổ nợ kỹ thuật. Cập nhật khi phát hiện. Mỗi mục có ID, severity, cost ước lượng.

| ID | Sev | Mô tả | Cost (sprint) |
|---|---|---|---|
| TD-01 | 🟠 | Trùng entry `/admin/*` vs `/super-admin/*` | 0.5 |
| TD-02 | 🟠 | `MorePage.tsx` desktop và mobile chưa rõ ràng | 0.3 |
| TD-03 | 🟡 | Chưa có DB view duy nhất cho tài chính booking | 1.0 |
| TD-04 | 🟡 | `notifications` legacy vs `in_app_notifications` chưa hợp nhất | 1.5 |
| TD-05 | 🟡 | Reference codes payment có nhiều convention, chưa canonical | 0.5 |
| TD-06 | 🟡 | Outbox idempotent key chưa đầy đủ — nguy cơ double-apply | 1.0 |
| TD-07 | 🟡 | Group payment metadata convention string — dễ vỡ, nên enum | 0.5 |
| TD-08 | 🟡 | Chưa có Sentry / structured logging | 1.0 |
| TD-09 | 🟡 | Workflow chưa có visual builder, chỉ JSON | 2.0 |
| TD-10 | 🟡 | Lost & Found code prefix hardcode, chưa config per tenant | 0.3 |
| TD-11 | 🟢 | String "Hotel Asset Manager" còn sót sau rebrand RoomQc | 0.2 |
| TD-12 | 🟡 | Test coverage hiện < 80% mục tiêu (chưa đo chính xác) | n/a |
| TD-13 | 🟡 | Realtime subscribe `*` không filter event/table cụ thể | 0.5 |
| TD-14 | 🟠 | RPC update `rooms.status` trực tiếp ở vài chỗ không qua transition_room_status | 1.0 |
| TD-15 | 🟡 | Maintenance request thiếu audit log assign/cancel | 0.5 |
| TD-16 | 🟠 | SePay webhook chưa có shared secret + IP allowlist | 0.5 |
| TD-17 | 🟡 | `guest-documents` bucket public — leak risk | 0.5 |
| TD-18 | 🟡 | Render Quick path validation chỉ ở UI, RPC chưa assert | 0.2 |
| TD-19 | 🟡 | Aggregate views chưa có RLS rõ ràng | 0.5 |
| TD-20 | 🟢 | Migration archive (357 file) cần consolidate snapshot | 1.0 |

## Quy ước
- Khi mở finding mới ở `findings.md` → đối chiếu, có thể link sang đây.
- Khi đóng → cập nhật trạng thái ✅ + ngày + PR link.
- Review register mỗi sprint planning.
