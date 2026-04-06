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
- **Pages:** `src/pages/manage/` — Dashboard, MasterProperties, Units, Carparks, Timeline, Customers, DataSources, Leases, Expenses, Profit, Users
- **Modals:** `src/components/manage/` — CRUD modal dialogs for each entity + LeaseBookingModal (create lease) + LeaseDetailModal (view/edit lease + invoices)
- **i18n:** `src/i18n/` — LanguageContext + translations file for multi-language support

### Backend (`server/`)

- **Express** server on port 5000, serves built frontend static files in production
- **API prefix:** All routes under `/api/`
- **Route files:** `server/routes/` — `auth.ts`, `assets.ts`, `customers.ts`, `datasources.ts`, `inventory.ts`, `bookings.ts`, `leases.ts`, `expenses.ts`, `profit.ts`, `upload.ts`, `reminders.ts`
- **Middleware chain:** `authenticate` (JWT verify) → `authorize(role)` (RBAC) → handler
- **Auth service:** `server/services/auth.service.ts` — JWT access tokens (15min), refresh token rotation (7d), account lockout after 5 failed attempts
- **Lease service:** `server/services/lease.service.ts` — conflict detection, invoice generation, total calculation
- **File uploads:** Multer disk storage, PDF/JPG/PNG only, 10MB max, stored in `uploads/`
- **Email:** Nodemailer for password reset, rental reminders, lease expiry notices
- **Validation:** Zod schemas for request body validation
- **Rate limiting:** Global 500 req/15min (prod) or 2000 (dev); auth endpoints 10/15min (prod) or 50 (dev)
- **Trust proxy:** `trust proxy = 1` for Cloudflare Tunnel — required for rate limiter and secure cookies behind a reverse proxy
- **Leases route exports three routers:** `leasesRouter` (default), `invoicesRouter`, `depositsRouter` — all mounted separately in `index.ts` at `/api/leases`, `/api/invoices`, `/api/deposits`

### API Routes

| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/assets/properties` | GET, POST, PUT, DELETE | Viewer/Manager | MasterProperty CRUD |
| `/api/assets/units` | GET, POST, PUT, DELETE | Viewer/Manager | Unit CRUD |
| `/api/assets/carparks` | GET, POST, PUT, DELETE | Viewer/Manager | Carpark CRUD |
| `/api/customers` | GET, POST, PUT, DELETE | Viewer/Manager | Customer CRUD |
| `/api/datasources` | GET, POST, PUT, DELETE | Viewer/Manager | DataSource CRUD |
| `/api/inventory/timeline` | GET | Viewer | Timeline data (units + carparks + leases) |
| `/api/inventory/customers/search` | GET | Viewer | Customer search by name/phone/IC |
| `/api/bookings` | POST | Manager | Create lease agreement with invoices |
| `/api/leases` | GET | Viewer | List all leases with deposits + invoices |
| `/api/leases/:id` | GET | Viewer | Single lease detail |
| `/api/leases/:id` | PATCH | Manager | Edit unitPrice, endDate, notes on active/upcoming lease |
| `/api/leases/:id/terminate` | PATCH | Manager | Terminate active/upcoming lease, cancel pending invoices |
| `/api/leases/:id/complete` | PATCH | Manager | Complete active lease, set asset to VACANT |
| `/api/leases/:id/invoices` | GET | Viewer | List invoices for a lease |
| `/api/leases/:id/invoices` | POST | Manager | Manually add an invoice to a lease |
| `/api/invoices/:id` | PATCH | Manager | Edit amount, period, dueDate on pending/overdue invoice |
| `/api/invoices/:id/pay` | PATCH | Manager | Record full or partial payment on an invoice |
| `/api/deposits/:id` | PATCH | Manager | Receive/refund/forfeit deposit (supports partial amounts) |
| `/api/expenses/types` | GET, POST, PUT, DELETE | Viewer/Manager | Expense type CRUD |
| `/api/expenses` | GET, POST, PUT, DELETE | Viewer/Manager | Expense CRUD (per unit, filterable by unitId/propertyId) |
| `/api/expenses/summary` | GET | Viewer | Hierarchical property → unit → expense totals |
| `/api/profit` | GET | Viewer | Cash-basis profit by property/unit for a date range |
| `/api/auth/*` | various | Public/Protected | Login, refresh, logout, password reset, user CRUD |
| `/api/upload` | POST, GET, DELETE | Manager | File upload/download/delete |
| `/api/reminders/rental` | POST | Admin | Email tenants with invoices due within 7 days |
| `/api/reminders/lease` | POST | Admin | Email lease expiry notices (within 30 days) |
| `/api/health` | GET | Public | Health check endpoint |

### Database (`prisma/`)

- **Schema:** `prisma/schema.prisma`
- **Asset models:** MasterProperty → Unit (cascade delete), Carpark (independent)
- **Customer models:** DataSource (optional) → Customer
- **Lease models:** LeaseAgreement → LeaseDeposit, Invoice (cascade delete)
- **Expense models:** ExpenseType, Expense (belongs to Unit)
- **Auth models:** User, RefreshToken, PasswordResetToken, AuditLog
- **File model:** linked only to User (uploader) and optionally Customer — no other FKs
- **Binary targets:** native, linux-musl, linux-musl-openssl-3.0.x (for Docker Alpine)
- Unit numbers are unique per property (compound unique constraint)
- Carpark numbers are globally unique
- Customer `icPassport` is unique; `customerNo` is auto-incrementing for display

### Soft Delete

All deletable entities use soft delete — **DELETE routes set `isActive = false`** rather than removing the row. All GET routes filter `WHERE isActive = true`. Affected models: `Customer`, `MasterProperty`, `Unit`, `Carpark`, `Expense`, `ExpenseType`, `DataSource`. Deleting a `MasterProperty` also soft-deletes all its `Unit` rows in a transaction.

### Role Hierarchy

`VIEWER` (read-only) → `MANAGER` (CRUD, file management) → `ADMIN` (reminders) → `SUPER_ADMIN` (user management)

### Key Patterns

- **API hook:** `src/hooks/useApi.ts` wraps `fetch()` with auth headers from `useAuth()` context
- **Decimal handling:** Prisma `Decimal` fields (prices) must be converted to `Number()` in API responses
- **Prisma error codes:** `P2002` = unique constraint violation (→ 409), `P2003` = foreign key violation (→ 409), `P2025` = record not found (→ 404)
- **Stale Prisma types:** When schema changes are made without running `prisma generate` (e.g. in Docker), new fields/models cause TypeScript errors. Fix with `as any` casts on the affected `prisma.*` calls until the client is regenerated.
- **Timeline page** fetches its own data via `useApi` (not from App.tsx state)
- **LeaseBookingModal** handles customer search and lease creation independently via API
- **Profit page** uses cash-basis accounting: only invoices with `status='PAID'` and `paidAt` within the selected period count as income. Carparks are shown separately (no property/unit hierarchy).
- **React.FC\<T\> required for `key` prop:** In React 19, `function Foo({ ... }: { ... })` doesn't accept `key` as a JSX attribute. Use `const Foo: React.FC<Props> = ({ ... }) =>` and add `import React` explicitly when rendering lists of custom components.
- **Date format:** All dates display as `dd/MM/yyyy` — use `toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })`.
- **Inclusive DAILY billing:** End date is inclusive. `diffDays = Math.round(diffMs / ms_per_day) + 1`. MONTHLY billing uses calendar-month diff: `(endYear - startYear) * 12 + (endMonth - startMonth)`.
- **Partial payments:** Invoices track `paidAmount`; status stays `PENDING` until `paidAmount >= amount`. Deposits track `receivedAmount` and `refundedAmount` with statuses `PARTIALLY_HELD`, `HELD`, `PARTIALLY_REFUNDED`, `REFUNDED`, `FORFEITED`.

### Tab-Based Navigation

`App.tsx` uses `activeTab` state — there are no React Router sub-routes under `/manage`. React Router only handles three routes: `/`, `/login`, `/manage`. All navigation inside the app is prop-driven. Adding a new page requires: adding the tab to `ActiveTab` type in `ManageSidebar.tsx`, adding a `SidebarItem` entry, adding the page component to the `pageContent` map in `App.tsx`, and wiring state/handlers in `App.tsx`.

### Dev Proxy

In development, Vite proxies `/api` requests to `http://localhost:5000`. The proxy includes `cookieDomainRewrite: 'localhost'` for cookie forwarding. Note: production Docker uses `Secure` cookies (HTTPS-only), so cookie-based auth only works through Docker at `http://localhost:5000` — not via the Vite dev server at `:3000`.

### No Error Boundary

There is no React `ErrorBoundary`. Any uncaught render error silently unmounts the entire tree (blank page). When debugging blank pages after navigation, check the browser console for JS errors on the new route.

### esbuild Does Not Type-Check

The Dockerfile uses esbuild for both server and frontend production builds. esbuild strips types without checking them — TypeScript mismatches (e.g. wrong prop names) can pass the build and fail silently at runtime. Always run `npm run lint` before building to catch type errors.

### useCallback Dependencies with Date Objects

`addDays()` returns a new `Date` object on every call. If used as a `useCallback` dependency, it causes an infinite re-fetch loop. Compute derived dates **inside** the callback body, not outside:

```typescript
// ❌ endDate is a new object every render — triggers infinite loop
const endDate = addDays(startDate, dayCount);
const fetch = useCallback(async () => { ... }, [apiFetch, startDate, endDate]);

// ✅ compute inside
const fetch = useCallback(async () => {
  const end = addDays(startDate, dayCount);
  ...
}, [apiFetch, startDate, dayCount]);
```

### Production CORS

In production (`NODE_ENV=production`), `cors({ origin: false })` — only same-origin requests are accepted. This is correct because Express serves the React build directly.

### Local Docker Testing

The worktree has its own `docker-compose.yml` which conflicts with the main project's running DB container (port 5432 already bound). Workflow: copy changed files to the main project directory, rebuild with `docker compose build app`, restart with `docker compose up -d app`, then apply migrations with `docker compose exec app npx prisma migrate deploy`.

When DB is unavailable (Docker workflow), create migration SQL files manually in `prisma/migrations/<timestamp>_<name>/migration.sql` and apply with `migrate deploy` rather than `migrate dev`.

## Environment Variables

Required in `.env`:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_ACCESS_SECRET` — min 32 characters
- `CLIENT_URL` — frontend URL (for CORS and email links)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` — email config

Optional:
- `DB_PASSWORD` — used by docker-compose (injected into `DATABASE_URL` for the `db` service)

## Default Login

Seeded via `prisma/seed.ts`:
- Email: `admin@versahome.com.my`
- Password: `Admin@VersaHome2026!`
- Role: SUPER_ADMIN
