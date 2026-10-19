# HotelPro — Security Policy & Controls

## 1. Authentication & Session Management
- **Password Hashing**: Passwords are saved with bcrypt (salt rounds >= 12).
- **Tokens**: Short-lived JWT Access Tokens (15 minutes) and cryptographically random Refresh Tokens (30 days) stored hashed in the database.
- **Session Revocation**: Refresh tokens can be revoked individually or per user across all devices.
- **Rate Limiting**: Express rate limiters protect authentication endpoints (`/api/v1/auth/login`, `/api/v1/auth/register`) against brute-force attacks.

---

## 2. Authorization & Tenant Isolation
- **Role-Based Access Control (RBAC)**: Role permissions are checked server-side on every API route.
- **Tenant Isolation**: Mandatory `organizationId` injection on all queries prevents cross-tenant access. Test suites explicitly assert that Tenant B cannot read or mutate Tenant A records.
- **Least Privilege**: Staff access is scoped to the branch(es) they are assigned to.

---

## 3. Network & Transport Security
- **Headers**: Helmet middleware enforces `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, and `Strict-Transport-Security`.
- **CORS**: Explicit whitelist of allowed client origins.
- **Input Validation**: Strict Zod schema validation strips extraneous parameters on all request payloads.
- **SQL Injection Prevention**: Prisma ORM parameterized queries prevent SQL injection.

---

## 4. Audit Logging
- High-severity actions (user creation, role changes, price overrides, refunds, cashier shift closures, stock adjustments) generate immutable `AuditEvent` records.
