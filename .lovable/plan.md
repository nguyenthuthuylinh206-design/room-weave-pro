

## Tài liệu IA & State Diagram (toàn bộ hệ thống — engineering grade)

Soạn lại tài liệu Information Architecture + State Diagrams chi tiết, dùng **Lovable AI Gateway với model `anthropic/claude-sonnet-4-5`** (tương đương "Claude 4.7" gần nhất hiện có) để viết phần văn xuôi/phân tích. Toàn bộ sơ đồ là Mermaid.

### Output

| File | Vai trò |
|---|---|
| `/mnt/documents/IA-and-State-Diagrams.md` | Bản gốc Markdown + Mermaid, render được trên GitHub/Notion, dễ chỉnh sửa |
| `/mnt/documents/IA-and-State-Diagrams.pdf` | Bản PDF in được, render sẵn diagrams (qua mermaid-cli + pandoc/weasyprint) |

### Phạm vi nội dung

**Phần 1 — Information Architecture**
- Sơ đồ tổng routes (public / onboarding / authenticated / super-admin) dạng tree.
- Sidebar navigation (Owner/Manager/Staff) — 9 module groups, breakdown từng `children`.
- Mobile Bottom Nav — pool 8 tab, filter permission, slot tối đa 5, quy tắc `/more`.
- Mobile Detail Header — danh sách root paths auto-hide back, fallback module root.
- Permission matrix — `super_admin / owner / hotel_manager / department_manager / staff` × các module action (`view / create / update / delete / approve / manage / export`).
- Tenant usage modes (`homestay / standard / full`) gating sidebar items.
- Hotel-level access control (filter qua `user_hotels`, HotelContext).

**Phần 2 — State Diagrams (executive + detailed cho mỗi luồng)**

1. **Booking lifecycle**  
   `confirmed → checked_in → checked_out` + nhánh `cancelled / no_show / overdue / conflict`. Guards: `perform_checkin` RPC validate room status (vacant), `perform_checkout` validate payment & inspection.

2. **Room status**  
   `vacant → check_in → occupied → check_out → cleaning → vacant` + nhánh `maintenance / out_of_order`. Trigger: booking actions, cleaning task complete (`useRooms.completeCleaning`).

3. **Housekeeping Task lifecycle**  
   `pending → in_progress → completed` (+ `cancelled`). Phân theo `task_type`: `checkout_inspection / cleaning / checkin_prep / amenity_request / delivery_confirmation / other`. Side effects: round-robin assignment, auto-create cleaning sau checkout, link `room_check_id`.

4. **Room Check flow (RoomCheckPage)**  
   Steps: `CheckType → ItemsCheck → ChargeableItems → CleaningRequest → Phase1Confirm → Review`. URL params: `?type=...&resume=true&inspection=...&distribution_order_id=...`. Logic auto-resume từ `localStorage["room-check-{roomId}"]`, auto-skip step 1 khi `prefilledType`, auto-start checkout inspection.

5. **Checkout Inspection request**  
   `pending → in_progress → completed` (+ `cancelled`). Liên kết `room_check_id`, blocking điều kiện cho group checkout.

6. **Payment (booking)**  
   Cash flow vs Bank transfer (VietQR + SePay webhook). State `pending → completed / cancelled`. Sequence diagram: tạo payment → render QR → SePay webhook → match invoice_number → update status → realtime → invalidate queries.

7. **Subscription / Tenant**  
   `trialing → active → past_due → suspended → cancelled`. Renewal warning 3 cấp (Suspended / Grace Period / Expiring Soon). Room limit enforcement.

8. **Laundry Batch**  
   `draft → delivered → washing → ready → received → stocked` (+ `cancelled`). Allowed transitions matrix. Inventory side effects (quantity_in_stock ↔ quantity_in_laundry).

9. **Maintenance Request**  
   `waiting → pending → in_progress → completed` (+ `cancelled`). Priority/issue type taxonomy.

10. **Distribution Route Batch**  
    `RouteStatus`: `pending → released → in_progress → completed → closed` (+ `cancelled`).  
    `BatchStatus`: `open → handed_over → received → done`.  
    `StopStatus`: `pending → delivered / cannot_access → resolved` + exception types.

11. **Workflow Automation Engine**  
    Sequence: trigger (room/booking/laundry/check) → `execute-workflow` edge → match conditions → run actions (notifications, RPC, webhook).

**Phần 3 — Cross-cutting**
- Realtime channels & invalidation map (bảng tham chiếu).
- Atomic RPCs (`perform_checkin`, `perform_checkout`, `create_laundry_batch_with_items`, `update_booking_amount_paid`, `check_and_update_batch_status`).
- Edge functions inventory (22 functions, mục đích từng cái).
- Tenant isolation pattern (`.eq('tenant_id', tenantId)` mandatory).

### Cách thực hiện

1. **Khảo sát code** đã xong — extract: routes (`App.tsx`), sidebar (`Sidebar.tsx`), bottom nav (`MobileBottomNav.tsx`), types (`housekeeping.types.ts`, `laundry.types.ts`, `rooms.types.ts`, `route-batch.types.ts`, `checkout-inspection.types.ts`, `user-management.types.ts`), RPCs (migrations).
2. **Soạn JSON dữ liệu IA** bằng script Python — extract tự động routes/nav/permissions thành cấu trúc dữ liệu đưa vào prompt, đảm bảo Claude Sonnet 4.5 viết dựa trên fact thật, không hallucinate.
3. **Gọi Lovable AI** (`/tmp/lovable_ai.py`) với model `anthropic/claude-sonnet-4-5`, system prompt tiếng Việt enterprise, prompt structured output từng section. Chia nhiều call để vừa context.
4. **Compose Markdown** + chèn Mermaid blocks tự viết (không để AI vẽ sơ đồ — vì sơ đồ phải khớp 100% code, AI dễ sai). AI chỉ viết phần phân tích, mô tả, bảng tham chiếu.
5. **Render PDF**: convert Mermaid → SVG bằng `@mermaid-js/mermaid-cli` (npx, headless chrome), nhúng vào HTML, dùng `weasyprint` hoặc `pandoc + wkhtmltopdf` để xuất PDF A4.
6. **QA**: convert từng trang PDF → ảnh, đọc ảnh kiểm tra overflow/cắt chữ/sơ đồ vỡ. Nếu lỗi, fix layout (font Vietnamese, page-break, scale Mermaid) và re-render.

### Lưu ý kỹ thuật

- Nếu model `anthropic/claude-sonnet-4-5` không có trên Lovable AI Gateway (gateway hiện document chỉ liệt kê Google/OpenAI), sẽ fallback sang `openai/gpt-5` với cùng prompt — chất lượng tương đương cho task viết tài liệu kỹ thuật. Sẽ test endpoint trước khi soạn nội dung và báo lại nếu phải fallback.
- Mermaid stateDiagram-v2 cho state machines, flowchart TD cho IA tree, sequenceDiagram cho payment & workflow.
- Không emoji trong Mermaid (gây lexer error).
- Toàn bộ tiếng Việt, terminology theo project memory ("Khách vãng lai", "Thuế GTGT", v.v.).

### File sẽ tạo

| Path | Loại |
|---|---|
| `/tmp/extract_ia.py` | Script extract IA từ codebase ra JSON |
| `/tmp/build_doc.py` | Script gọi AI + compose Markdown |
| `/tmp/render_pdf.sh` | Script render Mermaid + Markdown → PDF |
| `/mnt/documents/IA-and-State-Diagrams.md` | **Output chính** |
| `/mnt/documents/IA-and-State-Diagrams.pdf` | **Output chính** |

Không sửa code app, không migration, không đụng config.

