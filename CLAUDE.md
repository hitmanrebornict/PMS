# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (runs frontend on :3000 and backend on :5000 concurrently)
npm run dev

# Frontend only
npm run dev:client

# Backend only (with file watching)
npm run dev:server

# Build frontend
npm run build

# Type checking (no tests configured)
npm run lint

# Database
npm run db:migrate    # Create/apply migrations (dev)
npm run db:deploy     # Apply migrations (production)
npm run db:seed       # Seed default super admin user
npm run db:studio     # Open Prisma Studio GUI

# Docker
docker-compose build
docker-compose up -d
docker-compose exec app npx prisma migrate deploy   # Apply migrations in Docker
docker-compose exec app node prisma/seed.mjs         # Seed in Docker
```

## Architecture

Full-stack property management system: **Vite + React 19** frontend with **Express** backend, **Prisma** ORM on **PostgreSQL 16**. Brand name is **VersaHome**.

### Frontend (`src/`)

- **React 19 + TypeScript + Tailwind CSS 4**, bundled with Vite
- **Routing:** React Router 7 — public routes (`/`, `/login`) and protected routes under `/manage/*`
- **Auth state:** `AuthContext` (React Context) handles JWT tokens, auto-refresh (every 14min), and session persistence via HTTP-only cookies
- **Data flow:** `App.tsx` centralizes data management using `useApi` hook. All CRUD operations go through the backend API — no localStorage.
- **Pages:** `src/pages/manage/` — Dashboard, MasterProperties, Units, Carparks, Timeline, Customers
- **Modals:** `src/components/manage/` — CRUD modal dialogs for each entity + LeaseBookingModal for lease creation
- **i18n:** `src/i18n/` — LanguageContext + translations file for multi-language support

### Backend (`server/`)

- **Express** server on port 5000, serves built frontend static files in production
- **API prefix:** All routes under `/api/`
- **Route files:** `server/routes/` — `auth.ts`, `assets.ts`, `customers.ts`, `inventory.ts`, `bookings.ts`, `upload.ts`, `reminders.ts`
- **Middleware chain:** `authenticate` (JWT verify) → `authorize(role)` (RBAC) → handler
- **Auth service:** `server/services/auth.service.ts` — JWT access tokens (15min), refresh token rotation (7d), account lockout after 5 failed attempts
- **Lease service:** `server/services/lease.service.ts` — conflict detection, invoice generation, total calculation
- **File uploads:** Multer disk storage, PDF/JPG/PNG only, 10MB max, stored in `uploads/`
- **Email:** Nodemailer for password reset, rental reminders, lease expiry notices
- **Validation:** Zod schemas for request body validation

### API Routes

| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/assets/properties` | GET, POST, PUT, DELETE | Viewer/Manager | MasterProperty CRUD |
| `/api/assets/units` | GET, POST, PUT, DELETE | Viewer/Manager | Unit CRUD |
| `/api/assets/carparks` | GET, POST, PUT, DELETE | Viewer/Manager | Carpark CRUD |
| `/api/customers` | GET, POST, PUT, DELETE | Viewer/Manager | Customer CRUD |
| `/api/inventory/timeline` | GET | Viewer | Timeline data (units + carparks + leases) |
| `/api/inventory/customers/search` | GET | Viewer | Customer search by name/phone/IC |
| `/api/bookings` | POST | Manager | Create lease agreement with invoices |
| `/api/auth/*` | various | Public/Protected | Login, refresh, logout, password reset, user CRUD |
| `/api/upload` | POST, GET, DELETE | Manager | File upload/download/delete |
| `/api/reminders/*` | POST | Admin | Rental and lease expiry email reminders |

### Database (`prisma/`)

- **Schema:** `prisma/schema.prisma`
- **Asset models:** MasterProperty → Unit (cascade delete), Carpark (independent)
- **Lease models:** LeaseAgreement → LeaseDeposit, Invoice (cascade delete)
- **Auth models:** User, RefreshToken, PasswordResetToken, AuditLog
- **Legacy models:** Property, Room, Booking, MaintenanceLog, File (still in schema, not used in UI)
- **Binary targets:** native, linux-musl, linux-musl-openssl-3.0.x (for Docker Alpine)
- Unit numbers are unique per property (compound unique constraint)
- Carpark numbers are globally unique
- Customer `icPassport` is unique; `customerNo` is auto-incrementing for display

### Role Hierarchy

`VIEWER` (read-only) → `MANAGER` (CRUD, file management) → `ADMIN` (reminders) → `SUPER_ADMIN` (user management)

### Key Patterns

- **API hook:** `src/hooks/useApi.ts` wraps `fetch()` with auth headers from `useAuth()` context
- **Decimal handling:** Prisma `Decimal` fields (prices) must be converted to `Number()` in API responses
- **Prisma error codes:** `P2002` = unique constraint violation (→ 409), `P2003` = foreign key violation (→ 409), `P2025` = record not found (→ 404)
- **Timeline page** fetches its own data via `useApi` (not from App.tsx state)
- **LeaseBookingModal** handles customer search and lease creation independently via API

### Dev Proxy

In development, Vite proxies `/api` requests to `http://localhost:5000`.

## Environment Variables

Required in `.env`:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_ACCESS_SECRET` — min 32 characters
- `CLIENT_URL` — frontend URL (for CORS and email links)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` — email config

Optional:
- `GEMINI_API_KEY` — Google Gemini AI integration
- `DB_PASSWORD` — used by docker-compose

## Default Login

Seeded via `prisma/seed.ts`:
- Email: `admin@versahome.com.my`
- Password: `Admin@VersaHome2026!`
- Role: SUPER_ADMIN
