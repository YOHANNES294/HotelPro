# HotelPro — Single-Property Pilot Readiness & Operational Runbook

This runbook provides a practical, step-by-step checklist for launching and operating a live pilot of **HotelPro** at a single hotel, restaurant, or mixed-use hospitality property.

---

## 1. Pilot Scope & Objectives

The primary objective of the initial pilot is to validate real-world operational workflows under live staff usage:
- Front-desk guest reservations, check-in, and check-out.
- Table ordering, Kitchen Display System (KDS), and inventory consumption.
- Cashier shift management, cash float balancing, and payment recording.
- Offline resilience during Wi-Fi intermittency.
- End-of-day financial reconciliation and data backups.

---

## 2. Infrastructure & Environment Checklist

- [ ] **Host Server**: Cloud VM (e.g. Ubuntu 22.04 LTS / Debian 12) or local on-premise server with Docker Engine installed.
- [ ] **Network / Wi-Fi**: Dedicated local Wi-Fi network for POS tablets and kitchen display screens.
- [ ] **Domain & TLS**: Fully qualified domain name (e.g. `pilot.hotelpro.app`) configured with Let's Encrypt SSL/TLS.
- [ ] **Database Provisioning**:
  - Run PostgreSQL via Docker or managed RDS.
  - Verify PostgreSQL port (`5432`) is bound strictly to `127.0.0.1` and never exposed to the public internet.
- [ ] **Environment Configuration**:
  - Copy `.env.example` to `.env`.
  - Generate high-entropy secrets for `JWT_SECRET`, `REFRESH_SECRET`, and `POSTGRES_PASSWORD` (min 32 characters).
  - Set `CORS_ORIGINS` to the exact pilot domain.
- [ ] **Database Migration Execution**:
  ```bash
  npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
  ```
- [ ] **Service Health Verification**:
  - Verify API health endpoint: `GET https://pilot.hotelpro.app/health` returns `HTTP 200 { status: "ok" }`.

---

## 3. Property Setup & Master Data Checklist

### 3.1 Organization & Branch Details
- [ ] Create Organization (e.g. *Haile Grand Hospitality*).
- [ ] Create Initial Branch (e.g. *Bole Branch*).
- [ ] Set Currency: `ETB` (Ethiopian Birr).
- [ ] Configure VAT / Service Charge rates if applicable.

### 3.2 Hotel Room Inventory
- [ ] Define Room Types (e.g. Single Deluxe, Double Standard, Executive Suite) with standard nightly rates.
- [ ] Create physical rooms assigned to floors (e.g. Rooms 101–110 on Floor 1, Rooms 201–210 on Floor 2).
- [ ] Verify all rooms initialize in `CLEAN` or `INSPECTED` status.

### 3.3 Restaurant & Dining Areas
- [ ] Create Dining Areas (e.g. Main Dining Hall, Terrace, Bar).
- [ ] Register physical dining tables with table numbers and capacities.
- [ ] Generate and print table QR codes pointing to the digital menu:
  `https://pilot.hotelpro.app/menu/<branchId>?table=<tableNumber>`

### 3.4 Menu, Recipes & Stock Inventory
- [ ] Create Menu Categories (Breakfast, Entrees, Traditional, Beverages, Desserts).
- [ ] Add Menu Items with prices, tax rules, and preparation stations (Kitchen vs. Bar).
- [ ] Define Raw Ingredients with storage units (kg, L, pcs) and low-stock alert thresholds.
- [ ] Attach Recipe ingredient quantities to each menu item (e.g., 1 Kitfo portion = 0.25kg Beef, 0.05kg Clarified Butter/Niter Kibbeh).
- [ ] Enter initial physical stock count into the system.

---

## 4. Staff Accounts & Role-Based Access Checklist

Create staff accounts with individual credentials (do not share logins between staff members):

| Role | Pilot Staff Name | Assigned Email | Required Permissions |
|---|---|---|---|
| **General Manager** | Property GM | `gm@pilot-property.com` | Full administrative oversight, financial reports, user management |
| **Front Desk** | Front Desk Lead | `frontdesk@pilot-property.com` | Room calendar, guest profiles, check-in, check-out, folios |
| **Cashier** | Head Cashier | `cashier@pilot-property.com` | Cashier shifts, cash float opening, payment recording, shift closing |
| **Kitchen Chef** | Head Chef | `kitchen@pilot-property.com` | KDS screen access, order preparation status updates |
| **Waiter / Server** | Lead Waiter | `waiter@pilot-property.com` | Mobile table ordering, menu search, order modifications |
| **Housekeeping** | Cleaning Lead | `housekeeping@pilot-property.com` | Room cleaning status transitions, housekeeping tasks |

---

## 5. Daily Operational Pilot Workflow

### Step 1: Morning Shift Initialization
1. Cashier logs into the Web or Mobile terminal.
2. Navigate to **Financials** -> **Cashier Shifts**.
3. Count the physical cash in the cash drawer (e.g., 3,000 ETB starting float).
4. Enter opening cash and click **Open Shift**.
5. Verify shift status transitions to `OPEN`.

### Step 2: Front Desk Operations
1. Front desk receptionist views room availability calendar.
2. Walk-in or pre-booked guest arrives:
   - Select room type and available room.
   - Enter guest full name, phone number, and ID details.
   - Click **Create Reservation & Check In**.
   - Room status automatically updates to `OCCUPIED`.
3. Record deposit or advance payment (Cash, Telebirr reference code, or CBE Birr reference code).
4. System links payment to the active cashier shift and updates folio `balanceDue`.

### Step 3: Restaurant Ordering & KDS
1. Waiter uses mobile tablet at dining table:
   - Select Table number.
   - Tap menu items to add to order.
   - Add special preparation notes (e.g., "No onions").
   - Click **Submit Order**.
2. Kitchen Display System (KDS):
   - New ticket immediately appears in the kitchen display under `CONFIRMED`.
   - Kitchen staff taps **Start Preparing** (`PREPARING`).
   - When food is cooked, staff taps **Ready to Serve** (`READY`).
   - Waiter delivers food and marks ticket **Completed** (`COMPLETED`).
3. Automated Inventory Deduction:
   - System automatically decrements ingredient stock quantities based on the item recipe.

### Step 4: Guest Folio Settlement & Check-Out
1. Guest prepares to depart:
   - Front desk opens reservation folio.
   - Review room rate charges and any restaurant room-service charges.
   - Click **Record Payment** for the outstanding balance.
   - Select payment method and input transaction reference.
   - Folio balance updates to `0.00 ETB`.
2. Click **Check Out Guest**:
   - Room status transitions from `OCCUPIED` to `DIRTY`.
   - Housekeeping cleaning task is automatically created.
3. Housekeeping cleans the room and updates status to `CLEAN` / `INSPECTED`.

### Step 5: Evening Shift Close & Cash Drawer Reconciliation
1. At the end of the shift, cashier navigates to **Cashier Shifts** -> **Close Shift**.
2. Cashier physically counts all cash in the cash drawer.
3. Enter counted cash figure into the system.
4. Click **Close Shift**:
   - System calculates `expectedCash = openingCash + totalCashPayments`.
   - System calculates `variance = countedCash - expectedCash`.
   - If variance is non-zero, require cashier note explaining discrepancy.
5. Print or save the shift summary report.

---

## 6. Offline Resilience Drill

Perform this test on-site prior to admitting pilot customers:
1. Turn off Wi-Fi on the waiter's tablet or enable Airplane mode.
2. Confirm the offline banner appears in the Mobile app.
3. Take a dining order for Table 4 with 2 items and tap **Submit Order**.
4. Confirm the order is safely stored in local SQLite and appears in the offline sync queue.
5. Turn Wi-Fi back on.
6. Observe automatic sync queue flush:
   - Order sends to API with its RFC4122 v4 idempotency key.
   - API creates the order and kitchen ticket.
   - Verify that no duplicate orders are created on the backend.

---

## 7. Daily Backup & Disaster Recovery Drill

### Daily Backup Execution
Run a logical database backup at the close of every business day:
```bash
# Export timestamped compressed backup
docker exec -t hotelpro-postgres pg_dump -U hotelpro -F c -b -v -f /tmp/backup_daily.dump hotelpro

# Copy to host backup repository or external off-site storage
docker cp hotelpro-postgres:/tmp/backup_daily.dump /var/backups/hotelpro/hotelpro_$(date +%Y%m%d).dump
```

### Recovery Drill
Verify the restore procedure once per week:
```bash
# Restore backup into a test database to ensure data integrity
docker exec -i hotelpro-postgres createdb -U hotelpro hotelpro_drill_test
docker exec -i hotelpro-postgres pg_restore -U hotelpro -d hotelpro_drill_test -v /tmp/backup_daily.dump
docker exec -i hotelpro-postgres dropdb -U hotelpro hotelpro_drill_test
```
