# 🍔 Food Delivery System — Complete Flow, Behaviours & Feature Map

## Implementation Status

| Section | Status |
|---------|--------|
| 1. Order Creation Flow | ✅ Implemented |
| 2. Preparation & SLA Flow | ✅ Implemented |
| 3. Order Ready Flow | ✅ Implemented |
| 4. Delivery Mode Decision | ✅ Implemented |
| 5A. Rider Discovery Flow (Third-Party) | ✅ Implemented |
| 5B. Manual Rider Assignment (Vendor) | ✅ Implemented |
| 6A. Pickup Flow | ✅ Implemented |
| 7A. Delivery Tracking Flow | ✅ Implemented |
| 8A. Delivery Completion | ✅ Implemented |
| 9. Communication Flow | ✅ Implemented |
| 10. Notification Flow | ✅ Implemented |
| 11. Admin Control Flow | ✅ Implemented |
| 12. Geo-Fence Interaction Flow | ✅ Implemented (Haversine distance check) |
| 13. Post-Delivery Flow (Ratings + Tips) | ✅ Implemented |
| 14. State Machine | ✅ Implemented |
| 15. Edge Case Flows | ✅ Implemented |

### What was built

**Backend (apps/server):**
- Full state machine: PLACED → ACCEPTED/REJECTED → PREPARING → READY → ASSIGNED → PICKED_UP → ARRIVED → COMPLETED
- Status transition validation
- SLA timer system (deadline calculation, breach detection job)
- Auto-dispatch job (creates deliveries for ready orders)
- Vendor settings model (auto-accept, delivery mode, prep time, radius)
- Ratings & tips models + routes
- Rider assignment (third-party claim + vendor manual assign)
- All new routes: accept, reject, complete, arrived, assign, ratings, tips, vendor-settings
- New WebSocket events: order:rejected, order:delayed, delivery:request, delivery:rider_arrived
- Push notifications for all state transitions
- Migration 009_order_lifecycle.sql
- Migration 010_external_rider.sql
- Auto-accept wired into order creation (vendor setting)
- SLA extension route (vendor can extend prep time)
- Rider reassignment route (for rider failure)
- Radius expansion job (re-broadcasts stale pending deliveries every 2min)
- Geo-fence validation via Haversine (delivery-check endpoint)
- External rider support (vendor inputs rider name/phone for vendor_rider mode)

**Web apps (apps/customer, apps/vendor, apps/rider):**
- Customer: full order tracking with new states, rejection banner, SLA countdown, rating/tip screens, "Searching for rider" state, external rider contact, geo-fence delivery check on checkout
- Vendor: full dashboard with live order queue, accept/reject/prepare/ready, settings page (auto-accept, delivery mode, prep time, radius), manual rider assignment, external rider assignment, SLA extension, rider reassignment
- Rider: full dashboard with delivery queue, claim, status progression (assigned/picked_up/arrived/complete), earnings/ratings display, chat

**Mobile apps (apps/customer-mobile, apps/vendor-mobile, apps/rider-mobile):**
- All flows mirrored from web with React Native/Expo screens
- GPS location tracking on rider app (expo-location, every 5s)
- Rating/tip screens on customer app
- Vendor settings + external rider + SLA extend on vendor app
- "Searching for rider" banner + external rider contact on customer app
- Geo-fence delivery check on customer checkout

---

## 🧠 MASTER SYSTEM FLOW MAP (Customer ↔ Vendor ↔ Rider)

---

# 🧾 1. ORDER CREATION FLOW (Customer → Vendor → Rider)

## Trigger: Customer places order

### Customer App

* Select vendor
* Select items
* Confirm order
* Receives: **Order Placed Confirmation**

### System Behavior

* Order enters: `PLACED`
* SLA timer initialized
* Vendor notified instantly

### Vendor App Impact

* Receives new order request
* Must:

  * Accept OR Reject
  * Or auto-accept (if enabled)

---

### Branch A — Vendor Accepts

* Order → `ACCEPTED`
* Vendor sets preparation time

#### Customer Impact

* Sees: “Order Accepted”
* Sees ETA

#### Rider Impact

* None yet

---

### Branch B — Vendor Rejects

* Order → `REJECTED`

#### Customer Impact

* Notified immediately
* Flow ends

#### Rider Impact

* None

---

# ⏱ 2. PREPARATION & SLA FLOW (Vendor → Customer)

## Trigger: Vendor starts preparing order

### Vendor App

* Sets prep time (or default applied)
* Timer starts

### System Behavior

* SLA countdown begins

### Customer App

* Sees countdown / ETA

---

### Delay Condition (SLA Breach)

#### Customer

* Gets: **“Order delayed” notification**

#### Vendor

* Gets:

  * Alert
  * Prompt to extend time

#### System

* Marks order as delayed

---

# 🍳 3. ORDER READY FLOW (Vendor → System → Rider)

## Trigger: Vendor marks “Ready for Delivery”

### System Behavior

* Order → `READY`
* Delivery process begins

---

# 🚚 4. DELIVERY MODE DECISION

## Vendor Setting Determines Path

---

# 🔀 FLOW A — Third-Party Riders

---

# 📡 5A. RIDER DISCOVERY FLOW (System → Riders)

## Trigger: Order is READY

### System

* Finds riders within vendor geofence
* Sends delivery request

### Rider App

* Receives:

  * Order request
  * Accept / Reject options

---

### Branch A — Rider Accepts

#### System

* Assigns rider
* Stops further broadcasts

#### Rider App

* Gets:

  * Vendor location
  * Customer details
  * Navigation prompt

#### Vendor App

* Sees: rider assigned

#### Customer App

* Sees:

  * Rider assigned
  * Rider details

---

### Branch B — Rider Rejects / No Response

#### System

* Expands search radius
* Repeats broadcast

#### Customer

* May see: “Searching for rider”

---

# 📦 6A. PICKUP FLOW (Rider → Vendor → Customer)

## Trigger: Rider arrives at vendor

### Rider App

* Taps: “Arrived”

### Vendor

* Hands over order

### Rider

* Taps: “Picked Up”

### System

* Order → `PICKED_UP`

### Customer

* Gets notification
* Live tracking starts

---

# 📍 7A. DELIVERY TRACKING FLOW

### Rider

* Location continuously updated

### Customer

* Sees live map tracking

### Vendor

* No longer involved

---

# 🏁 8A. DELIVERY COMPLETION

## Trigger: Rider reaches customer

### Rider App

* Taps: “Arrived Outside”

### Customer

* Gets notification

---

### Final Step

### Rider

* Taps: “Order Completed”

### System

* Order → `COMPLETED`

### Customer

* Gets:

  * Completion confirmation
  * Rating + tip prompt

---

# 🛵 FLOW B — Vendor Riders

---

# 👤 5B. MANUAL RIDER ASSIGNMENT (Vendor → Rider)

## Trigger: Order is READY

### Vendor App

* Selects rider manually

---

### Branch A — Registered Rider

#### Rider App

* Receives order

#### Rider

* Accepts implicitly or explicitly

---

### Branch B — External Rider

#### Vendor

* Inputs contact details

#### System

* Shares rider info with customer

#### Customer

* Sees rider contact (no tracking if not in system)

---

# 📦 6B → 8B

Same as Flow A:

* Pickup
* Tracking (if system rider)
* Delivery completion

---

# 💬 9. COMMUNICATION FLOW (Customer ↔ Rider)

## Trigger: Rider assigned

### Customer

* Chat
* Call rider

### Rider

* Receives messages

---

# 🔔 10. NOTIFICATION FLOW (System-wide)

## Events

* Order placed
* Order accepted/rejected
* Delay detected
* Order ready
* Rider assigned
* Order picked up
* Rider arrived
* Order completed

## Recipients

* Customer
* Vendor
* Rider

---

# ⚙️ 11. ADMIN CONTROL FLOW

## Controls

### Vendor Behavior

* Auto-accept
* Delivery mode

### System Behavior

* Avg delivery time
* Auto-dispatch trigger

---

### Auto Dispatch Scenario

* If vendor delays too long:

#### System

* Forces rider search

#### Vendor

* Notified

#### Customer

* Sees progress

---

# 📍 12. GEO-FENCE INTERACTION FLOW

## Customer → Vendor

* Customer can only order if inside vendor zone

## Vendor → Rider

* Riders notified only within delivery radius

## System

* Expands radius if needed

---

# ⭐ 13. POST-DELIVERY FLOW

## Trigger: Order completed

### Customer

* Rates:

  * Vendor
  * Rider
* Adds tip

### Vendor

* Receives rating

### Rider

* Receives rating + tip

---

# 🔄 14. STATE MACHINE

```
PLACED
→ ACCEPTED / REJECTED
→ PREPARING
→ READY
→ ASSIGNED
→ PICKED_UP
→ ARRIVED
→ COMPLETED
```

---

# ⚠️ 15. EDGE CASE FLOWS

## No Rider Found

* Retry with expanded radius
* Notify customer

## Vendor Delay

* Trigger alerts
* Allow extension

## Order Cancellation (Optional)

* Customer / Vendor / Admin cancellation

## Rider Failure

* Reassign rider
* Notify customer

---

# 🔗 FINAL RELATIONSHIP SUMMARY

### Customer

* Initiates all flows
* Observes all states

### Vendor

* Controls order acceptance & preparation

### Rider

* Handles fulfillment & delivery

### System

* Orchestrates:

  * Timing
  * Matching
  * Notifications
  * State transitions

---
