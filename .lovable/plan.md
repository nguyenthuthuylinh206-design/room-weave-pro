# Plan: Group Checkout Inspection Status Card

## Status: ✅ COMPLETED

### What was done

Updated Group Checkout to have feature parity with Individual Checkout (`CheckoutInspectionSection`) by:

1. **Created `InspectionStatusCard` component** (`src/components/bookings/InspectionStatusCard.tsx`)
   - Card UI with state-aware styling (amber for pending, blue for in_progress, green for completed)
   - Real-time timer for in_progress inspections
   - Staff info line with status badge and contact buttons (Telegram/Phone)
   - "Cancel Request" button for pending/in_progress inspections
   - Timestamp display (requested at / started at)

2. **Updated `GroupCheckoutDialog.tsx`**
   - Added `handleCancelInspection` function to cancel inspection requests
   - Added `createdAt` field to `InspectionStatus` interface
   - Replaced `AssignedStaffRow` with `InspectionStatusCard`
   - Removed old `AssignedStaffRow` component (moved logic to `InspectionStatusCard`)

### Features Added

| Feature | Before | After |
|---------|--------|-------|
| Card UI with colors | ❌ Simple text row | ✅ Colored cards (amber/blue/green) |
| Timer for in_progress | ❌ No | ✅ Real-time countdown |
| Cancel button | ❌ No | ✅ "Hủy yêu cầu" button |
| Time details | ❌ No | ✅ "Yêu cầu lúc" / "Bắt đầu" timestamps |
| Status icons | ❌ Small badge | ✅ AlertCircle, Loader2, CheckCircle2 |
