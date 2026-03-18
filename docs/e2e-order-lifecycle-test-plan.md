## E2E order lifecycle test plan (production hardening)

This plan validates:
- Role-based authorization (customer vs vendor vs rider vs admin)
- Idempotency (status transitions + Stripe webhooks)
- Spatial dispatch (riders only notified/see deliveries inside radius, with radius expansion)
- Background job safety (no duplicate dispatch/notifications across replicas)

### Preconditions / environment

- **Database**: Supabase project configured, migrations applied (including `013_stripe_events.sql`)
- **Redis**: `REDIS_URL` set in production (required for reliable sessions + locks + location)
- **Workspace location**: `workspaces.lat` and `workspaces.lon` set for a given `project_ref`
- **Vendor settings**: `vendor_settings.delivery_radius_km` set (ex: 5km)
- **Admin settings**: `admin_settings.max_search_radius_km` set (ex: 15km)
- **Rider availability**: rider app sends `POST /api/deliveries/rider/location` periodically

### Role authorization matrix (must pass)

- **Customer**
  - Can: list own orders, fetch own order, cancel own cancellable order, rate/tip own order
  - Cannot: accept/reject/extend SLA, refund, assign/reassign riders, view other customers’ orders
- **Vendor**
  - Can: list project orders, fetch order, accept/reject/extend SLA, assign/reassign/external assign
  - Cannot: claim deliveries as rider, update rider GPS, complete order as rider
- **Rider**
  - Can: list available deliveries, claim delivery, update own delivery status/location, mark arrived, complete (via order completion endpoint)
  - Cannot: accept/reject orders, refund, change vendor settings, view customer PII beyond what’s necessary
- **Admin**
  - Can: all vendor capabilities + admin settings + refunds

### Test cases

#### 1) AuthZ: customer isolation
- **Setup**: create Customer A + Customer B in same `project_ref`
- **Action**: Customer A calls `GET /api/orders/:id` for Customer B’s order
- **Expected**: `403 Access denied`

#### 2) AuthZ: vendor controls only
- **Action**: Customer calls `POST /api/orders/:id/accept`
- **Expected**: `403 Insufficient permissions` (or `401` if unauthenticated)
- **Action**: Vendor calls accept/reject/extend-sla
- **Expected**: succeeds when transition is valid

#### 3) Idempotency: status transitions
- **Action**: Vendor calls `POST /api/orders/:id/accept` twice
- **Expected**: 1st transitions `placed → accepted`; 2nd returns success with `{ idempotent: true }`

#### 4) Idempotency: Stripe webhook retries
- **Action**: deliver identical Stripe `event.id` twice to `/api/webhooks/stripe`
- **Expected**: first creates order; second returns `{ duplicate: true }` and does not create a second order

#### 5) Spatial dispatch (base radius)
- **Setup**: workspace at (lat, lon), rider1 reports location within radius, rider2 reports location outside radius
- **Action**: make an order become `ready` so auto-dispatch runs
- **Expected**:
  - rider1 receives `delivery:request` (WS or delivery list shows delivery)
  - rider2 does **not** receive targeted request (may still see it only if you intentionally enable broadcast fallback)

#### 6) Radius expansion for stale deliveries
- **Setup**: no rider claims a delivery for >5 minutes
- **Action**: radius-expansion job runs
- **Expected**:
  - effective radius increases in steps (ex: +2km) up to `admin_settings.max_search_radius_km`
  - newly-in-radius riders receive `delivery:request` with `expandedSearch: true`

#### 7) Job locking (multi-replica)
- **Setup**: run 2 backend instances (or simulate concurrent job execution)
- **Action**: wait for auto-dispatch + sla-check + radius-expansion ticks
- **Expected**:
  - only one instance performs each job per interval
  - no duplicate deliveries created for the same `ready` order
  - no duplicate delayed notifications for same order

### Manual UI verification (web + mobile)

- **Vendor app**: order queue updates in real-time; accept/reject/extend SLA work; assignment tools work
- **Rider app**: “Available” shows only deliveries relevant to project; claim is race-safe; “Arrived” updates customer UI
- **Customer app**: order detail shows timeline; cancellation works only when allowed; delayed banner appears on SLA breach

