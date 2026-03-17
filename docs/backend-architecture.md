# Delivio — Backend Architecture

> Complete reference for the Node.js/Express backend: module structure, API surface, data models, service integrations, real-time layer, and infrastructure.

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Server Structure](#server-structure)
3. [Application Layers](#application-layers)
4. [API Reference](#api-reference)
5. [Database Schema](#database-schema)
6. [Authentication & Sessions](#authentication--sessions)
7. [WebSocket Server](#websocket-server)
8. [Payment System (Stripe)](#payment-system-stripe)
9. [Messaging System (Chat)](#messaging-system-chat)
10. [Push Notifications (Firebase)](#push-notifications-firebase)
11. [SMS & Email](#sms--email)
12. [Rate Limiting & Security](#rate-limiting--security)
13. [Background Jobs](#background-jobs)
14. [External Service Integrations](#external-service-integrations)
15. [Infrastructure & DevOps](#infrastructure--devops)
16. [Environment Variables](#environment-variables)
17. [Testing Strategy](#testing-strategy)
18. [Feature Completion Roadmap](#feature-completion-roadmap)

---

## Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Runtime | Node.js 20 LTS | |
| Framework | Express.js | Modular route structure |
| Language | JavaScript (CommonJS) | Server-side |
| Database | Supabase (PostgreSQL) | Management API for DDL, REST for DML |
| Session Store | Redis (ioredis) / in-memory | Auto-selected via `REDIS_URL` |
| WebSocket | `ws` package | Attached to HTTP server |
| Payments | Stripe | `stripe` SDK |
| SMS | Twilio | OTP delivery |
| Email | Resend / SendGrid / Postmark | Transactional email |
| Push | Firebase Admin SDK | FCM push notifications |
| Caching | Redis (same instance) | Rider location, OTP tokens |
| Process Manager | Railway (production) | Horizontal scaling via `railway.toml` |
| Containerisation | Docker (multi-stage) | Phase 9 |
| Error Tracking | Sentry Node (`@sentry/node`) | Phase 9 |
| Monitoring | GitHub Actions + smoke tests | Phase 9 |
| Security | Helmet, express-rate-limit | Phase 1 + 10 |

---

## Server Structure

### After Phase 1 Modularisation (target state)

```
server/
├── index.js                    # Composition root — imports, mounts routes, starts HTTP server
│
├── routes/
│   ├── auth.js                 # Login, logout, session, signup, OAuth, OTP, 2FA
│   ├── orders.js               # Order CRUD, status transitions, cancellation, scheduled
│   ├── cart.js                 # Cart CRUD, session merge
│   ├── deliveries.js           # Rider delivery endpoints, location, zone validation
│   ├── workspace.js            # Workspace config, block content, template management
│   ├── supabase-proxy.js       # Supabase Management API proxy
│   ├── public.js               # Public read, geocoding, anonymous tracking
│   ├── payments.js             # Stripe PaymentIntent, webhook handler
│   ├── chat.js                 # Conversations, messages, read receipts  [Phase 5]
│   └── push.js                 # FCM device token register/unregister   [Phase 7]
│
├── lib/
│   ├── helpers.js              # supabaseFetch, getQueryRows, getAccessToken, redactSensitive
│   ├── session-store.js        # Abstract store interface: get/set/delete
│   ├── memory-session-store.js # In-memory Map fallback (dev)
│   ├── redis-session-store.js  # ioredis-backed store (production)
│   ├── ws-server.js            # WebSocket server, registry, broadcast helpers
│   ├── stripe.js               # Stripe SDK wrapper                     [Phase 3]
│   ├── sms.js                  # Twilio SMS wrapper                     [Phase 2]
│   ├── email.js                # Email provider abstraction             [Phase 2]
│   ├── push.js                 # Firebase Admin push helpers            [Phase 7]
│   ├── sql-builder.js          # Safe parameterised query builder       [Phase 10]
│   └── audit.js                # Audit log writer                       [Phase 10]
│
├── notifications.js            # Notification routing (SMS/email/push dispatch)
│
└── migrations/                 # Numbered SQL migration files           [Phase 10]
    ├── 001_customer_addresses.sql
    ├── 002_refund_columns.sql
    ├── 003_rider_locations.sql
    ├── 004_push_tokens.sql
    ├── 005_conversations_messages.sql
    ├── 006_scheduled_orders.sql
    └── 007_audit_log.sql
```

### Current State (pre-modularisation)

`server/index.js` is a single 3000+ line file containing all routes and helpers. Phase 1 extracts this into the module structure above without changing behaviour (guarded by the full test suite run before and after).

---

## Application Layers

```
┌──────────────────────────────────────────────────────────┐
│                   Express HTTP Server                     │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Global Middleware Stack                │  │
│  │  cors → helmet → body-parser → rate-limit → auth   │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐  │
│  │ /api/auth    │ │ /api/orders  │ │ /api/payments    │  │
│  │ /api/cart    │ │ /api/deliver │ │ /api/chat        │  │
│  │ /api/worksp  │ │ /api/push    │ │ /api/public      │  │
│  └──────────────┘ └──────────────┘ └──────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Service / Lib Layer                    │  │
│  │  session-store  ws-server  stripe  sms  email  push │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Data Access Layer                      │  │
│  │  supabaseFetch (REST) + Management API (DDL/DML)   │  │
│  └────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────┤
│  WebSocket Server (ws)  ←→  Connection Registry          │
│  attached to same Node HTTP server                       │
└──────────────────────────────────────────────────────────┘
         │                          │
    Supabase PostgreSQL          Redis (ioredis)
    (primary data store)         (sessions, OTP, location cache)
```

---

## API Reference

### Authentication — `/api/auth`

| Method | Path | Description | Phase |
|--------|------|-------------|-------|
| `POST` | `/api/auth/login` | Admin login, sets `admin_session` cookie | existing |
| `POST` | `/api/auth/logout` | Admin logout, clears session | existing |
| `GET` | `/api/auth/session` | Check admin session | existing |
| `POST` | `/api/auth/signup` | Admin signup | existing |
| `GET` | `/api/auth/oauth/callback` | OAuth callback | existing |
| `POST` | `/api/auth/forgot-password` | Send admin password reset email | 2 |
| `POST` | `/api/auth/reset-password` | Validate token, update password | 2 |
| `POST` | `/api/auth/otp/send` | Send 6-digit OTP via SMS (rate: 3/phone/15min) | 2 |
| `POST` | `/api/auth/otp/verify` | Verify OTP, create/find customer, set session | 2 |
| `GET` | `/api/auth/customer/session` | Check customer session, return profile | 2 |
| `POST` | `/api/auth/customer/logout` | Clear customer session | 2 |
| `POST` | `/api/auth/2fa/setup` | Generate TOTP secret, return QR code | 10 |
| `POST` | `/api/auth/2fa/verify` | Enable 2FA | 10 |
| `POST` | `/api/auth/2fa/login` | Verify TOTP after password | 10 |

### Orders — `/api/orders`

| Method | Path | Description | Phase |
|--------|------|-------------|-------|
| `GET` | `/api/orders` | List orders (filtered by workspace/status) | existing |
| `POST` | `/api/orders` | Create order (webhook-confirmed only with Stripe) | existing / 3 |
| `GET` | `/api/orders/:id` | Get order detail | existing |
| `PATCH` | `/api/orders/:id/status` | Update status → broadcasts WS event | existing / 4 |
| `POST` | `/api/orders/:id/refund` | Stripe refund + DB update | 3 |
| `POST` | `/api/orders/:id/cancel` | Cancel + auto-refund if paid | 6 |

### Cart — `/api/cart`

| Method | Path | Description | Phase |
|--------|------|-------------|-------|
| `GET` | `/api/cart` | Get cart by session | existing |
| `POST` | `/api/cart` | Add item | existing |
| `PATCH` | `/api/cart/:itemId` | Update quantity | existing |
| `DELETE` | `/api/cart/:itemId` | Remove item | existing |
| `POST` | `/api/cart/merge` | Merge guest cart into customer cart on login | 2 |

### Deliveries — `/api/deliveries`

| Method | Path | Description | Phase |
|--------|------|-------------|-------|
| `GET` | `/api/rider/deliveries` | List deliveries for rider (filtered by zone) | existing / 6 |
| `POST` | `/api/deliveries/:id/claim` | Rider claims delivery | existing |
| `POST` | `/api/deliveries/:id/status` | Update delivery status → broadcasts WS | existing / 4 |
| `POST` | `/api/deliveries/:id/location` | Rider posts GPS location | 4 |
| `GET` | `/api/deliveries/:id/location` | Get latest cached rider position | 4 |

### Payments — `/api/payments`

| Method | Path | Description | Phase |
|--------|------|-------------|-------|
| `POST` | `/api/payments/create-intent` | Create Stripe PaymentIntent | 3 |
| `POST` | `/api/webhooks/stripe` | Stripe webhook handler (raw body) | 3 |

### Chat — `/api/chat`

| Method | Path | Description | Phase |
|--------|------|-------------|-------|
| `POST` | `/api/chat/conversations` | Create or get existing conversation for order | 5 |
| `GET` | `/api/chat/conversations` | List conversations for current user | 5 |
| `GET` | `/api/chat/conversations/:id/messages` | Paginated message history (50/page) | 5 |
| `POST` | `/api/chat/conversations/:id/messages` | Send message → store → WS broadcast | 5 |
| `PATCH` | `/api/chat/conversations/:id/read` | Mark conversation as read | 5 |

### Push Notifications — `/api/push`

| Method | Path | Description | Phase |
|--------|------|-------------|-------|
| `POST` | `/api/push/register` | Register device FCM token | 7 |
| `DELETE` | `/api/push/register` | Unregister token | 7 |

### Workspace — `/api/workspace`

| Method | Path | Description | Phase |
|--------|------|-------------|-------|
| `GET` | `/api/workspace/:ref` | Get workspace config | existing |
| `PATCH` | `/api/workspace/:ref` | Update workspace config | existing |
| `GET` | `/api/workspace/:ref/blocks` | Get block content | existing |
| `POST` | `/api/workspace/:ref/blocks` | Save block content | existing |

### Public — `/api/public`

| Method | Path | Description | Phase |
|--------|------|-------------|-------|
| `GET` | `/api/public/:ref/...` | Public read endpoints | existing |
| `GET` | `/api/geocode` | Geocoding proxy (Google Maps) | existing |
| `GET` | `/api/health` | Health check endpoint | existing |

---

## Database Schema

### Existing Core Tables

```sql
-- App users (admin/vendor/rider roles)
app_users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT,
  role TEXT,  -- 'admin' | 'vendor' | 'rider'
  project_ref TEXT,
  totp_secret TEXT,        -- Phase 10
  totp_enabled BOOLEAN,    -- Phase 10
  created_at TIMESTAMPTZ
)

-- Customer accounts
customers (
  id UUID PRIMARY KEY,
  phone TEXT UNIQUE,
  name TEXT,
  email TEXT,
  project_ref TEXT,
  created_at TIMESTAMPTZ
)

-- Orders
orders (
  id UUID PRIMARY KEY,
  project_ref TEXT NOT NULL,
  customer_id UUID REFERENCES customers,
  status TEXT,  -- pending | accepted_by_vendor | preparing | ready | picked_up | delivered | cancelled | scheduled
  payment_status TEXT,  -- unpaid | paid | refunded | partially_refunded
  payment_intent_id TEXT,
  total_cents INTEGER,
  refund_amount_cents INTEGER,   -- Phase 3
  refund_reason TEXT,            -- Phase 3
  scheduled_for TIMESTAMPTZ,     -- Phase 6
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Order items
order_items (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders,
  product_id UUID,
  name TEXT,
  quantity INTEGER,
  unit_price_cents INTEGER
)

-- Cart sessions
cart_sessions (
  id UUID PRIMARY KEY,
  project_ref TEXT,
  customer_id UUID REFERENCES customers,
  created_at TIMESTAMPTZ
)

-- Cart items
cart_items (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES cart_sessions,
  product_id UUID,
  name TEXT,
  quantity INTEGER,
  unit_price_cents INTEGER
)

-- Deliveries
deliveries (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders,
  rider_id UUID REFERENCES app_users,
  status TEXT,  -- assigned | picked_up | delivered
  zone_id UUID,     -- Phase 6
  eta_minutes INTEGER,
  created_at TIMESTAMPTZ
)
```

### New Tables (Phases 2–10)

```sql
-- Phase 2: Customer delivery addresses
customer_addresses (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers NOT NULL,
  label TEXT,               -- 'Home', 'Work', etc.
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  postcode TEXT,
  lat DECIMAL,
  lon DECIMAL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ
)

-- Phase 4: Rider GPS audit trail
rider_locations (
  id UUID PRIMARY KEY,
  delivery_id UUID REFERENCES deliveries NOT NULL,
  rider_id UUID REFERENCES app_users NOT NULL,
  lat DECIMAL NOT NULL,
  lon DECIMAL NOT NULL,
  heading DECIMAL,
  speed DECIMAL,
  recorded_at TIMESTAMPTZ NOT NULL
)

-- Phase 5: Chat conversations
conversations (
  id UUID PRIMARY KEY,
  project_ref TEXT NOT NULL,
  order_id UUID REFERENCES orders,
  type TEXT,  -- 'customer_vendor' | 'vendor_rider'
  participant_1_id UUID NOT NULL,
  participant_2_id UUID NOT NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Phase 5: Chat messages
messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations NOT NULL,
  sender_id UUID NOT NULL,
  sender_role TEXT,  -- 'customer' | 'vendor' | 'rider' | 'admin'
  content TEXT NOT NULL,  -- max 2000 chars enforced at API layer
  read_at TIMESTAMPTZ,    -- NULL = unread
  created_at TIMESTAMPTZ
)

-- Phase 7: Push notification tokens
push_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  user_role TEXT,          -- 'customer' | 'vendor' | 'rider' | 'admin'
  token TEXT NOT NULL,
  platform TEXT,           -- 'web' | 'ios' | 'android'
  project_ref TEXT NOT NULL,
  created_at TIMESTAMPTZ,
  UNIQUE(user_id, platform)
)

-- Phase 10: Audit log
audit_log (
  id UUID PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,         -- 'order.status_changed', 'payment.refunded', etc.
  resource_type TEXT,           -- 'order', 'user', 'delivery'
  resource_id UUID,
  details JSONB,
  ip INET,
  created_at TIMESTAMPTZ
)
```

### Recommended Indexes

```sql
-- Hot query columns
CREATE INDEX idx_orders_project_ref ON orders(project_ref);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_deliveries_order_id ON deliveries(order_id);
CREATE INDEX idx_cart_items_session_id ON cart_items(session_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_rider_locations_delivery_id ON rider_locations(delivery_id);
CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
```

---

## Authentication & Sessions

### Session Store Architecture

```
server/lib/session-store.js          ← Abstract interface
  interface SessionStore {
    get(id: string): Promise<any>
    set(id: string, data: any, ttlSeconds?: number): Promise<void>
    delete(id: string): Promise<void>
  }

server/lib/memory-session-store.js   ← Map<string, { data, expiresAt }>
server/lib/redis-session-store.js    ← ioredis with SETEX/GET/DEL

Auto-selection in server/index.js:
  REDIS_URL set → RedisSessionStore
  REDIS_URL not set → MemorySessionStore
```

### Session Types

| Cookie Name | Owner | TTL | Store Key Pattern |
|-------------|-------|-----|-------------------|
| `admin_session` | Admin / Vendor / Rider | 24h | `session:admin:<id>` |
| `customer_session` | Customer | 30d | `session:customer:<id>` |

### OTP Tokens (Phase 2)

OTP tokens are stored **in the same session store** (not a separate Map) to ensure correctness on multi-process deployments:

```
Key:   otp:<phone>
Value: { code: "123456", attempts: 0 }
TTL:   300 seconds (5 minutes)
Rate:  3 sends per phone per 15 minutes (tracked via otp:rate:<phone>)
Max:   3 verification attempts before token invalidated
```

### Password Reset Tokens (Phase 2)

```
Key:   reset:<token>          (token = crypto.randomBytes(32).toString('hex'))
Value: { userId, email }
TTL:   3600 seconds (1 hour)
```

---

## WebSocket Server

### `server/lib/ws-server.js`

```
Attached to: existing Node.js HTTP server (same port)
Endpoint: /ws

Connection Registry:
  Map<projectRef, Map<connectionId, WebSocket>>

Auth on connection (all three must be handled):
  1. admin_session cookie   → look up in session store → attach { role: 'admin', userId, projectRef }
  2. customer_session cookie → look up in session store → attach { role: 'customer', userId, projectRef }
  3. ?token=<jwt> query param → verify JWT → attach identity

Heartbeat:
  Server pings every 30s
  Unresponsive connections terminated after 10s

Typed Message Protocol:
  { type: 'order:status_changed',      orderId, status, previousStatus, updatedAt }
  { type: 'delivery:location_update',  deliveryId, lat, lon, heading?, speed? }
  { type: 'chat:message',              conversationId, message }
  { type: 'chat:typing',               conversationId, userId, isTyping }
  { type: 'chat:read',                 conversationId, userId, readAt }
  { type: 'ping' }
  { type: 'pong' }

Exported API:
  broadcast(projectRef, message)           → sends to all connections in projectRef
  sendToUser(projectRef, userId, message)  → sends to specific user's connections
```

### Broadcast Triggers

| API Event | WS Message Broadcast |
|-----------|---------------------|
| `PATCH /api/orders/:id/status` | `order:status_changed` → all connections in projectRef |
| `POST /api/deliveries/:id/status` | `order:status_changed` + `delivery:status_changed` |
| `POST /api/deliveries/:id/location` | `delivery:location_update` → customer + vendor in conversation |
| `POST /api/chat/conversations/:id/messages` | `chat:message` → both participants |

---

## Payment System (Stripe)

### `server/lib/stripe.js`

```javascript
// Initialised from STRIPE_SECRET_KEY
// If not set → dummy processor used (existing behaviour)

createPaymentIntent(amountCents, currency, metadata)
  → { clientSecret, paymentIntentId }

createRefund(paymentIntentId, amountCents?)
  → Stripe Refund object (full or partial)

getPaymentIntent(paymentIntentId)
  → Stripe PaymentIntent (for status polling)
```

### Payment Flow

```
1. Customer submits checkout
2. Frontend → POST /api/payments/create-intent → { clientSecret }
3. Frontend confirms payment via Stripe Elements (stripe.confirmPayment)
4. Stripe processes card
5. Stripe → POST /api/webhooks/stripe  (raw body, signature verified)
6. webhook handler receives 'payment_intent.succeeded'
7. Server creates order in DB (atomic transaction — Phase 6)
8. Server broadcasts order:status_changed via WebSocket
9. Frontend polls for order → shows confirmation

CRITICAL: Order creation happens ONLY in step 7.
          Frontend never creates orders directly.
          This prevents duplicates on double-submit or network errors.
```

### Webhook Handler

```javascript
// POST /api/webhooks/stripe
// Raw body parser (must NOT use express.json() for this route)
// stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)

Events handled:
  payment_intent.succeeded     → create order, notify vendor (push), broadcast WS
  payment_intent.payment_failed → notify customer, update order payment_status
  charge.refunded              → update order payment_status = 'refunded', send email
```

### Refund Endpoint

```
POST /api/orders/:orderId/refund
Body: { amountCents?: number, reason?: string }
Auth: admin or vendor

Steps:
  1. Fetch order, verify payment_status = 'paid'
  2. stripe.createRefund(paymentIntentId, amountCents)
  3. Update order: payment_status, refund_amount_cents, refund_reason
  4. Send refund confirmation email to customer
  5. Write audit log entry
```

---

## Messaging System (Chat)

### Multi-tenant Isolation (Critical)

Every chat endpoint verifies `conversation.project_ref === req.projectRef`. A user from workspace A **must never** read or write conversations from workspace B. This check is enforced at the route middleware level, not just in queries.

### Conversation Creation

```
POST /api/chat/conversations
Body: { orderId, type: 'customer_vendor' | 'vendor_rider' }

Logic:
  1. Verify caller is a participant in the order (customer, vendor, or rider)
  2. Check for existing conversation of same type for orderId
  3. If exists → return existing (idempotent)
  4. If not → INSERT into conversations, return new
```

### Message Send

```
POST /api/chat/conversations/:id/messages
Body: { content: string }  ← max 2000 chars enforced here AND in WS handler

Steps:
  1. Validate content length ≤ 2000 chars (return 400 if exceeded)
  2. Verify caller is participant in conversation (return 403 if not)
  3. INSERT into messages
  4. UPDATE conversations.updated_at
  5. broadcast via ws-server.sendToUser for each participant
  6. If recipient has no active WS connection → send push notification (Phase 7)
```

### Read Receipts

```
PATCH /api/chat/conversations/:id/read

Steps:
  1. UPDATE messages SET read_at = NOW() WHERE conversation_id = :id AND sender_id != caller
  2. broadcast { type: 'chat:read', conversationId, userId, readAt }
```

---

## Push Notifications (Firebase)

### `server/lib/push.js`

```javascript
// Initialised from FIREBASE_SERVICE_ACCOUNT_JSON
// If not set → push notifications silently skipped

sendPushNotification({ token, title, body, data })
  → firebase-admin messaging().send()

sendPushToMultiple({ tokens, title, body, data })
  → messaging().sendMulticast()
  → Handles token invalidation (remove stale tokens from push_tokens table)
```

### Notification Routing

| Trigger | Recipients | Title Example |
|---------|-----------|---------------|
| `POST /api/orders` | Vendor | "New Order #1234" |
| `PATCH /api/orders/:id/status` | Customer | "Your order is ready!" |
| `POST /api/deliveries/:id/claim` | Rider | "Delivery assigned to you" |
| `POST /api/chat/.../messages` (recipient offline) | Customer / Vendor / Rider | "New message from..." |

---

## SMS & Email

### `server/lib/sms.js`

```javascript
// Initialised from TWILIO_ACCOUNT_SID / AUTH_TOKEN / PHONE_NUMBER
// Graceful degradation: if not configured → console.log(OTP) for dev

sendSMS({ to, body })
  → twilio.messages.create({ from: TWILIO_PHONE_NUMBER, to, body })
```

### `server/lib/email.js`

```javascript
// Provider abstraction — swap Resend / SendGrid / Postmark via EMAIL_PROVIDER env
// Graceful degradation: if EMAIL_API_KEY not set → console.log(email) for dev

sendEmail({ to, subject, html, text })
```

### Email Templates (in `server/notifications.js`)

| Template | Trigger | Phase |
|----------|---------|-------|
| Password reset | `POST /api/auth/forgot-password` | 2 |
| Refund confirmation | `POST /api/orders/:id/refund` | 3 |
| Order cancellation | `POST /api/orders/:id/cancel` | 6 |

---

## Rate Limiting & Security

### Rate Limits (`express-rate-limit`)

| Route Pattern | Limit | Window |
|--------------|-------|--------|
| All `/api/*` | 100 req | 1 minute per IP |
| `/api/auth/*` | 20 req | 1 minute per IP |
| `/api/payments/*` | 30 req | 1 minute per IP |
| `/api/auth/otp/send` | 3 req per phone | 15 minutes per phone |

All over-limit responses return `429 Too Many Requests` with `Retry-After` header.

### CORS Policy

```javascript
// cors middleware
{
  origin: process.env.ALLOWED_ORIGINS.split(','),  // No wildcard in production
  credentials: true,                               // Required for cookies
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}

// Session cookies in production
{
  httpOnly: true,
  secure: true,
  sameSite: 'none'   // Required for cross-origin cookie passing
}
```

### Helmet Configuration (Phase 10)

```javascript
helmet({
  contentSecurityPolicy: {
    directives: {
      scriptSrc: ["'self'", "https://js.stripe.com"],
      connectSrc: ["'self'", "wss://", "https://*.supabase.co", "https://api.stripe.com"],
      frameSrc: ["https://js.stripe.com"]
    }
  }
})
```

### SQL Injection Hardening (Phase 10)

All SQL uses parameterised queries via `server/lib/sql-builder.js`. No string interpolation into SQL. Supabase Management API uses the `parameters` array consistently.

```javascript
// NEVER:
`SELECT * FROM orders WHERE id = '${orderId}'`

// ALWAYS:
{ sql: 'SELECT * FROM orders WHERE id = $1', parameters: [orderId] }
```

---

## Background Jobs

### Scheduled Orders Cron (Phase 6)

```
Interval: every 60 seconds
Logic:
  SELECT * FROM orders
  WHERE status = 'scheduled'
  AND scheduled_for <= NOW()

  For each result:
    UPDATE orders SET status = 'pending' WHERE id = :id
    broadcast { type: 'order:status_changed', ... }
    sendPushNotification to vendor
```

### Rider Location Batch Insert (Phase 4)

GPS positions are cached in Redis for real-time performance. A background flush writes to `rider_locations` for audit trail:

```
Interval: every 30 seconds
Logic:
  Flush Redis location cache → batch INSERT into rider_locations
  Retain last position in cache for GET /api/deliveries/:id/location
```

### Cart Session Cleanup (Phase 10)

```
Interval: daily (via cron or Railway scheduled task)
Logic:
  DELETE FROM cart_sessions WHERE created_at < NOW() - INTERVAL '30 days'
```

---

## External Service Integrations

### Supabase

| Usage | Method |
|-------|--------|
| DML (SELECT/INSERT/UPDATE/DELETE) | Supabase REST API via `supabaseFetch` helper |
| DDL (CREATE TABLE / ALTER TABLE) | Supabase Management API |
| Realtime (public tracking) | Supabase JS client on frontend only |
| Auth | **Not used** — custom session store |

### Stripe

| Feature | SDK Method |
|---------|-----------|
| Create PaymentIntent | `stripe.paymentIntents.create()` |
| Verify webhook | `stripe.webhooks.constructEvent()` |
| Create refund | `stripe.refunds.create()` |
| Get PaymentIntent | `stripe.paymentIntents.retrieve()` |

Test card for verification: `4242 4242 4242 4242`

### Redis (ioredis)

| Usage | Key Pattern | TTL |
|-------|-------------|-----|
| Admin sessions | `session:admin:<id>` | 24h |
| Customer sessions | `session:customer:<id>` | 30d |
| OTP tokens | `otp:<phone>` | 5min |
| OTP rate limit | `otp:rate:<phone>` | 15min |
| Rider location cache | `location:<deliveryId>` | 5min |
| Password reset tokens | `reset:<token>` | 1h |

---

## Infrastructure & DevOps

### Docker (Phase 9)

```dockerfile
# Dockerfile (multi-stage)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build        # Vite → dist/

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/package*.json .
RUN npm ci --only=production
EXPOSE 8080
CMD ["node", "server/index.js"]
```

**sharp warning**: `sharp` native binaries frequently break in Docker multi-stage builds. Test the full Docker build with `sharp` included early and pin the exact version.

### docker-compose.yml

```yaml
services:
  app:
    build: .
    ports: ["8080:8080"]
    env_file: .env
    depends_on: [redis]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/api/health"]

  redis:
    image: redis:7-alpine
    volumes: ["redis_data:/data"]

volumes:
  redis_data:
```

### Railway

```toml
# railway.toml
[build]
builder = "DOCKERFILE"

[deploy]
startCommand = "node server/index.js"
healthcheckPath = "/api/health"
healthcheckTimeout = 30
```

### GitHub Actions CI/CD (Phase 9)

```yaml
# .github/workflows/ci.yml
on: [pull_request]
jobs:
  test:
    steps:
      - npm install
      - tsc --noEmit
      - npx vitest run --coverage
      - npm run build
      - npx playwright test

# .github/workflows/deploy.yml
on:
  push:
    branches: [main]
jobs:
  deploy:
    steps:
      - Run DB migrations (server/migrations/)
      - Deploy frontend → Vercel
      - Deploy backend → Railway
      - Smoke test: GET /api/health → 200
```

### Sentry (Phase 9)

```javascript
// server/index.js
import * as Sentry from '@sentry/node'
Sentry.init({ dsn: process.env.SENTRY_DSN })

// Place BEFORE routes:
app.use(Sentry.Handlers.requestHandler())

// Place BEFORE global error handler:
app.use(Sentry.Handlers.errorHandler())
```

---

## Environment Variables

| Variable | Phase | Required | Purpose |
|----------|-------|----------|---------|
| `PORT` | — | No (default 8080) | HTTP server port |
| `NODE_ENV` | — | Yes | `production` \| `development` |
| `SUPABASE_URL` | — | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | — | Yes | Supabase service role key |
| `SUPABASE_ACCESS_TOKEN` | — | Yes | Management API access token |
| `SESSION_SECRET` | — | Yes | Cookie signing secret |
| `ALLOWED_ORIGINS` | 1 | Yes (prod) | CORS allowlist (comma-separated) |
| `REDIS_URL` | 1 | No | Redis (fallback: in-memory) |
| `TWILIO_ACCOUNT_SID` | 2 | No | Twilio SMS (fallback: console) |
| `TWILIO_AUTH_TOKEN` | 2 | No | Twilio auth |
| `TWILIO_PHONE_NUMBER` | 2 | No | SMS sender |
| `EMAIL_API_KEY` | 2 | No | Email provider key (fallback: console) |
| `EMAIL_FROM_ADDRESS` | 2 | No | Email sender address |
| `STRIPE_SECRET_KEY` | 3 | No | Stripe (fallback: dummy processor) |
| `STRIPE_WEBHOOK_SECRET` | 3 | No | Stripe webhook signature |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | 7 | No | Firebase push (fallback: skip) |
| `SENTRY_DSN` | 9 | No | Backend error tracking |
| `GOOGLE_MAPS_API_KEY` | — | Yes | Geocoding proxy |

---

## Testing Strategy

### Unit Tests (Vitest + Supertest)

| File | Coverage Target | Phase |
|------|----------------|-------|
| `server/routes/auth.test.js` | Login, OTP, session, logout | 2 |
| `server/routes/orders.test.js` | CRUD, status transitions, validation | 6 (early!) |
| `server/routes/cart.test.js` | CRUD, merge behaviour | 6 (early!) |
| `server/routes/deliveries.test.js` | Claim, status, location | 4 |
| `server/routes/chat.test.js` | Message CRUD, multi-tenant isolation | 5 |
| `server/routes/public.test.js` | Public read, block type mappings | 8 |

> **Note**: `orders.test.js` and `cart.test.js` are the highest-risk routes and should be written immediately after Phase 6 completes — not deferred to Phase 8.

### Coverage Thresholds

| Area | Target |
|------|--------|
| `server/routes/` | 80%+ |
| CI fails below | Enforced by coverage threshold config |

### Test Patterns

```javascript
// Mock Supabase API
import { supabaseFetch } from './lib/helpers.js'
jest.mock('./lib/helpers.js')
supabaseFetch.mockResolvedValue({ data: [...testFixtures] })

// Use supertest for HTTP assertions
const res = await request(app)
  .post('/api/auth/otp/send')
  .send({ phone: '+447700900000' })
expect(res.status).toBe(200)
```

### E2E Test Data

```typescript
// tests/fixtures/seed.ts
// Seeds a dedicated test projectRef before E2E suite
// Truncates all test data after suite completes
// E2E tests NEVER touch production or shared dev data
```

---

## Feature Completion Roadmap

| Feature | Current | Target | Phase |
|---------|---------|--------|-------|
| Server modularisation | 0% | 100% | 1 |
| Redis session store | 0% | 100% | 1 |
| WebSocket server | 0% | 100% | 1 |
| Rate limiting | 0% | 100% | 1 |
| CORS hardening | partial | 100% | 1 |
| Phone OTP auth | 0% | 100% | 2 |
| Customer sessions | 0% | 100% | 2 |
| Password reset | 0% | 100% | 2 |
| Transactional email | 0% | 100% | 2 |
| Stripe PaymentIntent | 0% | 100% | 3 |
| Stripe webhook handler | 0% | 100% | 3 |
| Refund system | 0% | 100% | 3 |
| Real-time order status WS | 0% | 100% | 4 |
| Rider GPS tracking | 0% | 100% | 4 |
| Chat backend | 0% | 100% | 5 |
| DB transactions (orders) | 0% | 100% | 6 |
| Order cancellation | 0% | 100% | 6 |
| Scheduled orders cron | 0% | 100% | 6 |
| Firebase push notifications | 0% | 100% | 7 |
| API test coverage 80%+ | ~5% | 80%+ | 8 |
| Docker + docker-compose | 0% | 100% | 9 |
| GitHub Actions CI/CD | 30% | 100% | 9 |
| Sentry integration | 0% | 100% | 9 |
| SQL injection hardening | partial | 100% | 10 |
| Admin 2FA (TOTP) | 0% | 100% | 10 |
| Audit logging | 0% | 100% | 10 |
| DB migration pipeline | 0% | 100% | 10 |
