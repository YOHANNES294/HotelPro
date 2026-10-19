# HotelPro — Architecture Design Document

## 1. System Overview

HotelPro is a multi-tenant SaaS platform built for hotels, restaurants, and mixed hospitality venues. It supports single- and multi-branch operations, comprehensive back-office management, front-desk workflows, point-of-sale (POS) dining operations, kitchen order displays (KDS), inventory management, and cashier reconciliation.

```
                           +---------------------------+
                           |       Clients             |
                           |  - Next.js Web App        |
                           |  - Expo Mobile (Android)  |
                           |  - Public QR Menu Web     |
                           +-------------+-------------+
                                         |
                                   HTTPS / REST
                                         |
                           +-------------v-------------+
                           |       apps/api            |
                           |   Express.js + TypeScript |
                           |   - Auth & RBAC           |
                           |   - Tenant Isolation      |
                           |   - Business Services     |
                           |   - Zod Validation        |
                           |   - OpenAPI Documentation |
                           +-------------+-------------+
                                         |
                                     Prisma ORM
                                         |
                           +-------------v-------------+
                           |       PostgreSQL 17       |
                           |   - Tenant Scoped Schema  |
                           |   - Atomic Transactions   |
                           |   - Decimal-safe Money    |
                           +---------------------------+
```

---

## 2. Monorepo Structure

- `apps/api`: REST API service powering all business operations.
- `apps/web`: Next.js web application for staff dashboards, front desk, POS, kitchen, reporting, and customer-facing QR menus.
- `apps/mobile`: Expo React Native mobile application for managers, front desk, waiters, and housekeepers with offline SQLite synchronization.
- `packages/shared`: Shared TypeScript types, Zod schemas, permissions constants, and utilities.
- `infra`: Docker Compose files, container definitions, and CI/CD configurations.
- `docs`: Architecture, implementation plans, security reviews, and operational manuals.

---

## 3. Multi-Tenant Architecture & Data Isolation

### Tenancy Hierarchy
1. **Organization (Tenant)**: The top-level legal entity or business account (e.g., "Grand Palace Hospitality").
2. **Branch**: Physical locations owned by an Organization (e.g., "Downtown Hotel & Bistro", "Airport Suites").
3. **Users & Memberships**: Users authenticate globally or per organization, and are granted branch-specific roles.

### Enforcement Invariants
- Every table containing operational data has an `organizationId` foreign key (and `branchId` where applicable).
- All database queries executed through the API backend enforce `where: { organizationId: req.tenant.id }`.
- Route middleware extracts the tenant from JWT claims or subdomains and asserts membership before executing handlers.
- Transactions are used for composite updates (e.g., booking confirmation + folio creation, order completion + inventory deduction).

---

## 4. Financial & Inventory Precision

- **Monetary Precision**: All prices, charges, taxes, discounts, and payments use `Decimal(12, 2)` in PostgreSQL and `Prisma.Decimal` in the backend. Floating-point arithmetic (`Number`) is forbidden for financial calculations.
- **Recipe & Inventory Deductions**: Deductions use explicit stock movement ledgers (`InventoryMovement`) tracking source, reason, delta quantity, and previous/new stock levels.

---

## 5. Offline-First Sync Architecture (Mobile)

1. Local mutations on mobile are recorded in an internal SQLite `OperationQueue` with UUID idempotency keys.
2. When online, pending operations are dispatched to `/api/v1/sync`.
3. The backend checks idempotency keys against `SyncLog` to prevent duplicate applications.
4. Conflict resolution strategy: Server-authoritative with timestamp-based conflict detection for bookings/inventory. Provisional bookings are marked as pending verification until synced.
