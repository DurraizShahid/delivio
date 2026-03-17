# Delivio Production Gameplan: Current State to 100%

## Context

Delivio is a multi-tenant delivery/commerce platform builder at ~70-75% completion. The visual builder systems (website, app, dashboard, template editor) are mature (85-98%), but critical production features are missing: customer authentication, real-time communication, payment processing, messaging, and operational infrastructure. This gameplan covers everything needed to reach production readiness.

## Current State Summary

| Area | Completion | Notes |
|------|-----------|-------|
| Template/DB system | ~98% | Visual editor, SQL builders, migration, all tested |
| Website builder | ~95% | 49 blocks, multi-page, data binding, variants |
| App builder | ~90% | 42 blocks, 3 variants, Capacitor ready |
| Dashboard builder | ~85% | Rider + Vendor defaults, sidebar, viewer |
| Backend API | ~90% | 30+ endpoints, OAuth, orders, cart, workspace |
| Admin auth | ~80% | Login, sessions, role bindings, signup |
| Order system | ~70% | CRUD works, dummy payment, no transactions |
| Customer auth | ~0% | Guest checkout only, no accounts |
| Messaging | 0% | Nothing exists |
| Real-time | 0% | Only 30s polling in one component |
| Push notifications | 0% | Nothing exists |
| Testing | ~15% | 3 files, 44 tests |
| DevOps | ~30% | vercel.json + railway.toml only |

## Phase Dependency Graph

```
Phase 1: Infrastructure ----+
    |                        |
    +-> Phase 2: Customer Auth ---+
    |       |                     |
    +-> Phase 3: Stripe ------+  |
    |       |                  |  |
    +-> Phase 4: Real-time -+  |  |
            |                |  |  |
            +-> Phase 5: Messaging
            |                |  |
            +-> Phase 6: Order Flow Completion
                    |
                    +-> Phase 7: Push Notifications
                            |
Phase 8: Testing         (parallel from Phase 2 onward)
Phase 9: DevOps          (parallel from Phase 3 onward)
Phase 10: Security/Polish (after all phases)
```

---

## Phase 1: Infrastructure Foundation

Everything else depends on this phase.

### 1.1 Server Modularization
- [ ] Extract `server/index.js` (3000+ lines) into route modules:
  - `server/routes/auth.js` -- Login, logout, session, signup, OAuth
  - `server/routes/orders.js` -- Order CRUD, status, payment
  - `server/routes/cart.js` -- Cart CRUD
  - `server/routes/deliveries.js` -- Rider delivery endpoints
  - `server/routes/workspace.js` -- Workspace config, block content
  - `server/routes/supabase-proxy.js` -- Supabase management API proxy
  - `server/routes/public.js` -- Public read, geocoding
- [ ] Extract shared helpers to `server/lib/helpers.js` (supabaseFetch, getQueryRows, getAccessToken, redactSensitive, etc.)
- [ ] Keep `server/index.js` as composition root (imports, mounts, starts)
- [ ] Run full test suite before AND after modularization to gate against regressions (file is 3000+ lines; high regression risk)

### 1.2 Redis Session Store
- [ ] Create `server/lib/session-store.js` -- Abstract interface: `get(id)`, `set(id, data, ttl)`, `delete(id)`
- [ ] Create `server/lib/memory-session-store.js` -- Extract existing in-memory Map (fallback for dev)
- [ ] Create `server/lib/redis-session-store.js` -- Redis-backed via `ioredis`
- [ ] Auto-select: `REDIS_URL` env var present -> Redis, otherwise memory
- [ ] Migrate all `adminSessions.get/set/delete` to new store interface
- **New dep**: `ioredis`
- **New env**: `REDIS_URL` (optional)

### 1.3 WebSocket Server
- [ ] Install `ws` package
- [ ] Create `server/lib/ws-server.js`:
  - Attach to existing HTTP server
  - Auth on connection: parse `admin_session` cookie OR `customer_session` cookie OR `?token=<jwt>` query param -- all three session types must be handled explicitly (customer sessions are added in Phase 2)
  - Connection registry: `Map<projectRef, Map<connectionId, WebSocket>>`
  - Typed message protocol: `order:status_changed`, `delivery:location_update`, `chat:message`, `ping/pong`
  - Heartbeat: ping every 30s, terminate unresponsive after 10s
  - Expose `broadcast(projectRef, message)` and `sendToUser(projectRef, userId, message)`
- [ ] Create `src/hooks/use-websocket.ts`:
  - Connect to `ws(s)://<server>/ws`
  - Auto-reconnect with exponential backoff (1s -> 30s cap)
  - Returns `{ isConnected, lastMessage, sendMessage }`
- [ ] Create connection status indicator component for admin UI
- **New dep**: `ws`

### 1.4 Supabase Realtime for Public Tracking
- [ ] Create `src/lib/realtime-client.ts` -- Subscribe to orders/deliveries changes by orderId
- [ ] Update `src/pages/track-order.tsx` to use Supabase Realtime for anonymous live tracking
- Uses existing `@supabase/supabase-js` (no new dep)

### 1.5 Global Rate Limiting
- [ ] Install `express-rate-limit`
- [ ] Apply a default rate limit to all `/api/*` routes (e.g. 100 req/min per IP)
- [ ] Apply stricter limits to sensitive routes: `/api/auth/*` (20/min), `/api/payments/*` (30/min)
- [ ] Return `429` with `Retry-After` header
- **New dep**: `express-rate-limit`

### 1.6 CORS Policy
- [ ] Configure `cors` middleware with explicit `origin` allowlist (no wildcard in production)
- [ ] Set `credentials: true` so session cookies are accepted cross-origin
- [ ] Set `sameSite: 'none'`, `secure: true` on all session cookies in production
- [ ] Document allowed origins in `.env.example` as `ALLOWED_ORIGINS` (comma-separated)

---

## Phase 2: Customer Authentication (Phone OTP + Guest)

### 2.1 Twilio SMS Integration
- [ ] Install `twilio` package
- [ ] Create `server/lib/sms.js` -- Initialize from `TWILIO_ACCOUNT_SID/AUTH_TOKEN/PHONE_NUMBER`
- [ ] Replace placeholder in `server/notifications.js` with real SMS sender
- [ ] Graceful degradation: if Twilio not configured, log to console
- **New dep**: `twilio`
- **New env**: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

### 2.2 Phone OTP Endpoints
- [ ] `POST /api/auth/otp/send` -- Generate 6-digit OTP, store with 5min TTL, send via SMS. Rate: 3/phone/15min
- [ ] `POST /api/auth/otp/verify` -- Validate OTP, create/find customer, create session. Max 3 attempts
- [ ] `GET /api/auth/customer/session` -- Check customer session, return profile
- [ ] `POST /api/auth/customer/logout` -- Clear customer session
- [ ] Customer session stored in same session store (Redis/memory) with `customer_session` cookie
- [ ] OTP tokens must use the same session store abstraction (Phase 1.2) -- if Redis is not configured, the memory store is the fallback; do NOT use a separate in-memory map or OTP will silently break on multi-process deployments

### 2.3 Customer Auth Frontend
- [ ] Create `src/pages/customer-login.tsx` -- Phone input -> OTP input -> optional name/email form
- [ ] Create `src/hooks/use-customer-session.ts` -- Auth state, profile, logout
- [ ] Create `src/components/customer-auth-gate.tsx` -- Protects customer-only routes
- [ ] Add routes in `src/App.tsx`: `/login`, `/account`, `/account/orders`
- [ ] Add keys to `src/lib/storage-keys.ts`

### 2.4 Customer Account Pages
- [ ] Create `src/pages/customer-account.tsx` -- Profile view/edit (name, email, phone, addresses)
- [ ] Create `src/pages/customer-orders.tsx` -- Order history filtered by customer_id
- [ ] Create `src/pages/customer-addresses.tsx` -- Saved delivery addresses (CRUD)
- [ ] Database: `customer_addresses` table (customer_id, label, address_line1, city, etc.)

### 2.5 Guest Checkout Enhancement
- [ ] Detect authenticated customer in checkout -> pre-fill info from profile
- [ ] Guest checkout still available (current behavior)
- [ ] After guest order: "Create account with your phone number" prompt on confirmation page
- Files: `src/components/website-blocks/checkout-section-block.tsx`, `src/pages/order-confirmation.tsx`, `src/contexts/cart-context.tsx`

### 2.6 Password Reset (Admin Users)
- [ ] `POST /api/auth/forgot-password` -- Generate reset token, send email with link
- [ ] `POST /api/auth/reset-password` -- Validate token, update password_hash
- [ ] Create `src/pages/forgot-password.tsx`, `src/pages/reset-password.tsx`
- [ ] Add "Forgot password?" link to `src/pages/admin-login.tsx`
- [ ] Add reset email template to `server/notifications.js`

### 2.7 Transactional Email Provider
- [ ] Choose and install an email provider SDK (Resend, SendGrid, or Postmark recommended)
- [ ] Create `server/lib/email.js` -- `sendEmail({ to, subject, html, text })` with provider abstraction
- [ ] Graceful degradation: if `EMAIL_API_KEY` not set, log email content to console (dev fallback)
- [ ] Wire to all email send points: password reset (2.6), refund confirmation (3.3), order cancellation (6.3)
- **New dep**: email provider SDK (e.g. `resend`, `@sendgrid/mail`, or `postmark`)
- **New env**: `EMAIL_API_KEY`, `EMAIL_FROM_ADDRESS`

---

## Phase 3: Payment System (Stripe)

### 3.1 Stripe Backend
- [ ] Install `stripe` package
- [ ] Create `server/lib/stripe.js`:
  - `createPaymentIntent(amountCents, currency, metadata)` -> `{ clientSecret, paymentIntentId }`
  - `createRefund(paymentIntentId, amountCents?)` -- Full or partial
  - `getPaymentIntent(paymentIntentId)` -- Status check
- [ ] New endpoints:
  - `POST /api/payments/create-intent` -- Create Stripe PaymentIntent
  - `POST /api/webhooks/stripe` -- Handle `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
- [ ] Keep dummy processor as fallback when `STRIPE_SECRET_KEY` not set
- [ ] Raw body parsing for webhook signature verification
- **New dep**: `stripe`
- **New env**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLISHABLE_KEY`

### 3.2 Stripe Frontend
- [ ] Install `@stripe/stripe-js`, `@stripe/react-stripe-js`
- [ ] Create `src/lib/stripe-client.ts` -- Singleton Stripe instance
- [ ] Create `src/components/stripe-checkout.tsx` -- Stripe Elements (PaymentElement), shadcn/ui styled
- [ ] Update checkout blocks: show Stripe Elements when key configured, else cash-on-delivery
- [ ] Payment flow: **webhook-confirmed order creation only** -- create intent -> collect payment -> wait for `payment_intent.succeeded` webhook -> create order. Do NOT create the order optimistically on the frontend; this prevents duplicate orders on network failures or double-submits.
- **New deps**: `@stripe/stripe-js`, `@stripe/react-stripe-js`

### 3.3 Refund System
- [ ] `POST /api/orders/:orderId/refund` -- `{ amountCents?, reason? }` -> Stripe refund + DB update
- [ ] Add `payment_status = 'refunded' | 'partially_refunded'` support
- [ ] Add "Refund" button to `src/pages/order-detail.tsx` (when payment_status = 'paid')
- [ ] Refund confirmation email template
- [ ] Add `refund_amount_cents`, `refund_reason` columns to orders

---

## Phase 4: Real-time Order System + Live Tracking

### 4.1 Real-time Order Status
- [ ] After `PATCH /api/orders/:orderId/status` succeeds, broadcast:
  `{ type: "order:status_changed", orderId, status, previousStatus, updatedAt }`
- [ ] After `POST /api/deliveries/:deliveryId/status` succeeds, broadcast delivery update
- [ ] Create `src/hooks/use-order-realtime.ts` -- Subscribe to WebSocket, merge with fetched data
- [ ] Update `src/pages/orders.tsx` -- Live status badge updates
- [ ] Update `src/pages/order-detail.tsx` -- Live status timeline
- [ ] Update `src/pages/track-order.tsx` -- Supabase Realtime for anonymous, WebSocket for authenticated
- [ ] Vendor/Rider dashboard blocks -- Live incoming order notifications with sound

### 4.2 Live Rider GPS Tracking
- [ ] `POST /api/deliveries/:deliveryId/location` -- `{ lat, lon, heading?, speed? }` -> cache in Redis/memory + broadcast
- [ ] `GET /api/deliveries/:deliveryId/location` -- Return latest cached position (initial load)
- [ ] Rate limit: max 1 location update per 3 seconds per delivery
- [ ] Database: `rider_locations` table for audit trail (batch insert every 30s from cache)
- [ ] Create `src/hooks/use-rider-location.ts` -- Subscribe to `delivery:location_update` WebSocket messages
- [ ] Create `src/hooks/use-location-reporter.ts` -- Report GPS position every 5s (Capacitor Geolocation or browser API)
- [ ] Update `src/pages/track-order.tsx` -- Show live rider marker on map
- [ ] Update `src/components/map-view.tsx` -- Animated rider marker with smooth position transitions
- [ ] **iOS background mode**: background location requires `NSLocationAlwaysAndWhenInUseUsageDescription` in `Info.plist` and the `background-modes` capability with `location` enabled -- configure in `ios/App/App/Info.plist` and Capacitor config before TestFlight submission
- **New dep**: `@capacitor/geolocation`

---

## Phase 5: Messaging System (WebSocket Chat)

### 5.1 Chat Backend
- [ ] Database tables:
  - `conversations`: id, order_id (FK), type ('customer_vendor' | 'vendor_rider'), participant_1_id, participant_2_id, created_at, updated_at
  - `messages`: id, conversation_id (FK), sender_id, sender_role, content, read_at (nullable), created_at
- [ ] Create `server/routes/chat.js`:
  - `POST /api/chat/conversations` -- Create or get existing for order
  - `GET /api/chat/conversations` -- List for current user
  - `GET /api/chat/conversations/:id/messages` -- Paginated history (50/page)
  - `POST /api/chat/conversations/:id/messages` -- Send -> store -> broadcast via WebSocket
  - `PATCH /api/chat/conversations/:id/read` -- Mark as read
- [ ] WebSocket message types: `chat:message`, `chat:typing`, `chat:read`
- [ ] **Multi-tenant isolation**: every chat endpoint must verify that the requested conversation belongs to the caller's `projectRef` -- a user from workspace A must never be able to read or write conversations from workspace B
- [ ] **Message size limit**: enforce max 2000 characters on `content` in both the REST endpoint and WebSocket handler; return `400` if exceeded

### 5.2 Chat Frontend
- [ ] Create `src/components/chat-panel.tsx`:
  - Message list with auto-scroll
  - Text input with send button
  - Typing indicator (debounced)
  - Read receipts (blue checkmarks)
  - Unread count badge
  - shadcn/ui: Card, ScrollArea, Avatar, Input, Button
- [ ] Create `src/hooks/use-chat.ts` -- Conversation state, message history, WebSocket send/receive
- [ ] Integration points:
  - `src/pages/track-order.tsx` -- "Chat with restaurant" button -> opens chat panel
  - Vendor dashboard -- Chat list with unread badges
  - Rider delivery view -- "Chat with restaurant" for active delivery
- [ ] Create `src/components/app-blocks/app-chat-block.tsx` -- New app block for app builder
- [ ] Add `app_chat` to `src/data/app-blocks.ts` block types

---

## Phase 6: Order Flow Completion

### 6.1 Database Transactions
- [ ] Wrap `POST /api/orders` in PostgreSQL transaction (BEGIN/COMMIT/ROLLBACK)
- [ ] Create `create_order` stored procedure or use single SQL block via Management API
- [ ] Ensure partial failures roll back completely
- Files: `server/routes/orders.js`

### 6.2 Delivery Zone Validation
- [ ] On rider delivery claim, validate rider's zone matches delivery zone
- [ ] Filter `/api/rider/deliveries` by rider's zone_id
- [ ] Add zone_id to deliveries table if not present
- Files: `server/routes/deliveries.js`

### 6.3 Order Cancellation Flow
- [ ] Customer can cancel orders in `pending` or `accepted_by_vendor` status
- [ ] Vendor can cancel with reason
- [ ] `POST /api/orders/:orderId/cancel` -- `{ reason, initiator }` -> update status, auto-refund if paid
- [ ] Send cancellation email/SMS to affected parties
- [ ] WebSocket broadcast of cancellation

### 6.4 Scheduled Orders
- [ ] Add `scheduled_for` column to orders table
- [ ] Orders with `scheduled_for` start in `scheduled` status
- [ ] Server cron (every 60s): transition scheduled orders to `pending` when time arrives
- [ ] Date/time picker in checkout flow (shadcn Calendar + time select)
- [ ] Admin orders page: scheduled filter, show scheduled time
- Files: `server/routes/orders.js`, checkout blocks, `src/pages/orders.tsx`

### 6.5 Dynamic ETA
- [ ] Replace hardcoded "30-45 minutes" in `src/pages/order-confirmation.tsx`
- [ ] Calculate ETA from `delivery.eta_minutes` or default based on order type
- [ ] Update ETA when vendor accepts (estimated prep time) and rider picks up (distance-based)

### 6.6 Order History & Reorder
- [ ] Customer order history at `/account/orders` (Phase 2.4)
- [ ] "Reorder" button: copy items from previous order into cart
- [ ] Order detail view for customers (simplified version of admin view)

---

## Phase 7: Push Notifications

### 7.1 Firebase Backend
- [ ] Install `firebase-admin`
- [ ] Create `server/lib/push.js`:
  - `sendPushNotification({ token, title, body, data })`
  - `sendPushToMultiple({ tokens, title, body, data })`
- [ ] Database: `push_tokens` table (user_id, token, platform, created_at)
- [ ] `POST /api/push/register` -- Register device token
- [ ] `DELETE /api/push/register` -- Unregister token
- [ ] Wire to order events:
  - Order created -> push to vendor
  - Status changed -> push to customer
  - Delivery assigned -> push to rider
  - New chat message -> push to offline recipient
- **New dep**: `firebase-admin`
- **New env**: `FIREBASE_SERVICE_ACCOUNT_JSON`

### 7.2 Push Frontend
- [ ] Create `src/lib/push-notifications.ts` -- Permission request, FCM token, register with backend
- [ ] Create `src/hooks/use-push-notifications.ts` -- Auto-register on mount, handle foreground messages
- [ ] Service worker: `public/firebase-messaging-sw.js` for background web push
- [ ] Capacitor: `@capacitor/push-notifications` integration for native mobile
- [ ] Show toast (sonner) for foreground push notifications
- **New deps**: `firebase`, `@capacitor/push-notifications`

---

## Phase 8: Testing & Quality (Parallel from Phase 2)

### 8.1 Backend API Tests
- [ ] Install `supertest`
- [ ] `server/routes/auth.test.js` -- Login, session, OTP, logout
- [ ] `server/routes/orders.test.js` -- Order CRUD, status transitions, validation
- [ ] `server/routes/cart.test.js` -- Cart CRUD, merge behavior
- [ ] `server/routes/deliveries.test.js` -- Claim, status update, location
- [ ] `server/routes/chat.test.js` -- Message CRUD, conversation creation
- [ ] `server/routes/public.test.js` -- Public read
- [ ] Mock Supabase API with test fixtures

### 8.2 Frontend Hook Tests
- [ ] Install `@testing-library/react`
- [ ] `src/hooks/use-websocket.test.ts` -- Connection, reconnect, messages
- [ ] `src/hooks/use-customer-session.test.ts` -- Auth flow
- [ ] `src/hooks/use-chat.test.ts` -- Message state
- [ ] `src/hooks/use-order-realtime.test.ts` -- Real-time update merging
- [ ] `src/hooks/use-seed-scripts.test.ts` -- Template CRUD

### 8.3 Expand Existing Tests
- [ ] `seed-sql-builder.test.ts` -- Edge cases, vendor model, special chars
- [ ] `migration-sql-builder.test.ts` -- Column rename, constraint changes
- [ ] `public-read.test.ts` -- All block type mappings
- [ ] New: `src/lib/block-content.test.ts`
- [ ] New: `src/lib/image-storage.test.ts`
- [ ] New: `src/lib/local-storage.test.ts`

### 8.4 E2E Tests (Playwright)
- [ ] Install `@playwright/test`
- [ ] Customer flow: Browse -> Add to cart -> Checkout -> Order confirmation -> Track
- [ ] Vendor flow: Login -> Accept order -> Kitchen progress
- [ ] Rider flow: Login -> View deliveries -> Claim -> Deliver
- [ ] Admin flow: Login -> View orders -> Update status -> Refund
- [ ] Setup flow: OAuth -> Template selection -> Admin dashboard
- [ ] Create `tests/fixtures/seed.ts` -- Seed a dedicated test `projectRef` with known data before the suite runs; truncate after. E2E tests must never depend on production or shared dev data.

### 8.5 Coverage Target
- [ ] 80%+ on `src/lib/database/`
- [ ] 80%+ on `server/routes/`
- [ ] 60%+ on `src/hooks/`
- [ ] CI fails if below thresholds

### 8.6 Early Order/Cart Unit Tests (run after Phase 6, not Phase 8)
- [ ] Promote `server/routes/orders.test.js` and `server/routes/cart.test.js` to be written immediately after Phase 6 completes -- these are the highest-risk routes and should not wait until Phase 8

---

## Phase 9: DevOps (Parallel from Phase 3)

### 9.1 Docker
- [ ] Create `Dockerfile` -- Multi-stage (build frontend, copy to production Node image)
- [ ] Create `docker-compose.yml` -- App + Redis services
- [ ] Create `.dockerignore`
- [ ] Create `.env.example` -- Document every env variable from the full gameplan with description and whether it is required or optional
- [ ] Health check: `curl http://localhost:8080/api/health`

### 9.2 CI/CD (GitHub Actions)
- [ ] `.github/workflows/ci.yml`:
  - Lint & type check (`tsc --noEmit`)
  - Unit tests (`npx vitest run`) with coverage
  - Build (`npm run build`)
  - E2E tests (Playwright)
  - Coverage threshold enforcement
- [ ] `.github/workflows/deploy.yml`:
  - Deploy frontend to Vercel
  - Deploy backend to Railway
  - Smoke test `/api/health`

### 9.3 Monitoring
- [ ] Install `@sentry/node` + `@sentry/react`
- [ ] Backend: Sentry error handler before global error handler in Express
- [ ] Frontend: Sentry initialization + ErrorBoundary wrapper
- [ ] User-friendly error page with "Report Issue" button
- **New deps**: `@sentry/node`, `@sentry/react`
- **New env**: `SENTRY_DSN`, `VITE_SENTRY_DSN`

---

## Phase 10: Security & Polish

### 10.1 SQL Injection Hardening
- [ ] Audit ALL SQL in `server/routes/` for string interpolation
- [ ] Create `server/lib/sql-builder.js` -- Safe parameterized query builder
- [ ] Migrate all raw SQL to parameterized queries ($1, $2, etc.)
- [ ] Use Supabase Management API `parameters` array consistently

### 10.2 Two-Factor Authentication (Admin)
- [ ] Install `otplib`, `qrcode`
- [ ] `POST /api/auth/2fa/setup` -- Generate TOTP secret, return QR code
- [ ] `POST /api/auth/2fa/verify` -- Enable 2FA
- [ ] `POST /api/auth/2fa/login` -- Verify TOTP after password
- [ ] Add `totp_secret`, `totp_enabled` to app_users
- [ ] 2FA setup UI in admin settings

### 10.3 Audit Logging
- [ ] `audit_log` table (user_id, action, resource_type, resource_id, details jsonb, ip, created_at)
- [ ] Create `server/lib/audit.js` -- Log order status changes, payments, logins, user changes
- [ ] Admin UI: audit log viewer at `/admin/audit-log`

### 10.4 Content Security Policy
- [ ] Add CSP header in Helmet (script-src, connect-src for Stripe/Supabase/WebSocket)
- [ ] Add Permissions-Policy header
- [ ] Update `vercel.json` headers

### 10.5 Performance
- [ ] Image optimization with `sharp` (WebP conversion) -- **deployment risk**: `sharp` uses native binaries that frequently break in Docker multi-stage builds and on Railway's build environment; test the Docker build with `sharp` included early and pin the exact `sharp` version
- [ ] Bundle analysis (`vite-bundle-visualizer`) and optimization
- [ ] Database indexes on hot query columns (order_id in deliveries, session_id in cart_items)
- [ ] Cart session auto-cleanup (expire old sessions)

### 10.6 Database Migration Strategy
- [ ] Document how new tables and columns added across Phases 2–7 are applied to production (`customer_addresses`, `refund_amount_cents`, `rider_locations`, `push_tokens`, `audit_log`, `conversations`, `messages`, `scheduled_for`, etc.)
- [ ] Integrate with the existing template/DB migration system (already at ~98%) or create a separate `server/migrations/` directory with numbered SQL files
- [ ] Add a migration step to the CI/CD deploy workflow (run pending migrations before server start)

---

## New Dependencies Summary

| Package | Phase | Type | Purpose |
|---------|-------|------|---------|
| `ioredis` | 1 | Runtime | Redis session store |
| `ws` | 1 | Runtime | WebSocket server |
| `twilio` | 2 | Runtime | SMS OTP |
| `stripe` | 3 | Runtime | Payment processing |
| `@stripe/stripe-js` | 3 | Runtime | Stripe frontend |
| `@stripe/react-stripe-js` | 3 | Runtime | Stripe React Elements |
| `@capacitor/geolocation` | 4 | Runtime | Mobile GPS tracking |
| `firebase-admin` | 7 | Runtime | Push notifications (server) |
| `firebase` | 7 | Runtime | Push notifications (client) |
| `@capacitor/push-notifications` | 7 | Runtime | Mobile push |
| `supertest` | 8 | Dev | API testing |
| `@testing-library/react` | 8 | Dev | Component testing |
| `@playwright/test` | 8 | Dev | E2E testing |
| `@sentry/node` | 9 | Runtime | Error tracking (backend) |
| `@sentry/react` | 9 | Runtime | Error tracking (frontend) |
| `otplib` | 10 | Runtime | TOTP 2FA |
| `qrcode` | 10 | Runtime | 2FA QR code generation |
| `express-rate-limit` | 1 | Runtime | Global API rate limiting |
| email provider SDK | 2 | Runtime | Transactional email (Resend/SendGrid/Postmark) |

## New Environment Variables

| Variable | Phase | Required | Purpose |
|----------|-------|----------|---------|
| `REDIS_URL` | 1 | No | Redis session store (fallback: memory) |
| `TWILIO_ACCOUNT_SID` | 2 | No | Twilio SMS (fallback: console log) |
| `TWILIO_AUTH_TOKEN` | 2 | No | Twilio auth |
| `TWILIO_PHONE_NUMBER` | 2 | No | SMS sender number |
| `STRIPE_SECRET_KEY` | 3 | No | Stripe payments (fallback: dummy) |
| `STRIPE_WEBHOOK_SECRET` | 3 | No | Stripe webhook verification |
| `VITE_STRIPE_PUBLISHABLE_KEY` | 3 | No | Stripe frontend key |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | 7 | No | Firebase push notifications |
| `SENTRY_DSN` | 9 | No | Backend error tracking |
| `VITE_SENTRY_DSN` | 9 | No | Frontend error tracking |
| `ALLOWED_ORIGINS` | 1 | Yes (prod) | CORS origin allowlist (comma-separated) |
| `EMAIL_API_KEY` | 2 | No | Transactional email (fallback: console log) |
| `EMAIL_FROM_ADDRESS` | 2 | No | Sender address for transactional email |

## Verification Plan

After each phase, verify by:

1. **Phase 1**: `npm run build` passes, WebSocket connects in browser dev tools (admin, customer, and unauthenticated sessions all handled), Redis session persists across server restart, rate limiter returns `429` when threshold is exceeded, CORS preflight passes from allowed origin and is rejected from unknown origin
2. **Phase 2**: Customer can sign up via phone OTP, login, view profile, see order history; OTP correctly uses session store (not a separate map); password reset email is delivered via configured email provider
3. **Phase 3**: Stripe test card `4242424242424242` completes payment, `payment_intent.succeeded` webhook fires and creates order (not the frontend), refund works; submitting the checkout form twice does not create duplicate orders
4. **Phase 4**: Open two browser tabs -- status change in admin reflects immediately in tracking page; rider location moves on map; background location updates continue on iOS with app minimised
5. **Phase 5**: Send message from customer tracking page, receive in vendor dashboard, see typing indicator; attempt to read a conversation from a different workspace returns `403`; message over 2000 chars returns `400`
6. **Phase 6**: Create order with scheduled time, it transitions to pending at scheduled time; cancel order triggers refund; `server/routes/orders.test.js` and `cart.test.js` pass
7. **Phase 7**: Receive push notification on mobile when order status changes
8. **Phase 8**: `npx vitest run` shows 80%+ coverage on target directories; Playwright E2E passes with seeded test data that is cleaned up after the suite
9. **Phase 9**: `docker compose up` starts working stack (including `sharp` native binaries); GitHub Actions CI passes on PR; `.env.example` documents all variables
10. **Phase 10**: No SQL injection via manual pen-test; 2FA login works; audit log shows all actions; all Phase 2–7 schema changes have corresponding migration files applied by CI/CD deploy step

Run `npm run build` and `npx vitest run` after every phase to catch regressions.
