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
```

## Architecture

Full-stack property management system: **Vite + React 19** frontend with **Express** backend, **Prisma** ORM on **PostgreSQL 16**.

### Frontend (`src/`)

- **React 19 + TypeScript + Tailwind CSS 4**, bundled with Vite
- **Routing:** React Router 7 — public routes (`/`, `/login`) and protected routes under `/manage/*`)
- **Auth state:** `AuthContext` (React Context) handles JWT tokens, auto-refresh, and session persistence via HTTP-only cookies
- **Data flow:** `App.tsx` centralizes data management and passes handlers down as props to page components
- **Pages:** `src/pages/manage/` — Dashboard, Properties, Rooms, Bookings, Customers, Maintenance, Revenue, Fees
- **Modals:** `src/components/manage/` — CRUD modal dialogs for each entity
- **i18n:** `src/i18n/` — LanguageContext + translations file for multi-language support
- **Invoice generation:** jsPDF + jsPDF-AutoTable (client-side PDF)

### Backend (`server/`)

- **Express** server on port 5000, serves built frontend static files in production
- **API prefix:** All routes under `/api/`
- **Route files:** `server/routes/` — `auth.ts`, `upload.ts`, `reminders.ts`
- **Middleware chain:** `authenticate` (JWT verify) → `authorize(role)` (RBAC) → handler
- **Auth service:** `server/services/auth.service.ts` — JWT access tokens (15min), refresh token rotation (7d), account lockout after 5 failed attempts
- **File uploads:** Multer disk storage, PDF/JPG/PNG only, 10MB max, stored in `uploads/`
- **Email:** Nodemailer for password reset, rental reminders, lease expiry notices
- **Validation:** Zod schemas for request body validation

### Database (`prisma/`)

- **Schema:** `prisma/schema.prisma` — User, Property, Room, Customer, Booking, MaintenanceLog, File, AuditLog, RefreshToken, PasswordResetToken
- **Binary targets:** native, linux-musl, linux-musl-openssl-3.0.x (for Docker Alpine)
- Room numbers are unique per property (compound unique constraint)
- Customer has auto-incrementing `customerNo` for display

### Role Hierarchy

`VIEWER` (read-only) → `MANAGER` (file management) → `ADMIN` (reminders, rentals) → `SUPER_ADMIN` (user management)

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
