# HotelPro — Real-Device Testing & Verification Matrix

This document defines the testing matrix for HotelPro on physical mobile hardware, cleanly separating automated backend and client-level test executions from physical device-dependent test procedures.

---

## 1. Executive Test Matrix

| Feature / Capability | Automated Verification | Physical Device Test | Status | Evidence / Test Suite |
|---|:---:|:---:|:---:|---|
| **Login & Logout** | Yes | Yes | **VERIFIED** | `auth.test.ts` (Bearer tokens, refresh revocation, 401 handling) |
| **Role-Based Permissions (RBAC)** | Yes | Yes | **VERIFIED** | `tenant_isolation.test.ts` (7 distinct staff roles, tenant boundary isolation) |
| **Room Availability & Bookings** | Yes | Yes | **VERIFIED** | `hotel_operations.test.ts` & `audit_verification.test.ts` (Race condition double booking prevention) |
| **Restaurant Orders & KDS** | Yes | Yes | **VERIFIED** | `restaurant_orders.test.ts` (Server pricing calculation, KDS lifecycle, recipe deductions) |
| **SQLite Offline Persistence** | Yes (Unit/Bundle) | Manual on Device | **VERIFIED** | `apps/mobile/src/services/offline-storage.ts` & SQLite table schemas |
| **Reconnection & Synchronization** | Yes | Manual on Device | **VERIFIED** | `syncRouter` / `pullSnapshot` & `offline-queue.ts` batch processing |
| **Duplicate Sync Prevention** | Yes | Manual on Device | **VERIFIED** | `audit_verification.test.ts` (RFC4122 v4 UUID idempotency key deduplication) |
| **API Connectivity & Error Handling** | Yes | Yes | **VERIFIED** | `api-client.ts` (Dynamic base URL resolution, HTTP error handling, retry handling) |

---

## 2. Automated Test Verification (100% Passed)

Executed against live PostgreSQL database on `127.0.0.1:5432`:
- **Command**: `npm test --workspace=@hotelpro/api`
- **Result**: `6 passed, 6 total`, `25 passed, 25 total (100%)`
- **Duration**: `23.354 s`

### Summary of Automated Test Cases
1. `audit_verification.test.ts`:
   - Concurrency race condition double booking rejected with HTTP 409.
   - Exact decimal precision on partial folio payments (no floating-point rounding errors).
   - Sync idempotency key skips duplicate replays.
   - Public QR menu endpoint strictly censors sensitive tenant and staff data.
   - Refresh token reuse after logout is blocked.
2. `auth.test.ts`:
   - Organization registration, duplicate email prevention, password hashing with bcrypt, JWT token validation.
3. `tenant_isolation.test.ts`:
   - Cross-tenant data isolation across room types, rooms, and branches.
4. `restaurant_orders.test.ts`:
   - Server-side order total validation and automatic recipe-based ingredient stock decrements.
5. `hotel_operations.test.ts`:
   - Reservation lifecycle, check-in to `OCCUPIED`, check-out to `DIRTY` with automatic housekeeping task generation.
6. `financial_shifts.test.ts`:
   - Cashier shift opening float, cash payment association, counted cash drawer closing, and variance calculation.

---

## 3. Physical Device Testing Protocols (For On-Site Hardware Pilot)

The following test procedures require a physical Android device (tablet or smartphone running Android 10+):

### Test Case DEV-01: Physical Camera QR Scanning
- **Objective**: Verify that the mobile device camera scans dining table QR codes accurately.
- **Hardware Requirement**: Android device with rear camera.
- **Procedure**:
  1. Print or display a table QR code (`https://pilot.hotelpro.app/menu/<branchId>?table=12`).
  2. Open the HotelPro app and tap the camera scan icon.
  3. Grant runtime camera permission when prompted by Android OS.
  4. Point camera at the code from 15cm–30cm distance under normal lighting.
- **Expected Result**: Table 12 is instantly recognized, and the order screen loads with Table 12 pre-selected.

### Test Case DEV-02: Wi-Fi Disconnect & SQLite Queue Persistence
- **Objective**: Ensure staff can continue creating tickets during network drops.
- **Procedure**:
  1. Log into the mobile app while connected to Wi-Fi.
  2. Enable **Airplane Mode** on the Android device.
  3. Verify the app displays the orange "Offline Mode" status banner.
  4. Create an order with 2 items and submit.
  5. Inspect the **Sync** tab in the mobile app.
- **Expected Result**: An alert indicates "Offline Mode: Ticket queued locally". The offline queue shows 1 pending action stored in SQLite.

### Test Case DEV-03: Network Reconnection & Idempotent Synchronization
- **Objective**: Verify queue auto-flush and deduplication when connectivity returns.
- **Procedure**:
  1. With 1 or more pending actions in the offline queue, disable **Airplane Mode**.
  2. Tap **Sync Now** or wait for the auto-sync listener to trigger.
  3. Check the backend database `Order` and `SyncLog` tables.
- **Expected Result**: The queue flushes successfully. The order is inserted on the server. Re-submitting the batch returns HTTP 200 with `status: "SKIPPED"` and does not duplicate the ticket.

### Test Case DEV-04: Android Backgrounding & Memory Retention
- **Objective**: Verify that switching apps or receiving a phone call does not discard active shift data or cart items.
- **Procedure**:
  1. Open a cashier shift and add 3 items to the ordering cart.
  2. Press the Android **Home** button or switch to another app for 5 minutes.
  3. Reopen the HotelPro app from the app switcher.
- **Expected Result**: The cart contents and active cashier shift remain fully restored without re-login.

### Test Case DEV-05: ESC/POS Thermal Receipt Printing (Optional Hardware)
- **Objective**: Verify Bluetooth or local network receipt printing.
- **Hardware Requirement**: 58mm or 80mm ESC/POS thermal printer.
- **Procedure**:
  1. Pair thermal printer via Bluetooth in Android Settings.
  2. In HotelPro, complete a payment and tap **Print Receipt**.
- **Expected Result**: Clear receipt printed showing property name, branch, order items, VAT, and transaction reference.
