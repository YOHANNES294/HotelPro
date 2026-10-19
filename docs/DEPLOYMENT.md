# HotelPro — Production Deployment & Operations Guide

## 1. Local Development Setup

### Prerequisites
- Node.js `v20+` (Verified: `v24.18.0`)
- npm `10+` (Verified: `11.16.0`)
- Docker & Docker Compose (Verified: Docker `29.6.2`)
- PostgreSQL 16/17 (Port: `5432`)

### Quick Start
1. Configure environment:
   ```bash
   cp .env.example .env
   ```
2. Start PostgreSQL service:
   ```bash
   docker compose up -d
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Push database schema and seed initial data:
   ```bash
   npm run build:shared
   npm run db:push --workspace=@hotelpro/api
   npm run db:seed --workspace=@hotelpro/api
   ```
5. Run automated tests:
   ```bash
   npm test --workspace=@hotelpro/api
   ```
6. Start development servers:
   ```bash
   npm run dev:api    # API running on http://localhost:4000
   npm run dev:web    # Web running on http://localhost:3000
   npm run dev:mobile # Mobile Metro bundler
   ```

---

## 2. Production Docker Deployment

The production stack is defined in `infra/docker-compose.prod.yml`.

### Mandatory Environment Variables
Production configuration enforces strict secrets without falling back to development defaults:
- `POSTGRES_PASSWORD`: Strong database password (minimum 32 random characters).
- `JWT_SECRET`: High-entropy secret for HMAC-SHA256 access tokens.
- `REFRESH_SECRET`: High-entropy secret for refresh tokens.
- `CORS_ORIGIN`: Canonical HTTPS domain of the web client.

### Starting the Production Stack
```bash
docker compose -f infra/docker-compose.prod.yml up -d --build
```

---

## 3. Database Migration, Backup & Disaster Recovery

### Automated Database Migrations
Run schema migrations against the production database during release pipeline:
```bash
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
```

### Automated Backup Procedure
Schedule daily automated logical backups using `pg_dump`:
```bash
# Export compressed binary backup with timestamp
docker exec -t hotelpro-postgres-prod pg_dump -U hotelpro -F c -b -v -f /tmp/backup_$(date +%Y%m%d_%H%M%S).dump hotelpro
docker cp hotelpro-postgres-prod:/tmp/backup_*.dump /var/backups/hotelpro/
```

### Disaster Recovery & Restore
To restore from a backup:
```bash
# 1. Terminate existing connections
docker exec -i hotelpro-postgres-prod psql -U hotelpro -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'hotelpro' AND pid <> pg_backend_pid();"

# 2. Restore using pg_restore
docker exec -i hotelpro-postgres-prod pg_restore -U hotelpro -d hotelpro -v -c /tmp/backup_filename.dump
```

---

## 4. Health Checks & Monitoring

- **Database**:
  ```bash
  docker exec hotelpro-postgres-prod pg_isready -U hotelpro -d hotelpro
  ```
- **Backend API**:
  `GET /health` returns HTTP 200 with uptime and database connection status.
- **Log Inspection**:
  ```bash
  docker compose -f infra/docker-compose.prod.yml logs -f --tail=100 api
  ```

---

## 5. Rollback Procedures

### API & Web Rollback
1. Re-deploy the previous Git release tag image:
   ```bash
   docker pull ghcr.io/hotelpro/api:${PREVIOUS_VERSION}
   docker compose -f infra/docker-compose.prod.yml up -d --no-deps api
   ```
2. Verify traffic switch and health status.

### Database Schema Rollback
If a migration must be reverted, generate a down-migration or apply the compensatory Prisma schema revision, then re-deploy with `prisma migrate deploy`.
