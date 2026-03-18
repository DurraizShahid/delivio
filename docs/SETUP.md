# Delivio Backend — Complete Setup Guide

This guide walks you through every step to get the Delivio backend running locally, configure all external services, run database migrations, and deploy to production.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone & Install](#2-clone--install)
3. [Environment Variables](#3-environment-variables)
4. [Supabase Setup](#4-supabase-setup)
5. [Database Migrations](#5-database-migrations)
6. [Redis Setup](#6-redis-setup)
7. [Stripe Setup](#7-stripe-setup)
8. [Twilio SMS Setup](#8-twilio-sms-setup)
9. [Email Provider Setup](#9-email-provider-setup)
10. [Firebase Push Notifications](#10-firebase-push-notifications)
11. [Google Maps API](#11-google-maps-api)
12. [Sentry Error Tracking](#12-sentry-error-tracking)
13. [Start the Server](#13-start-the-server)
14. [Testing with Postman](#14-testing-with-postman)
15. [Running Automated Tests](#15-running-automated-tests)
16. [WebSocket Testing](#16-websocket-testing)
17. [Production Deployment](#17-production-deployment)
18. [Troubleshooting](#18-troubleshooting)

---

## 1. Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 20 LTS or later | Runtime |
| **npm** | 10+ (ships with Node 20) | Package manager |
| **Git** | Any recent version | Version control |
| **Docker** (optional) | 24+ | For Redis and containerised deployment |

Verify your Node version:

```bash
node --version   # Must be v20.x.x or higher
npm --version    # Must be v10.x.x or higher
```

---

## 2. Clone & Install

```bash
# Clone the repository
git clone <your-repo-url> Delivio
cd Delivio

# Install backend dependencies
cd server
npm install
cd ..
```

---

## 3. Environment Variables

Copy the example file to create your `.env`:

```bash
cp .env.example .env
```

Open `.env` in your editor. The sections below explain how to obtain every value.

### Quick Reference — What's Required vs Optional

| Variable | Required? | Fallback |
|----------|-----------|----------|
| `SESSION_SECRET` | **Yes** | Weak default in dev |
| `SUPABASE_URL` | **Yes** | None — app won't start |
| `SUPABASE_SERVICE_KEY` | **Yes** | None — app won't start |
| `SUPABASE_ACCESS_TOKEN` | **Yes** (for migrations) | None |
| `ALLOWED_ORIGINS` | **Yes** (production) | `localhost:5173,localhost:3000` |
| `REDIS_URL` | No | In-memory store (dev only) |
| `STRIPE_SECRET_KEY` | No | Dummy processor (logs to console) |
| `STRIPE_WEBHOOK_SECRET` | No | Webhook verification skipped |
| `TWILIO_ACCOUNT_SID` | No | OTP logged to console |
| `TWILIO_AUTH_TOKEN` | No | OTP logged to console |
| `TWILIO_PHONE_NUMBER` | No | OTP logged to console |
| `EMAIL_API_KEY` | No | Emails logged to console |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | No | Push notifications skipped |
| `GOOGLE_MAPS_API_KEY` | No | Geocode endpoint returns error |
| `SENTRY_DSN` | No | No error tracking |
| `JWT_SECRET` | No | Weak default in dev |

---

## 4. Supabase Setup

Supabase provides the PostgreSQL database, REST API, and Management API.

### Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up / log in
2. Click **New Project**
3. Choose an organization, name your project (e.g. `delivio`), set a strong database password, and pick a region close to your users
4. Wait for the project to finish provisioning (~2 minutes)

### Step 2: Get Your Credentials

From your Supabase dashboard:

1. Go to **Settings > API**
2. Copy the **Project URL** → paste as `SUPABASE_URL`
   - Example: `https://abcdefghijkl.supabase.co`
3. Copy the **service_role key** (under "Project API keys", the `service_role` one — NOT `anon`)
   - Paste as `SUPABASE_SERVICE_KEY`
   - This key has full access — never expose it on the frontend

### Step 3: Get the Management API Access Token

The Management API is used for running migrations (raw SQL).

1. Go to [https://supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
2. Click **Generate new token**
3. Name it (e.g. `delivio-migrations`) and copy the token
4. Paste as `SUPABASE_ACCESS_TOKEN`

### Step 4: Create Required Base Tables

Before running migrations, you need to create the core tables that the app expects. Go to **SQL Editor** in your Supabase dashboard and run:

```sql
-- Core tables the app expects to exist
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'vendor', 'rider')),
  project_ref TEXT NOT NULL,
  totp_enabled BOOLEAN DEFAULT false,
  totp_secret TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  name TEXT,
  email TEXT,
  project_ref TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(phone, project_ref)
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_ref TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id),
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  payment_intent_id TEXT,
  total_cents INTEGER NOT NULL,
  refund_amount_cents INTEGER DEFAULT 0,
  scheduled_for TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cart_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_ref TEXT,
  customer_id UUID REFERENCES customers(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES cart_sessions(id) ON DELETE CASCADE,
  product_id UUID,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  rider_id UUID REFERENCES app_users(id),
  status TEXT NOT NULL DEFAULT 'assigned',
  zone_id UUID,
  eta_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_ref TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  category_id UUID,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_ref TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_ref TEXT UNIQUE NOT NULL,
  store_name TEXT,
  currency TEXT DEFAULT 'GBP',
  timezone TEXT DEFAULT 'UTC',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS block_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_ref TEXT NOT NULL,
  block_id TEXT NOT NULL,
  content JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_ref, block_id)
);
```

### Your `.env` should now have:

```env
SUPABASE_URL=https://abcdefghijkl.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 5. Database Migrations

Migrations add additional tables, columns, and indexes on top of the base schema:

```bash
cd server
npm run migrate
```

This runs all 8 migration files in order:
1. `001_customer_addresses` — Customer address management
2. `002_refund_columns` — Refund tracking columns on orders
3. `003_rider_locations` — GPS tracking audit table
4. `004_push_tokens` — Device push notification tokens
5. `005_conversations_messages` — Chat system tables
6. `006_scheduled_orders` — Scheduled order support
7. `007_audit_log` — Audit trail table
8. `008_indexes` — Performance indexes

Applied migrations are tracked in `schema_migrations` — running again is safe (idempotent).

---

## 6. Redis Setup

Redis is used for session storage, rider location caching, and OTP tokens.

### Option A: Docker (Recommended)

```bash
docker run -d \
  --name delivio-redis \
  --restart unless-stopped \
  -p 6379:6379 \
  redis:7-alpine \
  redis-server --appendonly yes
```

Then set in `.env`:

```env
REDIS_URL=redis://localhost:6379
```

### Option B: Install Locally

- **macOS**: `brew install redis && brew services start redis`
- **Ubuntu**: `sudo apt install redis-server && sudo systemctl start redis`
- **Windows**: Use WSL2 or Docker

### Option C: Skip (Development Only)

If `REDIS_URL` is not set, the server uses an in-memory store. This works for solo development but:
- Sessions are lost on restart
- Does not work with multiple server processes
- **Not suitable for production**

---

## 7. Stripe Setup

Stripe handles payment processing (PaymentIntents, refunds, webhooks).

### Step 1: Create a Stripe Account

1. Go to [https://dashboard.stripe.com](https://dashboard.stripe.com) and sign up
2. Stay in **Test Mode** (toggle at top-right)

### Step 2: Get API Keys

1. Go to **Developers > API keys**
2. Copy the **Secret key** (`sk_test_...`) → paste as `STRIPE_SECRET_KEY`

### Step 3: Set Up Webhook (for local development)

Install the Stripe CLI:

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Or download from https://stripe.com/docs/stripe-cli
```

Forward webhooks to your local server:

```bash
stripe login
stripe listen --forward-to localhost:8080/api/webhooks/stripe
```

The CLI will print a webhook signing secret (`whsec_...`). Copy it to `.env`:

```env
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 4: Production Webhook

In the Stripe dashboard:
1. Go to **Developers > Webhooks**
2. Click **Add endpoint**
3. URL: `https://your-backend.railway.app/api/webhooks/stripe`
4. Events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Copy the signing secret → set as `STRIPE_WEBHOOK_SECRET` in production

---

## 8. Twilio SMS Setup

Twilio sends OTP codes for customer phone authentication.

### Step 1: Create a Twilio Account

1. Go to [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio) and sign up
2. Verify your phone number

### Step 2: Get Credentials

From the Twilio Console:

1. Copy **Account SID** → `TWILIO_ACCOUNT_SID`
2. Copy **Auth Token** → `TWILIO_AUTH_TOKEN`

### Step 3: Get a Phone Number

1. Go to **Phone Numbers > Manage > Buy a number**
2. Buy a number with SMS capability
3. Copy the number (E.164 format, e.g. `+15551234567`) → `TWILIO_PHONE_NUMBER`

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+15551234567
```

### Development Without Twilio

If Twilio credentials are not set, OTP codes are printed to the server console:

```
[sms] Would send to +447700900000: Your Delivio code is 847291
```

Use the code from the console to verify.

---

## 9. Email Provider Setup

Used for password reset emails, refund confirmations, and order cancellation notices.

### Using Resend (Default)

1. Go to [https://resend.com](https://resend.com) and sign up
2. Go to **API Keys** and create one
3. Verify your domain under **Domains** (or use the sandbox for testing)

```env
EMAIL_PROVIDER=resend
EMAIL_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
```

### Using SendGrid

```env
EMAIL_PROVIDER=sendgrid
EMAIL_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
```

### Development Without Email

If `EMAIL_API_KEY` is not set, emails are printed to the server console with full subject, recipients, and HTML body.

---

## 10. Firebase Push Notifications

Firebase Cloud Messaging (FCM) sends push notifications to mobile and web clients.

### Step 1: Create a Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project**, follow the wizard
3. Enable **Cloud Messaging** under Project Settings > Cloud Messaging

### Step 2: Generate Service Account Key

1. Go to **Project Settings > Service accounts**
2. Click **Generate new private key**
3. Download the JSON file

### Step 3: Add to Environment

Paste the entire JSON as a single line:

```env
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"delivio-xxxxx","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxxxx@delivio-xxxxx.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token"}
```

### Without Firebase

If not set, push notifications are silently skipped. All other features work normally.

---

## 11. Google Maps API

Used by the geocoding proxy endpoint (`GET /api/geocode`).

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Create a project (or select existing)
3. Enable the **Geocoding API**
4. Go to **Credentials > Create credentials > API key**
5. Restrict the key to Geocoding API only (recommended)

```env
GOOGLE_MAPS_API_KEY=AIzaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 12. Sentry Error Tracking

Optional but recommended for production.

1. Go to [https://sentry.io](https://sentry.io) and create a project (Node.js)
2. Copy the DSN from the setup page

```env
SENTRY_DSN=https://xxxx@oxxxxxxx.ingest.sentry.io/xxxxx
```

---

## 13. Start the Server

### Generate Secrets

Generate strong random strings for `SESSION_SECRET` and `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Run this twice and paste the outputs into your `.env`:

```env
SESSION_SECRET=<first-random-string>
JWT_SECRET=<second-random-string>
```

### Start in Development Mode

```bash
cd server
npm run dev
```

You should see:

```
[info] Delivio backend listening on port 8080
[info] WebSocket server attached
[info] Background jobs initialized
```

### Verify it Works

```bash
curl http://localhost:8080/api/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2026-03-17T22:30:00.000Z",
  "version": "1.0.0",
  "env": "development"
}
```

---

## 14. Testing with Postman

A complete Postman collection is included at:

```
server/postman/Delivio-Backend.postman_collection.json
```

### Import into Postman

1. Open Postman
2. Click **Import** (top-left)
3. Drag the JSON file or browse to it
4. The collection appears with all 40+ requests organized by feature

### Configure Variables

After importing, click on the collection name > **Variables** tab:

| Variable | Set to |
|----------|--------|
| `baseUrl` | `http://localhost:8080` |
| `projectRef` | Your Supabase project ref (the subdomain from your SUPABASE_URL, e.g. `abcdefghijkl`) |
| `adminEmail` | An email you'll use to sign up |
| `adminPassword` | A strong password (min 8 chars) |
| `customerPhone` | A phone number in E.164 format (e.g. `+447700900000`) |

### Recommended Test Flow

1. **Public > Health Check** — verify the server is running
2. **Auth > Admin Signup** — create your first admin user
3. **Auth > Admin Login** — authenticate (cookies auto-save in Postman)
4. **Auth > Admin Session** — verify you're logged in
5. **Cart > Add Item** — add items to a cart
6. **Cart > Get Cart** — see items and total
7. **Orders > Create Order** — create an order manually
8. **Orders > List Orders** — see all orders
9. **Orders > Update Order Status** — move through the workflow
10. **Auth > OTP Send** — test customer authentication (check server console for OTP)
11. **Auth > OTP Verify** — enter the OTP to create a customer session
12. **Chat > Create Conversation** — start a chat on an order
13. **Chat > Send Message** — send a message
14. **Chat > Get Messages** — retrieve message history

### Cookies

Postman automatically stores cookies from responses. After "Admin Login", the `admin_session` cookie is used for all subsequent admin requests. Similarly, "OTP Verify" sets the `customer_session` cookie.

---

## 15. Running Automated Tests

```bash
cd server

# Run all 76 tests
npm test

# Watch mode (re-runs on file change)
npm run test:watch

# With coverage report
npm run test:coverage
```

Tests mock all external services (Supabase, Stripe, Twilio, Firebase) — no credentials needed.

---

## 16. WebSocket Testing

The server exposes a WebSocket at `ws://localhost:8080`. Connect with authentication:

### Using wscat

```bash
npm install -g wscat

# Connect with cookie-based auth (after logging in via HTTP)
wscat -c "ws://localhost:8080" --header "Cookie: admin_session=YOUR_SESSION_ID"

# Or connect with JWT
wscat -c "ws://localhost:8080?token=YOUR_JWT_TOKEN&projectRef=YOUR_PROJECT_REF"
```

### WebSocket Events

The server broadcasts these events:

| Event | Payload | When |
|-------|---------|------|
| `order:status_changed` | `{ orderId, status, updatedAt }` | Order status updates |
| `delivery:location_update` | `{ deliveryId, lat, lon, heading, speed }` | Rider GPS updates |
| `chat:message` | `{ conversationId, message }` | New chat message |
| `chat:read` | `{ conversationId, userId }` | Messages marked as read |

---

## 17. Production Deployment

### Using Docker

```bash
# Build the image
docker build -t delivio-backend .

# Run with environment variables
docker run -d \
  --name delivio \
  -p 8080:8080 \
  --env-file .env \
  delivio-backend
```

### Using Docker Compose

```bash
# Start app + Redis
docker compose up -d

# View logs
docker compose logs -f app
```

### Deploy to Railway

1. Push your code to GitHub
2. Go to [https://railway.app](https://railway.app), create a new project from GitHub
3. Add all environment variables in the Railway dashboard
4. Railway uses the included `railway.toml` for configuration
5. The health check at `/api/health` is used for readiness probes

### Deploy to Vercel / Other

The backend is a standard Express.js app. Any Node.js hosting platform works:

1. Set `NODE_ENV=production`
2. Set all required environment variables
3. Start command: `node server/index.js`
4. Health check: `GET /api/health`

### Production Checklist

- [ ] `NODE_ENV=production`
- [ ] Strong `SESSION_SECRET` (64+ random chars)
- [ ] Strong `JWT_SECRET` (64+ random chars)
- [ ] `ALLOWED_ORIGINS` set to your actual frontend domains
- [ ] `REDIS_URL` pointing to a managed Redis instance
- [ ] `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` set
- [ ] `STRIPE_SECRET_KEY` using live key (`sk_live_...`)
- [ ] `STRIPE_WEBHOOK_SECRET` from the production webhook endpoint
- [ ] Twilio with a production phone number
- [ ] Email provider with a verified domain
- [ ] `SENTRY_DSN` configured for error monitoring
- [ ] HTTPS enabled (handled by Railway / reverse proxy)

---

## 18. Troubleshooting

### "Missing required environment variable"

The server logs which variable is missing. Check your `.env` file and ensure it's being loaded (the file must be at the project root, not inside `/server`).

### "CORS error" in the browser

Add your frontend URL to `ALLOWED_ORIGINS` in `.env`:

```env
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,https://app.delivio.com
```

### "connect ECONNREFUSED 127.0.0.1:6379"

Redis isn't running. Either start Redis or remove `REDIS_URL` from `.env` to use the in-memory fallback.

### OTP not arriving via SMS

1. Check the server console — in dev mode, the OTP is printed there
2. Verify all three Twilio variables are set (`ACCOUNT_SID`, `AUTH_TOKEN`, `PHONE_NUMBER`)
3. In Twilio trial mode, you can only send to verified phone numbers

### Stripe webhook returning 400

1. Ensure `STRIPE_WEBHOOK_SECRET` matches the secret from `stripe listen` (local) or the dashboard (production)
2. The webhook endpoint **must** receive the raw request body — this is already configured in the routes

### Migrations failing

1. Ensure `SUPABASE_ACCESS_TOKEN` is set (this is different from the service key)
2. Verify the token has access to your project at [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
3. Check that `SUPABASE_URL` is correct — the project ref is extracted from it

### Tests failing

Tests don't need real credentials — they mock everything. If tests fail:

```bash
cd server
npm test -- --verbose 2>&1 | head -100
```

Check for syntax errors or missing dependencies (`npm install`).

---

## Architecture Quick Reference

```
server/
├── config/          # Centralised configuration (CORS, Helmet, env vars)
├── controllers/     # Request handlers (business logic)
├── jobs/            # Background cron jobs
├── lib/             # Core libraries (Supabase client, Redis, Logger, Audit)
├── middleware/       # Express middleware (auth, rate-limit, validation, errors)
├── migrations/      # SQL migration files + runner
├── models/          # Data access layer (Supabase REST API)
├── routes/          # Express route definitions
├── services/        # External service integrations (SMS, Email, Stripe, Push)
├── tests/           # Jest test suites
├── validators/      # Zod request validation schemas
├── websocket/       # WebSocket server for real-time events
├── app.js           # Express app setup (middleware, routes)
├── index.js         # Server entry point (HTTP + WS + jobs)
└── postman/         # Postman API collection
```
