# HotelPro — Master Implementation Plan

## Overview
HotelPro is an integrated hotel and restaurant management platform with multi-tenant SaaS architecture, branch management, dual-language support (English and Amharic), offline synchronization support, and commercial readiness.

---

## Phase Checklist & Roadmap

- [x] **Phase 0: Repository and Environment Audit**
  - Verified Node.js (`v24.18.0`), npm (`11.16.0`), Git (`2.55.0`), Docker Engine (`29.6.2`), PostgreSQL native service (`16.14`) and container image (`postgres:17-alpine`).
  - Audited ports: Host port 5432 verified with native PostgreSQL service; development credentials configured.
  - Initialized documentation suite in `docs/`: `IMPLEMENTATION_PLAN.md`, `ARCHITECTURE.md`, `EXECUTION_LOG.md`, `SECURITY.md`, `DEPLOYMENT.md`, `MOBILE_RELEASE.md`.

- [x] **Phase 1: Stable Monorepo Foundation**
  - Configured root `package.json` with npm workspaces (`packages/*`, `apps/*`).
  - Configured shared TypeScript definitions and Zod validation in `packages/shared`.
  - Built `packages/shared` to `dist/` with `.d.ts` types and ESM module exports.
  - Set up root workspace commands: `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`.

- [x] **Phase 2: Database and Domain Model**
  - Designed relational schema using Prisma ORM with 24 entities in `apps/api/prisma/schema.prisma`.
  - Entities: Organization (Tenant), Branch, User, RefreshToken, RoomType, Room, RatePlan, Reservation, Guest, Folio, FolioItem, Payment, HousekeepingTask, MaintenanceRequest, DiningTable, MenuCategory, MenuItem, Order, OrderItem, Ingredient, Recipe, InventoryMovement, CashierShift, AuditLog.
  - Enforced mandatory `organizationId` foreign key and indexes across all business entities.
  - Pushed schema to PostgreSQL database using `prisma db push` and generated Prisma Client (v6.19.3).
  - Created deterministic seed script `apps/api/prisma/seed.ts` seeding organizations, branches, 7 staff roles, room types, rooms, reservations, dining tables, bilingual menu items, recipe ingredients, active orders, and open cashier shift.

- [x] **Phase 3: Authentication, Authorization, and Tenant Security**
  - Password hashing with `bcryptjs` (salt rounds: 10).
  - JWT access tokens (15m expiry) and cryptographic refresh tokens (7d expiry) with database tracking and revocation.
  - Role-based access control (RBAC) with 13 granular roles: `SUPER_ADMIN`, `HOTEL_OWNER`, `GENERAL_MANAGER`, `BRANCH_MANAGER`, `FRONT_DESK`, `RESERVATIONIST`, `HOUSEKEEPING_SUPERVISOR`, `HOUSEKEEPING`, `RESTAURANT_MANAGER`, `HEAD_CHEF`, `CHEF`, `WAITER`, `CASHIER`, `AUDITOR`.
  - Mandatory tenant-scoping middleware injecting `req.organizationId` and validating branch access.
  - Helmet security headers, CORS origin whitelisting, and centralized error handling.

- [x] **Phase 4: Backend API**
  - Express.js modular monolith with TypeScript.
  - Modules: `auth`, `organizations`, `users`, `hotels` (rooms, room types, reservations, guests, housekeeping), `restaurants` (tables, menu categories, menu items, orders), `inventory` (ingredients, movements), `financials` (cashier shifts, payments, reconciliation), `reports` (dashboard KPIs, occupancy, dining sales, CSV export), `sync` (offline pull/push with idempotency), `audit` (tamper-evident audit logs).
  - Executed automated tests: 5 test suites, 20 tests passing (100%).

- [x] **Phase 5: Web Dashboard**
  - Next.js App Router with TypeScript and Tailwind CSS in `apps/web`.
  - `AuthProvider` managing JWT tokens and user session.
  - `LanguageProvider` with live English & Amharic switching.
  - Responsive layout with collapsible sidebar and role-filtered navigation.
  - Pages implemented and verified:
    - `/(auth)/login` & `/(auth)/register`
    - `/(dashboard)` overview with live KPI cards
    - `/hotel/rooms` (visual room status grid & add room modal)
    - `/hotel/reservations` (booking list, live availability, check-in/out)
    - `/hotel/guests` (guest directory, search, passport records)
    - `/hotel/housekeeping` (cleaning tasks, priority tags, inspector workflow)
    - `/restaurant/tables` (interactive dining floor plan)
    - `/restaurant/pos` (touch order ticket, table selection, VAT calculation)
    - `/restaurant/kitchen` (KDS active ticket queue)
    - `/restaurant/menu` (categories, bilingual items, availability toggle)
    - `/menu/[branchId]` (public customer QR menu)
    - `/inventory` (ingredients, units, low stock alerts, stock adjustments)
    - `/financials/shifts` (cashier shift open/close with variance calculation)
    - `/financials/payments` (ledger, multi-method payment recording)
    - `/reports` (occupancy, dining item sales, CSV export)
    - `/settings/organization` (multi-branch management)
    - `/settings/users` (staff team management)
  - Compiled and verified production build: all 20 routes generated cleanly with zero errors.

- [x] **Phase 6: Mobile Application**
  - Expo React Native application with Expo Router in `apps/mobile`.
  - Configured `Colors` theme matching HotelPro slate/indigo branding.
  - Local SQLite database (`hotelpro_offline.db`) via `expo-sqlite` for cached rooms, cached orders, cached menu, and offline queue.
  - Secure storage service with `expo-secure-store` and web fallback.
  - API client service with auto token injection and configurable server URL.
  - Offline sync service with idempotent queue processing and pull synchronization.
  - Mobile screens implemented:
    - `app/_layout.tsx`: Root layout with Auth & Sync providers.
    - `app/(auth)/login.tsx`: Login with role presets and server address config.
    - `app/(tabs)/_layout.tsx`: Role-filtered tab navigator.
    - `app/(tabs)/index.tsx`: Operations dashboard with live stats and sync banner.
    - `app/(tabs)/rooms.tsx`: Room list, search, status filter chips, housekeeping modal.
    - `app/(tabs)/orders.tsx`: POS table ordering, menu catalog, live VAT calculation, offline queueing.
    - `app/(tabs)/kitchen.tsx`: Kitchen display system with live ticket timer and status progression.
    - `app/(tabs)/sync.tsx`: Cashier shift open/close with cash drawer reconciliation and queued actions inspector.
    - `app/+not-found.tsx`: Fallback screen.
  - Verified TypeScript compilation: 0 errors.

- [x] **Phase 7: Hotel Business Logic**
  - Complete reservation lifecycle: `PENDING` -> `CONFIRMED` -> `CHECKED_IN` -> `CHECKED_OUT` (or `CANCELLED` / `NO_SHOW`).
  - Overlap prevention algorithm rejecting duplicate bookings for the same room and date range.
  - Automated room status transition: `AVAILABLE` -> `OCCUPIED` upon check-in; `OCCUPIED` -> `DIRTY` upon check-out.
  - Automated creation of `HousekeepingTask` upon guest check-out.

- [x] **Phase 8: Restaurant Business Logic**
  - Dine-in and Takeaway order flows.
  - Real-time kitchen ticket progression (`CONFIRMED` -> `PREPARING` -> `READY` -> `COMPLETED`).
  - Automated recipe ingredient deduction: when order reaches `COMPLETED`, backend database transaction decrements ingredient stocks and records `InventoryMovement` audit records atomically.

- [x] **Phase 9: Financial Controls & Manual Payments**
  - Decimal-safe monetary arithmetic avoiding floating point rounding bugs.
  - Cashier shift lifecycle: open with starting float, automatic calculation of expected cash from recorded cash payments, physical drawer cash entry, and variance calculation.
  - Multi-method payment support: Cash, Telebirr, CBE Birr, Bank Transfer, Visa/Mastercard.

- [x] **Phase 10: English & Amharic Localization**
  - Translation dictionary in `packages/shared/src/i18n/` supporting English and Amharic.
  - Language switcher in web dashboard with persistent preference.
  - Bilingual menu item names (`nameEn` and `nameAm`).

- [x] **Phase 11: Reports & Analytics**
  - Real-time dashboard KPI aggregation (Room Occupancy, Active Orders, Daily Revenue).
  - Dining product sales report.
  - CSV export endpoint for financial and operational records.

- [x] **Phase 12: Offline Sync & Reliability**
  - Sync queue table with unique mutation IDs and retry counters.
  - `/api/sync/pull` and `/api/sync/push` endpoints with idempotency checking.

- [x] **Phase 13: Security Review & Hardening**
  - Mandatory tenant scoping (`organizationId`) verified on all routes.
  - Automated penetration test in `tenant_isolation.test.ts` verifying that Tenant B cannot access or modify Tenant A resources.

- [x] **Phase 14: Automated Testing & Verification**
  - 5 Jest test suites passing 20 of 20 tests (100% pass rate).
  - Full TypeScript typecheck passing across all workspaces (`shared`, `api`, `web`, `mobile`).

- [x] **Phase 15: CI/CD & Deployment**
  - Created `.github/workflows/ci.yml` covering linting, typechecking, Prisma migrations, Jest testing with PostgreSQL service, and Next.js production builds.
  - Created production Dockerfiles: `infra/Dockerfile.api`, `infra/Dockerfile.web`.
  - Created `infra/docker-compose.prod.yml` with healthchecks, persistent volumes, and isolated networks.

- [x] **Phase 16: Google Play Release Preparation**
  - Configured `apps/mobile/app.json` with package `com.hotelpro.app`, `versionCode: 1`, permissions (`CAMERA`, `INTERNET`, `ACCESS_NETWORK_STATE`), and splash/icon assets.
  - Configured `apps/mobile/eas.json` for development, preview APK, and production App Bundle (`.aab`).
  - Documented release runbook in `docs/MOBILE_RELEASE.md`.
