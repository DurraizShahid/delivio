# Delivio — Frontend Architecture

> Complete reference for the React/TypeScript frontend: structure, data flow, component hierarchy, state management, and feature roadmap.

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Project Structure](#project-structure)
3. [Application Layers](#application-layers)
4. [Routing Architecture](#routing-architecture)
5. [State Management](#state-management)
6. [Component Hierarchy](#component-hierarchy)
7. [Builder Systems](#builder-systems)
8. [Hooks Catalogue](#hooks-catalogue)
9. [Real-time & WebSocket Layer](#real-time--websocket-layer)
10. [Payment Integration (Stripe)](#payment-integration-stripe)
11. [Push Notifications](#push-notifications)
12. [Mobile (Capacitor)](#mobile-capacitor)
13. [Authentication Flows](#authentication-flows)
14. [Environment Variables](#environment-variables)
15. [Testing Strategy](#testing-strategy)
16. [Build & Deployment](#build--deployment)
17. [Feature Completion Roadmap](#feature-completion-roadmap)

---

## Technology Stack

| Layer | Technology | Version Notes |
|-------|-----------|---------------|
| Framework | React 18 | Concurrent features, Suspense |
| Language | TypeScript | Strict mode |
| Build | Vite | Fast HMR, ESM output |
| Routing | React Router v6 | File-based convention |
| Styling | Tailwind CSS + shadcn/ui | Utility-first + headless components |
| State | React Context + custom hooks | No external state library |
| Data Fetching | Native `fetch` / custom hooks | REST over HTTP |
| Real-time | WebSocket (`use-websocket.ts`) | WS + Supabase Realtime |
| Forms | React Hook Form + Zod | Validation schemas |
| Notifications | Sonner | Toast notifications |
| Charts | Recharts | Dashboard analytics |
| Maps | Google Maps JS API | Order tracking, delivery zones |
| Mobile | Capacitor v5 | iOS + Android shell |
| Error Tracking | Sentry React (`@sentry/react`) | Phase 9 |
| Testing | Vitest + Testing Library + Playwright | Unit + E2E |

---

## Project Structure

```
src/
├── App.tsx                        # Root router, providers composition
├── main.tsx                       # React DOM root, Sentry init
│
├── pages/                         # Route-level page components
│   ├── admin-login.tsx
│   ├── forgot-password.tsx        # Phase 2
│   ├── reset-password.tsx         # Phase 2
│   ├── customer-login.tsx         # Phase 2 — phone OTP
│   ├── customer-account.tsx       # Phase 2
│   ├── customer-orders.tsx        # Phase 2
│   ├── customer-addresses.tsx     # Phase 2
│   ├── order-confirmation.tsx
│   ├── track-order.tsx            # Live GPS tracking
│   ├── orders.tsx                 # Admin order list
│   ├── order-detail.tsx           # Admin order detail + refund
│   └── ...
│
├── components/
│   ├── ui/                        # shadcn/ui primitives (Button, Card, Input…)
│   ├── website-blocks/            # 49 visual website builder blocks
│   ├── app-blocks/                # 42 mobile app builder blocks
│   ├── dashboard-blocks/          # Rider + Vendor dashboard blocks
│   ├── stripe-checkout.tsx        # Phase 3 — Stripe Elements
│   ├── chat-panel.tsx             # Phase 5 — messaging UI
│   ├── customer-auth-gate.tsx     # Phase 2 — route guard
│   ├── ws-status-indicator.tsx    # Phase 1 — WebSocket health badge
│   └── map-view.tsx               # Google Maps with rider marker
│
├── hooks/                         # All custom React hooks
│   ├── use-websocket.ts           # Phase 1 — core WS connection
│   ├── use-customer-session.ts    # Phase 2 — customer auth state
│   ├── use-order-realtime.ts      # Phase 4 — live order state
│   ├── use-rider-location.ts      # Phase 4 — rider GPS subscriber
│   ├── use-location-reporter.ts   # Phase 4 — GPS broadcast (rider)
│   ├── use-chat.ts                # Phase 5 — conversation state
│   ├── use-push-notifications.ts  # Phase 7 — FCM token + messages
│   └── use-seed-scripts.ts        # Template CRUD (existing)
│
├── contexts/                      # React Context providers
│   ├── cart-context.tsx           # Shopping cart
│   ├── auth-context.tsx           # Admin session
│   └── workspace-context.tsx      # Active workspace / projectRef
│
├── lib/                           # Pure utilities and SDK clients
│   ├── stripe-client.ts           # Phase 3 — singleton Stripe instance
│   ├── push-notifications.ts      # Phase 7 — FCM setup
│   ├── realtime-client.ts         # Phase 1 — Supabase Realtime
│   ├── storage-keys.ts            # localStorage/sessionStorage key constants
│   ├── database/                  # SQL builder utilities (98% complete)
│   │   ├── seed-sql-builder.ts
│   │   └── migration-sql-builder.ts
│   └── image-storage.ts           # Image upload helpers
│
└── data/
    ├── website-blocks.ts          # Block type registry
    ├── app-blocks.ts              # App block registry (+ app_chat Phase 5)
    └── dashboard-blocks.ts        # Dashboard block registry
```

---

## Application Layers

```
┌─────────────────────────────────────────────────────┐
│                    Browser / WebView                 │
├─────────────────────────────────────────────────────┤
│              React Router (Pages)                    │
│  /login  /account  /track  /admin/*  /builder/*     │
├──────────────┬──────────────────────────────────────┤
│   Contexts   │          Custom Hooks                 │
│  CartContext │  use-websocket  use-customer-session  │
│  AuthContext │  use-order-realtime  use-chat         │
│  WorkspaceCx │  use-rider-location  use-push-notif   │
├──────────────┴──────────────────────────────────────┤
│                    Components                        │
│  shadcn/ui primitives → domain components → pages   │
├──────────────────────────────┬──────────────────────┤
│         REST API Calls       │  Real-time Channels  │
│  fetch('/api/...')           │  WebSocket (ws://)   │
│  Stripe Elements SDK         │  Supabase Realtime   │
│  Firebase Messaging SDK      │  FCM Push            │
└──────────────────────────────┴──────────────────────┘
```

---

## Routing Architecture

### Route Map

```
/                               → Workspace home / builder landing
/login                          → Customer phone OTP login         [Phase 2]
/account                        → Customer profile                 [Phase 2]
/account/orders                 → Customer order history           [Phase 2]
/account/addresses              → Saved delivery addresses         [Phase 2]
/forgot-password                → Admin password reset request     [Phase 2]
/reset-password                 → Admin password reset form        [Phase 2]
/track/:orderId                 → Live order tracking (public)
/order-confirmation/:orderId    → Post-checkout confirmation

/admin/login                    → Admin login
/admin/dashboard                → Admin home
/admin/orders                   → Order list (live updates)
/admin/orders/:id               → Order detail + refund
/admin/audit-log                → Audit log viewer                 [Phase 10]
/admin/settings/2fa             → 2FA setup                        [Phase 10]

/builder/website                → Website visual builder
/builder/app                    → App visual builder
/builder/dashboard              → Dashboard builder
/builder/templates              → Template editor
```

### Route Guards

```
CustomerAuthGate          → Wraps /account/* routes
AdminAuthGate             → Wraps /admin/* routes
TwoFactorGate             → Wraps admin routes after Phase 10
```

---

## State Management

Delivio uses **React Context + custom hooks** — no Redux, Zustand, or Jotai. Each domain owns its state.

### Context Tree (composition in `App.tsx`)

```
<WorkspaceProvider>           ← projectRef, workspace config
  <AuthProvider>              ← admin session, role
    <CustomerSessionProvider> ← customer auth state  [Phase 2]
      <CartProvider>          ← cart items, totals
        <RouterOutlet />
      </CartProvider>
    </CustomerSessionProvider>
  </AuthProvider>
</WorkspaceProvider>
```

### Data Flow Pattern

```
Page Component
  └── calls useXxx() hook
        ├── reads from Context
        ├── fetches via fetch('/api/...')
        ├── subscribes to WebSocket messages
        └── returns { data, loading, error, actions }
```

### Local Persistence

All keys are constants in `src/lib/storage-keys.ts`:

| Key | Storage | Purpose |
|-----|---------|---------|
| `delivio_cart_session` | sessionStorage | Cart session ID |
| `delivio_admin_token` | cookie (httpOnly) | Admin session |
| `delivio_customer_token` | cookie (httpOnly) | Customer session |
| `delivio_workspace` | localStorage | Last active workspace |

---

## Component Hierarchy

### Page → Block → Primitive Stack

```
Page (e.g. track-order.tsx)
 ├── Layout components (Header, Footer, Sidebar)
 ├── Domain blocks (OrderStatusTimeline, RiderMap)
 │    ├── shadcn/ui primitives (Card, Badge, Avatar)
 │    └── Map components (MapView, RiderMarker)
 └── Real-time data via hooks
```

### Website Builder Block Tree (49 blocks)

```
WebsiteBuilder
 ├── HeroBlock            ├── ProductGridBlock
 ├── NavbarBlock          ├── CategoryFilterBlock
 ├── FooterBlock          ├── CartSidebarBlock
 ├── CheckoutSectionBlock ├── OrderConfirmationBlock
 └── ... (49 total)
```

### App Builder Block Tree (42 blocks)

```
AppBuilder
 ├── AppNavBlock          ├── AppProductCardBlock
 ├── AppCartBlock         ├── AppOrderListBlock
 ├── AppChatBlock [P5]    ├── AppDeliveryTrackerBlock
 └── ... (42 total)
```

### Dashboard Builder Block Tree

```
DashboardBuilder
 ├── RiderDashboardDefault (sidebar + viewer)
 ├── VendorDashboardDefault
 ├── OrderQueueBlock (live, sound alerts) [Phase 4]
 ├── ChatListBlock [Phase 5]
 └── ... dashboard blocks
```

---

## Builder Systems

### Visual Builder Architecture

All three builders (Website, App, Dashboard) share the same pattern:

```
Builder Page
 ├── Canvas (drag-and-drop, responsive preview)
 ├── Block Palette (left sidebar)
 ├── Property Panel (right sidebar — per-block config)
 ├── Page Manager (multi-page support)
 ├── Data Binding Layer (connects blocks to API/DB data)
 └── Variant Switcher (mobile/tablet/desktop)
```

### Template / DB System (98% complete)

```
src/lib/database/
 ├── seed-sql-builder.ts        — Generates INSERT SQL for template seeding
 └── migration-sql-builder.ts  — Generates ALTER/CREATE for schema changes
```

Migrations flow: **Builder UI change → SQL generated → Supabase Management API → production DB**.

---

## Hooks Catalogue

### Phase 1 Hooks

#### `use-websocket.ts`
```
Connects to ws(s)://<server>/ws
Returns: { isConnected, lastMessage, sendMessage }
Reconnect: exponential backoff 1s → 30s cap
Auth: admin_session cookie | customer_session cookie | ?token= query param
```

### Phase 2 Hooks

#### `use-customer-session.ts`
```
Returns: { customer, isLoggedIn, isLoading, login, logout, updateProfile }
Backed by: GET /api/auth/customer/session
```

### Phase 4 Hooks

#### `use-order-realtime.ts`
```
Subscribes to: WebSocket 'order:status_changed' messages
Merges with: Initial fetch data
Returns: { order, status, timeline, isLive }
```

#### `use-rider-location.ts`
```
Subscribes to: WebSocket 'delivery:location_update' messages
Returns: { lat, lon, heading, speed, lastUpdated }
```

#### `use-location-reporter.ts` (Rider app only)
```
Reports: GPS position every 5s via POST /api/deliveries/:id/location
Source: Capacitor Geolocation | browser navigator.geolocation
Background iOS: requires NSLocationAlwaysAndWhenInUseUsageDescription
```

### Phase 5 Hooks

#### `use-chat.ts`
```
Manages: conversation list, message history, unread counts
Sends: POST /api/chat/conversations/:id/messages
Receives: WebSocket 'chat:message', 'chat:typing', 'chat:read'
Returns: { conversations, messages, sendMessage, markRead, typingUsers }
```

### Phase 7 Hooks

#### `use-push-notifications.ts`
```
On mount: requests permission → gets FCM token → registers via POST /api/push/register
Foreground: shows Sonner toast for incoming push
Returns: { permission, token, isSupported }
```

---

## Real-time & WebSocket Layer

### Connection Lifecycle

```
App mounts
  └── use-websocket connects to /ws
        ├── Authenticates via cookie or ?token=
        ├── Server assigns connectionId
        └── Connection stored in registry Map<projectRef, Map<connId, WS>>

Incoming message
  └── lastMessage updated
        ├── use-order-realtime picks up 'order:status_changed'
        ├── use-rider-location picks up 'delivery:location_update'
        └── use-chat picks up 'chat:message' | 'chat:typing' | 'chat:read'

Connection lost
  └── Reconnect: 1s → 2s → 4s → 8s → 16s → 30s (capped)
```

### Message Protocol (Client-side view)

```typescript
type WsMessage =
  | { type: 'order:status_changed';   orderId: string; status: string; previousStatus: string; updatedAt: string }
  | { type: 'delivery:location_update'; deliveryId: string; lat: number; lon: number; heading?: number; speed?: number }
  | { type: 'chat:message';            conversationId: string; message: Message }
  | { type: 'chat:typing';             conversationId: string; userId: string; isTyping: boolean }
  | { type: 'chat:read';               conversationId: string; userId: string; readAt: string }
  | { type: 'ping' }
  | { type: 'pong' }
```

### Supabase Realtime (Public Tracking)

Anonymous order tracking (`/track/:orderId`) uses **Supabase Realtime** instead of WebSocket (no auth required):

```typescript
// src/lib/realtime-client.ts
supabase
  .channel(`order-${orderId}`)
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, handler)
  .subscribe()
```

---

## Payment Integration (Stripe)

### Frontend Flow (Phase 3)

```
Checkout Page
  └── <StripeCheckout />
        ├── Loads Stripe.js via loadStripe() singleton (stripe-client.ts)
        ├── Calls POST /api/payments/create-intent → receives clientSecret
        ├── Renders <Elements stripe={stripe} options={{ clientSecret }}>
        │     └── <PaymentElement /> (Stripe-hosted card UI)
        └── On submit: stripe.confirmPayment()
              ├── SUCCESS → Poll for order creation (webhook-confirmed)
              └── FAILURE → Show Stripe error message

IMPORTANT: Orders are NEVER created from the frontend.
           The server creates the order only after receiving
           the `payment_intent.succeeded` webhook from Stripe.
           This prevents duplicate orders on double-submit.
```

### Stripe Client Setup

```typescript
// src/lib/stripe-client.ts
import { loadStripe } from '@stripe/stripe-js'
let stripePromise: ReturnType<typeof loadStripe>
export const getStripe = () => {
  if (!stripePromise) stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  return stripePromise
}
```

### Graceful Degradation

When `VITE_STRIPE_PUBLISHABLE_KEY` is not set → checkout blocks display **Cash on Delivery** option only.

---

## Push Notifications

### Web (Firebase Cloud Messaging)

```
src/lib/push-notifications.ts
  └── initializeApp(firebaseConfig)
  └── getMessaging()
  └── getToken(messaging, { vapidKey }) → FCM token
  └── POST /api/push/register { token, platform: 'web' }

public/firebase-messaging-sw.js   ← Service worker for background push
```

### Mobile (Capacitor)

```
@capacitor/push-notifications
  └── PushNotifications.requestPermissions()
  └── PushNotifications.register()
  └── on('registration') → POST /api/push/register { token, platform: 'ios'|'android' }
  └── on('pushNotificationReceived') → show in-app toast
```

### Notification Events Triggered

| Event | Recipients |
|-------|-----------|
| Order created | Vendor |
| Order status changed | Customer |
| Delivery assigned | Rider |
| New chat message (recipient offline) | Customer / Vendor / Rider |

---

## Mobile (Capacitor)

### Configuration (`capacitor.config.ts`)

```
appId: com.delivio.app
appName: Delivio
webDir: dist
plugins:
  - Geolocation
  - PushNotifications
  - Camera (product images)
```

### iOS Requirements

| Requirement | Location |
|------------|----------|
| Background location | `ios/App/App/Info.plist` — `NSLocationAlwaysAndWhenInUseUsageDescription` |
| Background mode | Xcode Capabilities → Background Modes → Location updates |
| Push entitlement | Xcode Capabilities → Push Notifications |

### Build Pipeline

```
npm run build           → Vite builds dist/
npx cap sync ios        → Copies dist/ + plugins to ios/
npx cap open ios        → Opens Xcode for TestFlight / App Store
```

---

## Authentication Flows

### Admin Authentication (Existing — 80%)

```
POST /api/auth/login
  └── Sets httpOnly admin_session cookie
  └── AuthContext reads GET /api/auth/session on mount

POST /api/auth/forgot-password   [Phase 2]
  └── Sends reset email via email provider

POST /api/auth/reset-password    [Phase 2]
  └── Validates token, updates password

POST /api/auth/2fa/setup         [Phase 10]
POST /api/auth/2fa/verify        [Phase 10]
POST /api/auth/2fa/login         [Phase 10]
```

### Customer Authentication (Phase 2 — 0%)

```
src/pages/customer-login.tsx
  Step 1: Phone number input
    └── POST /api/auth/otp/send
  Step 2: 6-digit OTP input
    └── POST /api/auth/otp/verify → sets customer_session cookie
  Step 3 (optional): Name + email collection

use-customer-session.ts
  └── GET /api/auth/customer/session → { customer, isLoggedIn }

CustomerAuthGate
  └── Redirects unauthenticated users to /login
```

### Session Architecture

```
Admin   → httpOnly cookie: admin_session    → Redis/memory store
Customer → httpOnly cookie: customer_session → Redis/memory store (same store)
OTP      → TTL key in session store         → 5min TTL, max 3 attempts
```

---

## Environment Variables

All `VITE_` prefixed variables are bundled into the client at build time.

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | No | Stripe Elements (Phase 3) |
| `VITE_SENTRY_DSN` | No | Frontend error tracking (Phase 9) |
| `VITE_GOOGLE_MAPS_API_KEY` | Yes | Maps on track order / checkout |
| `VITE_SUPABASE_URL` | Yes | Supabase Realtime client |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase Realtime client |
| `VITE_WS_URL` | Yes (prod) | WebSocket server URL |
| `VITE_API_BASE_URL` | Yes (prod) | REST API base URL |

---

## Testing Strategy

### Unit Tests (Vitest + Testing Library)

| File | Coverage Target | Phase |
|------|----------------|-------|
| `use-websocket.test.ts` | Connection, reconnect, messages | 1 |
| `use-customer-session.test.ts` | Auth flow | 2 |
| `use-chat.test.ts` | Message state | 5 |
| `use-order-realtime.test.ts` | Real-time update merging | 4 |
| `use-seed-scripts.test.ts` | Template CRUD | existing |
| `src/lib/block-content.test.ts` | Block content helpers | 8 |
| `src/lib/image-storage.test.ts` | Image upload | 8 |
| `src/lib/local-storage.test.ts` | Storage key usage | 8 |

### Coverage Thresholds

| Area | Target |
|------|--------|
| `src/lib/database/` | 80%+ |
| `src/hooks/` | 60%+ |

### E2E Tests (Playwright)

| Flow | Scope |
|------|-------|
| Customer flow | Browse → Cart → Checkout → Confirmation → Track |
| Vendor flow | Login → Accept order → Kitchen progress |
| Rider flow | Login → View deliveries → Claim → Deliver |
| Admin flow | Login → Orders → Update status → Refund |
| Setup flow | OAuth → Template → Admin dashboard |

All E2E tests use a **dedicated seeded `projectRef`** via `tests/fixtures/seed.ts`. Data is truncated after each suite run.

---

## Build & Deployment

### Vite Build

```bash
npm run build      # → dist/ (frontend static assets)
npm run preview    # Local preview of production build
tsc --noEmit       # Type check without emit
```

### Vercel Deployment

```
vercel.json
  ├── rewrites: /* → /index.html    (SPA fallback)
  ├── headers: CSP, Permissions-Policy, CORS  [Phase 10]
  └── env: VITE_* variables injected at build time
```

### CI/CD (GitHub Actions — Phase 9)

```yaml
# .github/workflows/ci.yml
jobs:
  frontend:
    - npm install
    - tsc --noEmit
    - npx vitest run --coverage
    - npm run build
    - npx playwright test
```

### Sentry Error Boundary (Phase 9)

```typescript
// main.tsx
Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN })

// App.tsx
<Sentry.ErrorBoundary fallback={<ErrorPage />}>
  <RouterOutlet />
</Sentry.ErrorBoundary>
```

---

## Feature Completion Roadmap

| Feature | Current | Target | Phase |
|---------|---------|--------|-------|
| Website builder (49 blocks) | 95% | 100% | — |
| App builder (42 blocks) | 90% | 100% | 5 (chat block) |
| Dashboard builder | 85% | 100% | 4 (live notifications) |
| Customer authentication | 0% | 100% | 2 |
| Stripe checkout | 0% | 100% | 3 |
| Real-time order tracking | ~5% | 100% | 4 |
| Live rider GPS map | 0% | 100% | 4 |
| In-app messaging (chat) | 0% | 100% | 5 |
| Order cancellation UI | 0% | 100% | 6 |
| Scheduled orders UI | 0% | 100% | 6 |
| Push notifications | 0% | 100% | 7 |
| Admin 2FA | 0% | 100% | 10 |
| Audit log viewer | 0% | 100% | 10 |
| Frontend test coverage | ~15% | 60%+ hooks, 80%+ lib | 8 |
| Sentry integration | 0% | 100% | 9 |
