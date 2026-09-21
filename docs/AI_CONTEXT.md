# VersaHome PMS — Context for AI Coding Agents

> **Purpose.** Everything an agent needs to modify this repository safely without re-deriving it. Dense by design. Facts were verified against the source at commit `3a2e7b8`; line numbers are approximate anchors — re-read the file before editing.
> **Human version:** [`ARCHITECTURE.md`](./ARCHITECTURE.md) explains the *why* with diagrams. **Quick file:** [`../CLAUDE.md`](../CLAUDE.md) is loaded automatically by Claude Code and carries the coding conventions; this document is the deeper reference it points to.

---

## 1. Identity

| | |
|---|---|
| Product | VersaHome PMS — single-tenant property management for a KL rental operator. Legacy name "StayFlow" survives in `metadata.json` and the `stayflow` DB name. |
| Stack | React 19 + TS + Tailwind 4 + Vite 6 (`src/`) · Express 4 + Zod 4 (`server/`) · Prisma 5 + PostgreSQL 16 (`prisma/`) · Node 22 · ESM throughout |
| Auth | 15-min JWT in memory + 7-day rotating refresh token in httpOnly cookie |
| Tests | **None.** `npm run lint` = `tsc --noEmit` is the only automated check. |
| Scheduler | **None.** No cron, no `setInterval` on the server. |
| Money | Prisma `Decimal(10,2)` in DB → `Number()` at the API boundary. No ledger; every report recomputes from live rows. |
| Dates | Client sends `YYYY-MM-DD`; server stores UTC instants; display is `dd/MM/yyyy` via `toLocaleDateString('en-GB')`. |

---

## 2. Non-negotiable rules

Read these before touching anything. Each has a section reference for the reasoning.

1. **Never add a hard `delete` for a soft-deleted model.** Customer, Company, DataSource, MasterProperty, Unit, Carpark, ExpenseType, Expense, Owner, OwnerAgreement, Investment use `isActive=false`. Every list query must filter `isActive: true`. (§4.3 of ARCHITECTURE)
2. **Leases end via `status`, not deletion.** `DELETE /api/leases/:id` exists only to undo a mistaken booking: it soft-deletes (`isActive = false`) and is refused once any invoice is paid or a deposit is held. Never hard-delete a lease. Invoices are hard-deleted in exactly one place (lease date/price edit) and you should not add a second. **Any new query that reads leases — directly or through `lease: { … }` — must filter `isActive: true`.**
3. **Do not rename or reuse the expense types `"Cleaning Fee"` and `"Owner Payment"`.** They are upserted by name in `lease.service.ts` and `ownerAgreement.service.ts`.
4. **If you change what counts as income or expense, change it in all three calculators:** `server/routes/profit.ts`, `server/routes/investmentAnalysis.ts`, `server/routes/profitSharing.ts` (two handlers). They are copy-pasted, not shared.
5. **Server date math must use UTC** (`Date.UTC`, `getUTC*`). Existing local-time code in `lease.service.ts`, `leases.ts`, `profitSharing.ts`, `reminders.ts` is a known inconsistency, not a pattern to copy.
6. **Convert every Prisma `Decimal` with `Number()` before `res.json`.** Never return raw Prisma rows containing Decimal fields.
7. **Multi-row writes go in `prisma.$transaction(async tx => …)`.** Services take `tx` as a parameter; pass it through.
8. **Adding a management page = four edits**: `ActiveTab` union + `SidebarItem` in `src/components/layout/ManageSidebar.tsx`; `pageContent` entry + state/handlers in `src/App.tsx`. No React Router sub-routes.
9. **`React.FC<Props>` for any custom component rendered in a list** (React 19 `key` typing). Import `React` explicitly.
10. **Run `npm run lint` before any build.** esbuild in the Dockerfile strips types without checking.
11. **Stale Prisma types:** new field → `(prisma.model.op as any)(…)`; new model → `(prisma as any).model.op(…)`. Never `(prisma.newModel.op as any)` — `prisma.newModel` itself is undefined.
12. **Do not silently "fix" items in §9 Known defects while doing unrelated work.** Tell the user; several are business-rule questions (e.g. the guarantee-fee formula) rather than obvious bugs.
13. **Do not put model identifiers, session URLs or AI attribution in code, comments, or docs committed to the repo** (commit trailers are handled by the harness).

---

## 3. File map

```
server/index.ts                       app wiring; add new routers here (app.use('/api/x', xRouter))
server/middleware/authenticate.ts     Bearer JWT → req.user {userId, role}; NO db lookup, NO isActive check
server/middleware/authorize.ts        ROLE_HIERARCHY {VIEWER:1, MANAGER:2, ADMIN:3, SUPER_ADMIN:4}; PROFIT_SHARING=0
                                      requireViewer/Manager/Admin/SuperAdmin; requireProfitSharingOrViewer
server/services/auth.service.ts       bcrypt(12), JWT 15m, refresh rotation + reuse→revoke-all, lockout 5/15min, reset tokens 1h
server/services/lease.service.ts      checkConflict, generateInvoiceData, calculateTotalAmount, createLease (the booking tx)
server/services/ownerAgreement.service.ts  generateOwnerExpenses (monthly, UTC, clamps paymentDay), voidFutureExpenses
server/routes/auth.ts                 login/refresh/logout/forgot/reset/me + SUPER_ADMIN user CRUD
server/routes/bookings.ts             POST /api/bookings → createLease
server/routes/leases.ts               leasesRouter (list/detail/edit/terminate/complete/invoices/files)
                                      + invoicesRouter (edit/pay/pdf) + depositsRouter — all three exported, mounted separately
server/routes/expenses.ts             types CRUD, expenses CRUD, /summary, PATCH /:id/pay
server/routes/ownerAgreements.ts      CRUD + terminate; PUT does NOT regenerate expenses
server/routes/owners.ts               CRUD (soft delete)
server/routes/investments.ts          CRUD (soft delete)
server/routes/investmentAnalysis.ts   break-even series per unit (UTC month keys)
server/routes/profit.ts               /api/profit, /monthly, /monthly/roomtype (UTC)
server/routes/profitSharing.ts        units, shares, calculate, records; distributeProfit (largest remainder)
server/routes/assets.ts               properties/units/carparks CRUD
server/routes/customers.ts, companies.ts, datasources.ts   CRUD
server/routes/inventory.ts            /timeline, /customers/search
server/routes/upload.ts               multer disk storage → uploads/{photos|documents}; File rows
server/routes/reminders.ts            ADMIN email blasts; resolveRecipient() handles customer OR company
server/services/leaseStatus.service.ts  syncLeaseStatuses(): UPCOMING→ACTIVE + asset OCCUPIED, PENDING→OVERDUE.
                                      Runs on boot, hourly (server/index.ts), and at the top of GET /api/leases
server/lib/prisma.ts                  singleton
server/lib/email.ts                   nodemailer + 3 HTML templates

src/main.tsx                          routes: "/", "/login", "/manage" (ProtectedRoute), "*"→"/"
src/App.tsx                           management shell: all shared state, refreshData() (9 GETs), handlers, modals, pageContent map
src/contexts/AuthContext.tsx          accessToken in state; silent refresh on mount + every 14 min
src/hooks/useApi.ts                   apiFetch: adds Bearer, forces Content-Type: application/json, credentials include
src/components/layout/ManageSidebar.tsx   ActiveTab union; nav; role-based visibility
src/components/manage/*Modal.tsx      uncontrolled forms; selectedX null→create else edit
src/components/manage/LeaseBookingModal.tsx   customer/company search, auto end-date, POST /api/bookings
src/components/manage/LeaseDetailModal.tsx    invoices, deposit, terminate (date picker), complete, edit, files, WhatsApp, PDF
src/pages/manage/*Page.tsx            one per tab; Timeline/Profit/ProfitSharing/InvestmentProfit/Users/Expenses/Investments/OwnerAgreements fetch their own data
src/types.ts                          API response shapes as seen by the client
src/i18n/                             landing page ONLY (zh default, en)
src/index.css                         Tailwind 4 @theme tokens used by the landing page only

prisma/schema.prisma                  source of truth; see §4
prisma/seed.ts                        SUPER_ADMIN seed — username 'admin'; idempotent (matches username OR email)
prisma/migrations/                    prisma migrate deploy; ignore stray manual_customer_update.sql
Dockerfile                            2-stage alpine; esbuild bundles server + seed; prisma generate in both stages
docker-compose.yml / .override.yml    app :5000 (override → :5001), postgres "stayflow"
```

---

## 4. Data model cheat-sheet

### Models, keys, and lifecycle mechanism

| Model | Natural key / uniqueness | Lifecycle | Notes |
|---|---|---|---|
| User | `username` unique (required); `email` unique (optional) | `isActive` | roles below |
| RefreshToken | `tokenHash` | rotated; `isRevoked`; never purged | |
| PasswordResetToken | `tokenHash` | `isUsed`, 1 h | |
| AuditLog | — | **never written** | |
| DataSource | `name` unique | soft | |
| Customer | `icPassport` unique; `customerNo` serial | soft | booking upserts by icPassport |
| Company | none | soft | |
| MasterProperty | none | soft; cascades soft to Units | |
| Unit | `(propertyId, unitNumber)` | soft | `status` VACANT/OCCUPIED/MAINTENANCE managed by lease code; `guaranteeFee` optional |
| Carpark | `carparkNumber` unique | soft | independent of properties |
| LeaseAgreement | none | `status` + **soft** (guarded) | `customerId` xor `companyId`; `unitId` xor `carparkId` (code-enforced); `isActive=false` only via the guarded DELETE |
| LeaseDeposit | `leaseId` unique | status only | |
| Invoice | none | status; **hard-deleted on lease edit** | `amount` net of promotion; `paidAmount` |
| ExpenseType | `name` unique | soft | magic names: "Cleaning Fee", "Owner Payment" |
| Expense | none | soft | always `unitId`; `expenseDate` drives reports; `status/dueDate/paidAt/ownerAgreementId` used by owner payments |
| Owner | none | soft | |
| OwnerAgreement | none | soft + `status` | generates Expenses on create |
| Investment | none | soft + `status` | manual status |
| UnitShare | `(unitId, userId)` | replaced wholesale on PUT | `percentage` Decimal(5,2); total ≤ 100 |
| ProfitSharingRecord | `(unitId, month, year)` | upsert on save | snapshot |
| ProfitSharingAllocation | — | recreated on save | snapshots `userName` |
| File | `storedName` unique | hard delete | bytes in `uploads/photos` or `uploads/documents` by MIME |

### Enums

```
Role: SUPER_ADMIN ADMIN MANAGER VIEWER PROFIT_SHARING
UnitType: STUDIO ONE_BEDROOM TWO_BEDROOM THREE_BEDROOM BUNGALOW OTHER
AssetStatus: VACANT OCCUPIED MAINTENANCE
BillingCycle: DAILY FIXED_TERM MONTHLY
LeaseStatus: UPCOMING ACTIVE TERMINATED COMPLETED
InvoiceStatus: PENDING PAID OVERDUE CANCELLED
DepositStatus: PENDING PARTIALLY_HELD HELD PARTIALLY_REFUNDED REFUNDED FORFEITED
ExpenseStatus: PENDING PAID
OwnerAgreementStatus: ACTIVE TERMINATED COMPLETED   (COMPLETED never set by code)
InvestmentStatus: ACTIVE MATURED WITHDRAWN
PaymentMethod: CASH BANK_TRANSFER
Gender: MALE FEMALE
FileCategory: DOCUMENT RECEIPT PHOTO
```

### Roles → access

| Role | Level | Can |
|---|---|---|
| VIEWER | 1 | read everything under `/manage` |
| MANAGER | 2 | all CRUD, pay invoices/expenses, deposits, upload, set unit shares |
| ADMIN | 3 | + `/api/reminders/*` |
| SUPER_ADMIN | 4 | + `/api/auth/users*` |
| PROFIT_SHARING | 0 (outside) | only `/api/profit-sharing/*` for units with own `UnitShare`, `/api/auth/me`, and `GET /api/upload/:id` (ungated). Frontend pins them to the `profitSharing` tab. Can **save** cutoffs, cannot edit shares. |

---

## 5. API surface

Every route is `authenticate` → role middleware → handler unless marked public. `V` = requireViewer, `M` = requireManager, `A` = requireAdmin, `SA` = requireSuperAdmin, `PS|V` = requireProfitSharingOrViewer, `auth` = authenticate only.

```
POST  /api/auth/login                    public   {identifier, password}; "@"→email else username
POST  /api/auth/refresh                  public   cookie → new access token + rotated cookie
POST  /api/auth/logout                   public
POST  /api/auth/forgot-password          public   (frontend page missing)
POST  /api/auth/reset-password           public   (frontend page missing)
GET   /api/auth/me                       auth
GET   /api/auth/users                    SA
POST  /api/auth/users                    SA       {username, email?, password, name, role}
PUT   /api/auth/users/:id                SA       isActive:false revokes refresh tokens

GET/POST      /api/assets/properties     V / M
PUT/DELETE    /api/assets/properties/:id M        DELETE soft-cascades to units
GET/POST      /api/assets/units          V / M
PUT/DELETE    /api/assets/units/:id      M
GET/POST      /api/assets/carparks       V / M
PUT/DELETE    /api/assets/carparks/:id   M

GET/POST      /api/customers             V / M
PUT/DELETE    /api/customers/:id         M
GET/POST      /api/companies             V / M
GET           /api/companies/search?q=   V
PUT/DELETE    /api/companies/:id         M
GET/POST      /api/datasources           V / M
PUT/DELETE    /api/datasources/:id       M

GET   /api/inventory/timeline?startDate&endDate   V   properties+units+carparks with overlapping ACTIVE/UPCOMING leases
GET   /api/inventory/customers/search?q=          V   max 10

POST  /api/bookings                      M        → createLease (§6.3)

GET   /api/leases                        V        SIDE EFFECT: PENDING with dueDate<now → OVERDUE
GET   /api/leases/:id                    V
PATCH /api/leases/:id                    M        {unitPrice?, startDate?, endDate?, notes?} — regenerates invoices if dates/price
DELETE /api/leases/:id                   M        soft delete (isActive=false); 409 if any invoice PAID/part-paid or deposit HELD;
                                                  frees the asset to VACANT; cleaning-fee expenses are NOT removed
PATCH /api/leases/:id/terminate          M        {terminationDate?} within [start,end]
PATCH /api/leases/:id/complete           M        ACTIVE only
GET/POST /api/leases/:id/invoices        V / M
GET   /api/leases/:id/files              V
DELETE /api/leases/:id/files/:fileId     M

PATCH /api/invoices/:id                  M        {amount?, dueDate?, periodStart?, periodEnd?} not PAID/CANCELLED
PATCH /api/invoices/:id/pay              M        {amount, paymentMethod?, referenceNo?} partial ok; PAID when paidAmount≥amount
GET   /api/invoices/:id/pdf              V        pdfkit stream

PATCH /api/deposits/:id                  M        {action: receive|refund|forfeit|editAmount, amount}  forfeit.amount = returned-to-tenant

GET/POST      /api/expenses/types        V / M
PUT/DELETE    /api/expenses/types/:id    M
GET           /api/expenses?unitId&propertyId   V   (no status/dueDate in response)
GET           /api/expenses/summary      V
POST          /api/expenses              M
PUT/DELETE    /api/expenses/:id          M
PATCH         /api/expenses/:id/pay      M        status PAID, paidAt now

GET/POST      /api/owners                V / M
GET/PUT/DELETE /api/owners/:id           V / M
GET/POST      /api/owner-agreements      V / M    POST generates N monthly PENDING expenses
GET/PUT/DELETE /api/owner-agreements/:id V / M    PUT: no regen. DELETE: voids PENDING expenses
PATCH         /api/owner-agreements/:id/terminate  M   voids PENDING expenses with dueDate > date

GET/POST      /api/investments           V / M
GET/PUT/DELETE /api/investments/:id      V / M
GET   /api/investment-analysis           V
GET   /api/investment-analysis/:unitId   V

GET   /api/profit?from&to&propertyId&unitId&carparkId   V   default = current UTC month
GET   /api/profit/monthly?year&…         V
GET   /api/profit/monthly/roomtype?year&…  V

GET   /api/profit-sharing/shareable-users        PS|V
GET   /api/profit-sharing/units                  PS|V   PS sees only own-share units
GET   /api/profit-sharing/:unitId/shares         PS|V
PUT   /api/profit-sharing/:unitId/shares         M      {shares:[{userId,percentage}]} total ≤ 100, replaces all
GET   /api/profit-sharing/:unitId/calculate?year&month   PS|V (PS must own share)
GET   /api/profit-sharing/:unitId/records        PS|V (PS must own share)
POST  /api/profit-sharing/:unitId/records        PS|V (PS must own share)  {month, year, notes?} upsert

POST  /api/upload                        M        multipart "file" (pdf/jpg/png ≤10MB) + customerId?, leaseId?, category?
GET   /api/upload/:id                    auth     NO role check
DELETE /api/upload/:id                   M

POST  /api/reminders/rental              A        invoices PENDING due ≤7d on ACTIVE leases — crashes on company leases
POST  /api/reminders/lease               A        ACTIVE leases ending ≤30d — crashes on company leases
GET   /api/health                        public
```

Error conventions: Zod failure → `400 {error: issues[0].message}` (lease routes use `{error, details: flatten()}`); `P2002` → 409; `P2003` → 409/400; `P2025` → 404; else 500 + `console.error`.

---

## 6. Invariants and derived-state rules

Numbered so you can cite them. File anchors are approximate.

### 6.1 One scheduled job; everything else is manual
- `syncLeaseStatuses()` (`server/services/leaseStatus.service.ts`) is the **only** clock-driven code. It runs on boot, hourly from `server/index.ts`, and at the top of `GET /api/leases`. Idempotent — keep any addition idempotent too.
- It does exactly two things: `UPCOMING → ACTIVE` for leases whose `startDate` has arrived (+ asset `OCCUPIED`), and `PENDING → OVERDUE` for past-due invoices.
- Month/day comparisons inside it use UTC (`Date.UTC`), because lease dates are stored as UTC midnight.
- `ACTIVE → COMPLETED` is **manual** and deliberately not automated — it implies the deposit was settled. Consequence: a lease past `endDate` keeps its unit `OCCUPIED` until someone terminates or completes it.
- `OwnerAgreementStatus.COMPLETED` is never set. `Investment.MATURED` is manual.
- `Unit.status` / `Carpark.status` change only in: createLease (→OCCUPIED), syncLeaseStatuses (→OCCUPIED), PATCH lease (ACTIVE↔UPCOMING), terminate, complete, delete (→VACANT).
- Refresh tokens are never purged.

### 6.2 Income & expense definition (three copies)
- Income in `profit.ts` / `investmentAnalysis.ts` = `Invoice` with `status='PAID'` and **`paidAt`** in range, summed by `amount` (not `paidAmount`).
- Income in `profitSharing.ts` = `Invoice` with `status='PAID'` and **`periodStart`** in range. Rent for a period starting 9 Sep counts in September even if paid 10 Oct. **Deliberately different from the other two** (requested Sept 2026); they will not reconcile.
- Partial payments contribute **nothing** until fully paid, then the full amount at once.
- Every income/expense query filters `lease: { …, isActive: true }`.
- Expense = `Expense` with `isActive` and `expenseDate` in range, **regardless of `status`** (future PENDING owner payments count now).
- Promotion reduces invoice `amount`; it is **not** an expense. PDF shows gross = `amount + promotionAmount`.
- Month boundaries: UTC everywhere (`profitSharing.ts` uses the shared `monthBounds()` helper).
- Guarantee fee: `finalProfit = totalSales >= fee ? net : net - fee` (`profitSharing.ts:247`, `:367`). Whole fee deducted on shortfall, not the gap.
- Allocation = largest-remainder in cents (`profitSharing.ts:23-33`); sums exactly to `finalProfit`.
- Saved `ProfitSharingRecord` is a snapshot; re-saving overwrites and rebuilds allocations from **current** shares.

### 6.3 What a booking creates (one transaction, `lease.service.ts:138-290`)
1. Conflict: any ACTIVE/UPCOMING lease on the same asset with `startDate < newEnd && endDate > newStart` → `409`.
2. Customer: **upsert by `icPassport`**, overwriting `name`, `phoneLocal`, and `email` if provided (`:171-185`). `currentAddress` defaults to `''`.
3. Company: existing `companyId` or create new.
4. Lease: `status = startOfDay(start) <= today ? ACTIVE : UPCOMING`; `totalAmount` snapshot.
5. Deposit: one row, PENDING.
6. Invoices: DAILY → one invoice for the whole stay (`amount = totalAmount`); MONTHLY/FIXED_TERM → one per month step, `amount = unitPrice − promotionAmount`, `dueDate = periodStart`.
7. Cleaning fee: if `cleaningFee > 0 && unitId` → upsert type "Cleaning Fee", create one Expense per invoice period at `expenseDate = periodStart`. **No back-reference to the lease.**
8. If ACTIVE → asset `OCCUPIED`.

`calculateTotalAmount`: DAILY = `round(days)+1` (inclusive) × effective; else `(endY−startY)*12 + (endM−startM) || 1` × effective — day-of-month is ignored.

`generateInvoiceData` month step: `new Date(y, m+1, d)` **local time, JS overflow** → start day 31 drifts (Jan 31 → Mar 3). Owner-agreement generation clamps correctly; use it as the model.

### 6.4 Lease edit / terminate side effects
- `PATCH /leases/:id` with `startDate`/`endDate`/`unitPrice`: **hard-deletes** PENDING+OVERDUE invoices, regenerates for the full period, keeps PAID+CANCELLED (`leases.ts:334-354`). Does **not** touch cleaning-fee expenses, deposit, promotion, or manually-added invoices' intent. Can produce duplicate periods next to PAID ones. Recomputes status and syncs asset status.
- `PATCH /leases/:id/terminate`: sets TERMINATED (+`endDate` if given), cancels **PENDING only** with `periodStart > terminationDate` (OVERDUE survive), asset → VACANT. Cleaning-fee expenses untouched.
- `PATCH /leases/:id/complete`: ACTIVE only; asset → VACANT; invoices untouched.

### 6.5 Owner agreements
- Create: one `Expense` per calendar month start→end inclusive; type "Owner Payment" upserted; `expenseDate = dueDate = paymentDay clamped`; UTC; PENDING; `ownerAgreementId` set (`ownerAgreement.service.ts:17-56`).
- `PUT`: updates the agreement **only**. No regeneration (`ownerAgreements.ts:137-167`).
- Terminate: `voidFutureExpenses(dueDate > terminationDate, PENDING)` → `isActive=false`; status TERMINATED; `endDate` set.
- Delete: voids **all** PENDING (`afterDate = epoch`); agreement soft-deleted. PAID remain.
- Only ACTIVE agreements can be edited/terminated.

### 6.6 Deposits (`leases.ts:752-829`)
- `receive`: adds to `receivedAmount`, caps at `amount`; HELD when full else PARTIALLY_HELD. From PENDING/PARTIALLY_HELD only.
- `refund`: adds to `refundedAmount`, caps; REFUNDED when full else PARTIALLY_REFUNDED. From HELD/PARTIALLY_HELD/PARTIALLY_REFUNDED.
- `forfeit`: from HELD/PARTIALLY_HELD; **`amount` = portion returned to tenant** (0 = keep all) stored in `refundedAmount`; status FORFEITED.
- `editAmount`: any state except REFUNDED/PARTIALLY_REFUNDED/FORFEITED; status preserved.

### 6.7 Auth
- Access JWT `{userId, role}`, 15 min, in React state only. Page load → `POST /refresh` → `GET /me`.
- Refresh cookie: httpOnly, `sameSite=strict`, `secure` in prod, 7 d, rotated every use. Reused/expired token → **all** user's refresh tokens revoked (`auth.service.ts:82-88`).
- `authenticate` does not check `isActive` or re-read role → changes lag ≤15 min.
- Lockout: 5 failures → 15 min. Only `/login` and `/forgot-password` are rate-limited beyond the global limiter.
- Login identifier: contains `@` → `findUnique({email})` else `findFirst({username})`.
- Password reset needs an email; frontend pages for it don't exist.

### 6.8 Frontend
- `refreshData()` in `App.tsx:112-135` = 9 parallel GETs; called after most mutations. Self-fetching pages use `refreshSignal` counters.
- `apiFetch` identity changes every token refresh (14 min) → dependent effects re-run.
- `apiFetch` forces `Content-Type: application/json`; FormData through it (`LeaseDetailModal.tsx:411-425`) is very likely broken — bypass for multipart.
- `PROFIT_SHARING` users: `App.tsx:57-64` forces `profitSharing` tab; sidebar hides the rest.
- `ManageSidebar.tsx:19` `isSuperAdmin` is true for ADMIN too (shows Users tab → API 403). Footer user card is hard-coded.
- No error boundary; `alert`/`confirm` for all feedback.
- Client dates: `new Date('YYYY-MM-DD')` = UTC midnight; display in browser TZ; correct for UTC+8.

### 6.9 Soft-delete non-cascade
- Only Property→Units cascades (soft). Soft-deleting a Unit/Customer/Company leaves leases, invoices, expenses, investments, agreements live and visible in lists that don't join through the parent's `isActive`.
- Prisma `onDelete` clauses are dormant (no hard deletes on those models via API).
- DataSource delete does **not** clear `dataSourceId` on customers (SetNull is hard-delete-only); the UI confirm text is wrong.

### 6.10 Reports and soft-deleted units
- `profit.ts` filters `expense.isActive` but not `unit.isActive`; a soft-deleted unit's paid invoices and expenses still appear. `profitSharing.ts /units` filters active units. `inventory /timeline` lists active units only, so a soft-deleted unit's lease is invisible on the timeline but present in `/api/leases`.

---

## 7. Recipes

### 7.1 Add a new Prisma model + CRUD + page
1. `prisma/schema.prisma`: add model with `id String @id @default(uuid())`, `isActive Boolean @default(true)`, `createdAt`, `updatedAt @updatedAt`, `@@map("snake_case")`. Add relation arrays on parents.
2. Migration: `npm run db:migrate --name add_x` if a DB is reachable; otherwise hand-write `prisma/migrations/<YYYYMMDDHHMMSS>_add_x/migration.sql` and apply with `db:deploy`.
3. `server/routes/x.ts`: copy `server/routes/owners.ts` (simplest full CRUD with soft delete). Zod schema, `serialize()` with `Number()` for Decimals, `isActive: true` filters, `(prisma as any).x` casts until types regenerate.
4. `server/index.ts`: `import xRouter …; app.use('/api/x', xRouter)`.
5. `src/types.ts`: add the response interface.
6. `src/components/manage/XModal.tsx`: copy `OwnerModal.tsx` (uncontrolled `FormData` form; `selectedX` prop).
7. `src/pages/manage/XPage.tsx`: copy the closest page; decide props-fed (add to `refreshData`) or self-fetching (add `refreshSignal` prop).
8. `src/components/layout/ManageSidebar.tsx`: extend `ActiveTab`; add `SidebarItem`.
9. `src/App.tsx`: state, handlers (`handleSaveX`, `handleDeleteX`), `pageContent.x`, `<XModal …/>`.
10. `npm run lint`.

### 7.2 Add a role-gated endpoint
`router.<verb>(path, authenticate, requireManager, async (req: AuthRequest, res) => {...})`. For PROFIT_SHARING access use `requireProfitSharingOrViewer` **and** call the `verifyShareAccess` pattern from `profitSharing.ts:36-47` for unit-scoped data.

### 7.3 Change invoice generation
Edit `generateInvoiceData` / `calculateTotalAmount` in `server/services/lease.service.ts`. Both `createLease` and `PATCH /leases/:id` (`leases.ts:314`, `:340`) call them, so the change applies to booking **and** edit-regeneration. Keep DAILY (one invoice) and MONTHLY/FIXED_TERM (per-month) branches. Prefer walking `(year, month)` integers with a clamped day, as `ownerAgreement.service.ts` does, and use UTC.

### 7.4 Change what counts as profit
Edit **all** of: `profit.ts` (`/`, `/monthly`, `/monthly/roomtype` — three handlers), `investmentAnalysis.ts` (`getUnitMonthlyData`), `profitSharing.ts` (`/calculate` and `POST /records` — two handlers). Better: extract a shared helper first.

### 7.5 Add a scheduled job
Extend `syncLeaseStatuses()` in `server/services/leaseStatus.service.ts` rather than adding a second scheduler — it is already wired to boot, an hourly `setInterval` in `server/index.ts`, and `GET /api/leases`. No cron dependency is used. **Keep every addition idempotent**, since it runs on each Leases page load. Remaining candidates: purge expired `RefreshToken` rows; decide what should happen when a lease passes its `endDate` (§6.1).

### 7.6 Touch the landing page
Content lives in `src/i18n/translations.ts` (both `zh` and `en` keys; `t()` picks by `lang`). Components in `src/components/landing/`. `CTASection.tsx` has a hard-coded WhatsApp URL — keep it in sync with `translations.contact.whatsapp.link`. QR images in `public/`.

---

## 8. Gotcha index (one line each → details in ARCHITECTURE §9)

- OVERDUE and UPCOMING→ACTIVE are handled by `syncLeaseStatuses()` (boot, hourly, and on `GET /api/leases`).
- A lease past its end date still does NOT auto-complete; its unit stays OCCUPIED until someone closes it.
- Three profit calculators; profit-sharing dates income by invoice `periodStart`, the other two by `paidAt` — they do not reconcile, by design.
- A lease can be soft-deleted; every lease query must filter `isActive: true`, including the booking conflict check.
- Expense status is ignored by every report.
- Partial invoice payments are invisible to profit until complete.
- Booking upserts customer by IC and overwrites name/phone.
- "Cleaning Fee" / "Owner Payment" are magic type names.
- Lease edit hard-deletes PENDING+OVERDUE invoices and regenerates everything; cleaning-fee expenses orphaned.
- Terminate cancels PENDING only; OVERDUE survive.
- Invoice month step overflows (31st → 3rd); local time.
- Owner-agreement PUT doesn't regenerate expenses.
- `forfeit.amount` = amount **returned**.
- `totalAmount` is a snapshot; sum invoices instead.
- `authenticate` trusts the JWT for 15 min; no isActive check.
- Refresh reuse revokes all sessions.
- `GET /api/upload/:id` ungated.
- `apiFetch` forces JSON content-type (breaks FormData).
- `refreshData()` = 9 GETs after most saves; re-fires on token refresh.
- ADMIN sees Users tab → 403.
- Soft delete doesn't cascade (except property→units); `onDelete` clauses dormant.
- `AuditLog` never written.
- `as any` casts hide field-name typos from `tsc`.
- No tests; esbuild doesn't type-check.

---

## 9. Known defects — surface, don't silently fix

Verified by reading at `3a2e7b8`, not by running. When you encounter one during unrelated work, mention it to the user rather than folding a fix into your change.

| # | File | Defect |
|---|---|---|
| 1 | ~~`server/routes/reminders.ts` company-lease null deref~~ | **Fixed** Sept 2026 — `resolveRecipient()`, per-send try/catch, skipped/failed counts in the response. |
| 2 | ~~`prisma/seed.ts` missing `username`~~ | **Fixed** Sept 2026 — seeds `username: 'admin'`, matches on username OR email. |
| 3 | `src/main.tsx` | `/forgot-password` and `/reset-password` pages don't exist; catch-all sends users to `/`. |
| 4 | `server/routes/leases.ts:161-164` | Terminate ignores OVERDUE invoices. Add `status: { in: ['PENDING','OVERDUE'] }`. |
| 5 | `server/routes/leases.ts:334-354` | Edit-regeneration doesn't reconcile PAID periods or cleaning-fee expenses. Business decision needed. |
| 6 | `server/services/lease.service.ts:96` | Month stepping overflow + local time. |
| 7 | ~~`server/routes/profitSharing.ts` local-time month boundaries~~ | **Fixed** Sept 2026 — `monthBounds()` is UTC. |
| 8 | `src/components/layout/ManageSidebar.tsx:19` | `isSuperAdmin` includes ADMIN. |
| 9 | `src/components/manage/LeaseDetailModal.tsx:411-425` + `src/hooks/useApi.ts:11` | FormData sent as `application/json`. Verify; bypass `apiFetch` for multipart. |
| 10 | `server/routes/upload.ts:87` | No `authorize` on file download. |
| 11 | `prisma/schema.prisma:148-161` | `AuditLog` unused. |
| 12 | `package.json` | `jspdf`, `jspdf-autotable` unused; `@types/*`, `vite` in `dependencies`. |
| 13 | `README.md` | AI-Studio boilerplate (`GEMINI_API_KEY`); should point at `docs/`. |
| 14 | `src/App.tsx:316` | DataSource delete confirm claims linked customers are cleared; they are not. |

Business-rule questions (not bugs until the owner says so): guarantee-fee formula (§6.2); `calculateTotalAmount` ignoring day-of-month; cash-basis dating of income by `paidAt`.

---

## 10. Verification

```bash
npm run lint                 # tsc --noEmit. Requires node_modules. This is the whole test suite.
npm run build                # vite build; catches import/JSX errors only
npx prisma validate          # schema syntax
npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url "$DATABASE_URL"
                             # confirms migrations match schema (needs a DB)
```

In a sandbox without `node_modules`, `npm run lint` reports hundreds of `Cannot find module 'react'` errors — that is environmental noise, not a signal. Install with `npm ci` first if network allows. There is no way to exercise Prisma queries without a PostgreSQL instance; `docker compose up db` provides one.

When you cannot run something, say so explicitly in your report rather than implying it passed.
