# freelancr

SaaS for freelancers and small agencies (India-first): AI-powered client proposals, GST-ready invoicing, client management, and Razorpay payments in one dashboard.

## Stack

- **Frontend:** React (Vite) + TypeScript + Tailwind CSS + shadcn-style components — `client/`
- **Backend:** Node.js + Express + TypeScript — `server/`
- **Database:** PostgreSQL via Prisma
- **Auth:** JWT access token + rotating refresh tokens, both in httpOnly cookies
- **AI:** Anthropic Claude API (proposals — build step 4)
- **Payments:** Razorpay Orders + webhooks (build step 5)

## Getting started

```bash
# 1. Install dependencies (npm workspaces)
npm install

# 2. Configure the server
cp server/.env.example server/.env
# fill in DATABASE_URL and JWT_SECRET (openssl rand -base64 48)

# 3. Create the database and run migrations
createdb freelance_saas
npm run db:migrate

# 4. Run both servers (API on :4000, client on :5173)
npm run dev
```

The Vite dev server proxies `/api/*` to the Express API, so cookies work on a single origin in development.

## Auth design

- **Access token:** 15-minute JWT in an httpOnly `access_token` cookie (path `/`).
- **Refresh token:** opaque 48-byte random token, SHA-256 hash stored in `refresh_tokens`, 30-day TTL, httpOnly cookie scoped to `/api/auth`. Every refresh **rotates** the token; replaying a revoked token revokes all of that user's sessions (theft detection).
- **Password reset:** single-use, 1-hour tokens emailed as a link. Without SMTP configured, the email is printed to the server console (dev mode). A successful reset revokes all sessions.
- Passwords hashed with bcrypt (12 rounds). Auth endpoints are rate-limited (20 req / 15 min / IP).

## Multi-tenancy

Every table except `users` carries a `user_id` FK with indexes on `user_id` (and `client_id` where relevant). All queries in later modules must filter by the authenticated `user_id`.

## Project layout

```
server/
  prisma/schema.prisma   # full schema: users, clients, proposals, invoices,
                         # invoice_items, payments, activity_log + auth tables
  src/
    config/env.ts        # zod-validated environment
    middleware/          # auth guard, validation, error handler
    routes/              # auth.routes.ts (more per module)
    services/            # auth, token, email, activity
client/
  src/
    components/ui/       # button, input, label, card
    components/layout/   # DashboardLayout (sidebar + mobile drawer)
    context/AuthContext.tsx
    lib/api.ts           # fetch wrapper w/ automatic token refresh + retry
    pages/               # auth pages, dashboard, module placeholders
```

## Build roadmap

1. ✅ Auth + dashboard shell + DB schema
2. ✅ Client management (CRUD, search/filter, detail page with linked docs)
3. ✅ Invoice generator (GST: CGST/SGST/IGST) + PDF export + email send
4. ✅ AI proposal generator (Claude `claude-sonnet-4-6`, Hinglish support, editable sections, PDF)
5. ✅ Razorpay payment links + signed webhook (`payment.captured` → invoice PAID)
6. ✅ Dashboard analytics (summary cards, 6-month revenue chart, activity feed)

## Optional API keys

The app runs without these; features degrade gracefully with in-app notices:

- `ANTHROPIC_API_KEY` — enables real AI proposal generation (without it, a
  built-in template is used).
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` —
  enables payment links on sent invoices and automatic paid-status via webhook
  (point the Razorpay webhook to `POST /api/webhooks/razorpay`, event
  `payment.captured`). Invoices can always be marked paid manually.
- `SMTP_*` — real email delivery; otherwise emails are logged to the server
  console in dev.
