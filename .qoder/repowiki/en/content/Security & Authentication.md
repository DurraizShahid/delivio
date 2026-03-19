# Security & Authentication

<cite>
**Referenced Files in This Document**
- [supabase.js](file://apps/server/lib/supabase.js)
- [auth.middleware.js](file://apps/server/middleware/auth.middleware.js)
- [auth.controller.js](file://apps/server/controllers/auth.controller.js)
- [auth.routes.js](file://apps/server/routes/auth.routes.js)
- [session.service.js](file://apps/server/services/session.service.js)
- [rate-limit.middleware.js](file://apps/server/middleware/rate-limit.middleware.js)
- [cors.js](file://apps/server/config/cors.js)
- [helmet.js](file://apps/server/config/helmet.js)
- [index.js](file://apps/server/config/index.js)
- [user.model.js](file://apps/server/models/user.model.js)
- [customer.model.js](file://apps/server/models/customer.model.js)
- [memory-session-store.js](file://apps/server/services/memory-session-store.js)
- [redis-session-store.js](file://apps/server/services/redis-session-store.js)
- [app.js](file://apps/server/app.js)
- [validate.middleware.js](file://apps/server/middleware/validate.middleware.js)
- [auth.validator.js](file://apps/server/validators/auth.validator.js)
- [project-ref.middleware.js](file://apps/server/middleware/project-ref.middleware.js)
- [audit.js](file://apps/server/lib/audit.js)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction
This document describes the Delivio security and authentication system. It covers the multi-role authentication architecture supporting administrators and customers, session management, JWT token handling, role-based access control, authorization patterns, workspace isolation via project references, rate limiting, security middleware, input validation, Supabase integration for authentication and session storage, and security best practices including CORS and Helmet configurations. It also includes authentication flow diagrams, session lifecycle management, and troubleshooting procedures.

## Project Structure
The authentication and security subsystem spans several layers:
- Configuration: environment-driven security policies (CORS, Helmet, rate limits, JWT, OTP, Redis).
- Middleware: request parsing, CORS/Helmet, rate limiting, session parsing, authorization guards, input validation, and project reference handling.
- Services: session store abstraction (Redis or in-memory), OTP/password reset tokens, and caching helpers.
- Controllers: authentication endpoints (login, logout, OTP, 2FA, password reset, sessions).
- Models: user and customer persistence via Supabase.
- Utilities: Supabase REST wrapper, audit logging.

```mermaid
graph TB
subgraph "Config"
CFG_IDX["config/index.js"]
CFG_CORS["config/cors.js"]
CFG_HELMET["config/helmet.js"]
end
subgraph "Middleware"
MW_PARSE["middleware/auth.middleware.js"]
MW_RATE["middleware/rate-limit.middleware.js"]
MW_VALIDATE["middleware/validate.middleware.js"]
MW_PROJECT["middleware/project-ref.middleware.js"]
end
subgraph "Services"
SVC_SESSION["services/session.service.js"]
SVC_MEM["services/memory-session-store.js"]
SVC_REDIS["services/redis-session-store.js"]
end
subgraph "Controllers"
CTRL_AUTH["controllers/auth.controller.js"]
end
subgraph "Routes"
ROUTE_AUTH["routes/auth.routes.js"]
end
subgraph "Models"
MODEL_USER["models/user.model.js"]
MODEL_CUSTOMER["models/customer.model.js"]
end
subgraph "Lib"
LIB_SUPA["lib/supabase.js"]
LIB_AUDIT["lib/audit.js"]
end
APP["app.js"]
APP --> CFG_IDX
APP --> CFG_CORS
APP --> CFG_HELMET
APP --> MW_PARSE
APP --> MW_RATE
APP --> MW_VALIDATE
APP --> MW_PROJECT
APP --> ROUTE_AUTH
ROUTE_AUTH --> CTRL_AUTH
CTRL_AUTH --> SVC_SESSION
CTRL_AUTH --> MODEL_USER
CTRL_AUTH --> MODEL_CUSTOMER
SVC_SESSION --> SVC_MEM
SVC_SESSION --> SVC_REDIS
SVC_SESSION --> LIB_SUPA
CTRL_AUTH --> LIB_AUDIT
```

**Diagram sources**
- [app.js:1-88](file://apps/server/app.js#L1-L88)
- [index.js:1-117](file://apps/server/config/index.js#L1-L117)
- [cors.js:1-36](file://apps/server/config/cors.js#L1-L36)
- [helmet.js:1-28](file://apps/server/config/helmet.js#L1-L28)
- [auth.routes.js:1-37](file://apps/server/routes/auth.routes.js#L1-L37)
- [auth.controller.js:1-321](file://apps/server/controllers/auth.controller.js#L1-L321)
- [session.service.js:1-180](file://apps/server/services/session.service.js#L1-L180)
- [memory-session-store.js:1-46](file://apps/server/services/memory-session-store.js#L1-L46)
- [redis-session-store.js:1-37](file://apps/server/services/redis-session-store.js#L1-L37)
- [user.model.js:1-64](file://apps/server/models/user.model.js#L1-L64)
- [customer.model.js:1-61](file://apps/server/models/customer.model.js#L1-L61)
- [supabase.js:1-151](file://apps/server/lib/supabase.js#L1-L151)
- [audit.js:1-35](file://apps/server/lib/audit.js#L1-L35)

**Section sources**
- [app.js:1-88](file://apps/server/app.js#L1-L88)
- [index.js:1-117](file://apps/server/config/index.js#L1-L117)

## Core Components
- Multi-role authentication: Admins and customers supported with separate session cookies and JWT bearer tokens for API/mobile clients.
- Session management: Redis-backed or in-memory session store with TTLs; session IDs stored in HTTP-only cookies.
- JWT handling: Signed tokens for pre-auth and 2FA login flows; verified on protected routes.
- Authorization: Guards enforce admin/customer sessions and role-based access.
- Workspace isolation: Project reference attached via middleware to scope resources.
- Rate limiting: Global, auth-specific, payment-specific, and OTP send rate limits.
- Input validation: Zod schemas with middleware to coerce and validate request bodies.
- Supabase integration: REST wrappers for DB operations, password hashing via bcrypt, and audit logging.

**Section sources**
- [auth.middleware.js:1-123](file://apps/server/middleware/auth.middleware.js#L1-L123)
- [session.service.js:1-180](file://apps/server/services/session.service.js#L1-L180)
- [auth.controller.js:1-321](file://apps/server/controllers/auth.controller.js#L1-L321)
- [project-ref.middleware.js:1-36](file://apps/server/middleware/project-ref.middleware.js#L1-L36)
- [rate-limit.middleware.js:1-60](file://apps/server/middleware/rate-limit.middleware.js#L1-L60)
- [validate.middleware.js:1-28](file://apps/server/middleware/validate.middleware.js#L1-L28)
- [user.model.js:1-64](file://apps/server/models/user.model.js#L1-L64)
- [customer.model.js:1-61](file://apps/server/models/customer.model.js#L1-L61)
- [supabase.js:1-151](file://apps/server/lib/supabase.js#L1-L151)
- [audit.js:1-35](file://apps/server/lib/audit.js#L1-L35)

## Architecture Overview
The system enforces layered security:
- Transport and request security via Helmet and CORS.
- Identity resolution via session cookies or JWT bearer tokens.
- Authorization via role-based guards.
- Input validation and rate limiting.
- Persistent storage via Supabase with hashed passwords and audit logs.

```mermaid
sequenceDiagram
participant Client as "Client"
participant App as "Express App"
participant CORS as "CORS"
participant Helmet as "Helmet"
participant Parser as "Body/Cookie Parser"
participant Sentry as "Sentry"
participant Router as "Routes"
participant AuthMW as "Auth Middleware"
participant Ctrl as "Auth Controller"
participant Svc as "Session Service"
participant Store as "Session Store"
participant DB as "Supabase"
Client->>App : HTTP Request
App->>Helmet : Apply security headers
App->>CORS : Enforce origin policy
App->>Parser : Parse cookies/body
App->>Sentry : Optional request tracing
App->>Router : Route dispatch
Router->>AuthMW : parseSession()
AuthMW->>Svc : getAdminSession()/getCustomerSession()
Svc->>Store : get(key)
Store-->>Svc : session data or null
Router->>Ctrl : Controller action
Ctrl->>Svc : create/delete session, OTP/reset tokens
Ctrl->>DB : Supabase ops (insert/update/select)
DB-->>Ctrl : Results
Ctrl-->>Client : Response
```

**Diagram sources**
- [app.js:18-68](file://apps/server/app.js#L18-L68)
- [cors.js:5-33](file://apps/server/config/cors.js#L5-L33)
- [helmet.js:3-25](file://apps/server/config/helmet.js#L3-L25)
- [auth.middleware.js:11-51](file://apps/server/middleware/auth.middleware.js#L11-L51)
- [session.service.js:28-62](file://apps/server/services/session.service.js#L28-L62)
- [memory-session-store.js:14-33](file://apps/server/services/memory-session-store.js#L14-L33)
- [redis-session-store.js:12-33](file://apps/server/services/redis-session-store.js#L12-L33)
- [auth.controller.js:26-81](file://apps/server/controllers/auth.controller.js#L26-L81)
- [supabase.js:107-148](file://apps/server/lib/supabase.js#L107-L148)

## Detailed Component Analysis

### Authentication Middleware and Guards
- parseSession: Reads admin_session or customer_session cookies; optionally accepts Authorization: Bearer JWT for API clients. Attaches user/customer identity and session IDs to the request.
- requireAdmin, requireCustomer, requireAnyAuth: Enforce authenticated access for admins/customers.
- requireRole: Role enforcement for admin users.
- getCallerId/getCallerRole: Helpers to derive identity and role.

```mermaid
flowchart TD
Start(["parseSession"]) --> CheckAdmin["Read admin_session cookie"]
CheckAdmin --> AdminFound{"Session found?"}
AdminFound --> |Yes| LoadAdmin["Load admin session from store"]
LoadAdmin --> AttachAdmin["Attach req.user and sessionId"]
AdminFound --> |No| CheckCustomer["Read customer_session cookie"]
CheckCustomer --> CustomerFound{"Session found?"}
CustomerFound --> |Yes| LoadCustomer["Load customer session from store"]
LoadCustomer --> AttachCustomer["Attach req.customer and customerSessionId"]
CustomerFound --> |No| CheckBearer["Check Authorization: Bearer"]
CheckBearer --> BearerValid{"JWT valid and type matches?"}
BearerValid --> |Yes| AttachBearer["Attach req.user or req.customer"]
BearerValid --> |No| Next["Continue unauthenticated"]
AttachAdmin --> Next
AttachCustomer --> Next
AttachBearer --> Next
Next --> End(["next()"])
```

**Diagram sources**
- [auth.middleware.js:11-51](file://apps/server/middleware/auth.middleware.js#L11-L51)
- [session.service.js:35-62](file://apps/server/services/session.service.js#L35-L62)

**Section sources**
- [auth.middleware.js:11-123](file://apps/server/middleware/auth.middleware.js#L11-L123)
- [session.service.js:28-62](file://apps/server/services/session.service.js#L28-L62)

### Session Management and Storage
- Session creation and retrieval for admin and customer with TTLs.
- OTP and password reset tokens with TTLs and rate limits.
- Redis or in-memory store abstraction with expiry handling.
- Cookies: httpOnly, secure per environment, sameSite lax/none, path '/', and maxAge from config.

```mermaid
classDiagram
class SessionService {
+createAdminSession(userData) Promise<string>
+getAdminSession(sessionId) Promise<any>
+deleteAdminSession(sessionId) Promise<void>
+createCustomerSession(customerData) Promise<string>
+getCustomerSession(sessionId) Promise<any>
+deleteCustomerSession(sessionId) Promise<void>
+setOTP(phone, code) Promise<void>
+getOTP(phone) Promise<any>
+incrementOTPAttempts(phone, entry) Promise<any>
+deleteOTP(phone) Promise<void>
+checkOTPRateLimit(phone) Promise<boolean>
+setResetToken(token, data) Promise<void>
+getResetToken(token) Promise<any>
+deleteResetToken(token) Promise<void>
+cacheRiderLocation(deliveryId, data) Promise<void>
+getRiderLocation(deliveryId) Promise<any>
+flushLocationCache(deliveryId) Promise<void>
+checkLocationRateLimit(deliveryId) Promise<boolean>
+cacheRiderAvailability(projectRef, riderId, data) Promise<void>
+getRiderAvailability(projectRef, riderId) Promise<any>
+cacheDeliverySearchRadius(deliveryId, radiusKm, ttl) Promise<void>
+getDeliverySearchRadius(deliveryId) Promise<number?>
}
class RedisSessionStore {
+get(id) Promise<any>
+set(id, data, ttl) Promise<void>
+delete(id) Promise<void>
}
class MemorySessionStore {
+get(id) Promise<any>
+set(id, data, ttl) Promise<void>
+delete(id) Promise<void>
}
SessionService --> RedisSessionStore : "uses when Redis available"
SessionService --> MemorySessionStore : "fallback"
```

**Diagram sources**
- [session.service.js:12-24](file://apps/server/services/session.service.js#L12-L24)
- [redis-session-store.js:7-33](file://apps/server/services/redis-session-store.js#L7-L33)
- [memory-session-store.js:7-43](file://apps/server/services/memory-session-store.js#L7-L43)

**Section sources**
- [session.service.js:28-180](file://apps/server/services/session.service.js#L28-L180)
- [redis-session-store.js:1-37](file://apps/server/services/redis-session-store.js#L1-L37)
- [memory-session-store.js:1-46](file://apps/server/services/memory-session-store.js#L1-L46)
- [auth.controller.js:17-22](file://apps/server/controllers/auth.controller.js#L17-L22)

### JWT Token Handling and 2FA
- Pre-authentication flow: Admin login returns a short-lived JWT with step='totp'.
- 2FA verification: TOTP token validated against stored secret; successful 2FA yields admin session cookie.
- Bearer tokens: Verified on protected routes to attach identity.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Ctrl as "Auth Controller"
participant Svc as "Session Service"
participant DB as "Supabase"
participant JWT as "JWT"
Client->>Ctrl : POST /auth/login
Ctrl->>DB : Find user by email
DB-->>Ctrl : User record
Ctrl->>Ctrl : Verify password
alt TOTP enabled
Ctrl->>JWT : Sign preAuthToken (expires=5m)
Ctrl-->>Client : {requiresTwoFactor, preAuthToken}
else No TOTP
Ctrl->>Svc : createAdminSession(...)
Ctrl-->>Client : Set admin_session cookie
end
Client->>Ctrl : POST /auth/2fa/login {sessionToken, totpToken}
Ctrl->>JWT : Verify sessionToken
Ctrl->>DB : Load user by ID
DB-->>Ctrl : User with totp_secret
Ctrl->>Ctrl : Verify TOTP token
alt Valid
Ctrl->>Svc : createAdminSession(...)
Ctrl-->>Client : Set admin_session cookie
else Invalid
Ctrl-->>Client : 400 error
end
```

**Diagram sources**
- [auth.controller.js:26-63](file://apps/server/controllers/auth.controller.js#L26-L63)
- [auth.controller.js:279-313](file://apps/server/controllers/auth.controller.js#L279-L313)
- [auth.middleware.js:34-45](file://apps/server/middleware/auth.middleware.js#L34-L45)

**Section sources**
- [auth.controller.js:37-45](file://apps/server/controllers/auth.controller.js#L37-L45)
- [auth.controller.js:279-313](file://apps/server/controllers/auth.controller.js#L279-L313)
- [auth.middleware.js:34-45](file://apps/server/middleware/auth.middleware.js#L34-L45)

### Authorization and Role-Based Access Control
- requireAdmin: Enforce admin session.
- requireRole: Enforce specific admin roles.
- requireCustomer: Enforce customer session.
- requireAnyAuth: Enforce either admin or customer.
- getCallerId/getCallerRole: Helpers for downstream authorization logic.

```mermaid
flowchart TD
A["Route protected by requireRole('admin')"] --> B{"req.user exists?"}
B --> |No| C["401 Unauthorized"]
B --> |Yes| D{"req.user.role in ['admin']?"}
D --> |No| E["403 Forbidden"]
D --> |Yes| F["next()"]
```

**Diagram sources**
- [auth.middleware.js:66-76](file://apps/server/middleware/auth.middleware.js#L66-L76)

**Section sources**
- [auth.middleware.js:56-112](file://apps/server/middleware/auth.middleware.js#L56-L112)

### Workspace Isolation with Project Reference
- attachProjectRef: Derives projectRef from route params, session, header, or query (public routes only).
- requireProjectRef: Enforces presence of projectRef for protected routes.

```mermaid
flowchart TD
Start(["attachProjectRef"]) --> P1["req.params.projectRef"]
Start --> P2["req.user.projectRef"]
Start --> P3["req.customer.projectRef"]
Start --> P4["req.headers.x-project-ref"]
Start --> P5["req.query.projectRef"]
P1 --> Pick{"One of the above is truthy?"}
P2 --> Pick
P3 --> Pick
P4 --> Pick
P5 --> Pick
Pick --> |Yes| Set["req.projectRef = value"]
Pick --> |No| SetNull["req.projectRef = null"]
Set --> Next(["next()"])
SetNull --> Next
```

**Diagram sources**
- [project-ref.middleware.js:13-23](file://apps/server/middleware/project-ref.middleware.js#L13-L23)

**Section sources**
- [project-ref.middleware.js:13-36](file://apps/server/middleware/project-ref.middleware.js#L13-L36)

### Rate Limiting Mechanisms
- Global limiter: 100 requests/minute per IP across /api/*.
- Auth limiter: 20 requests/minute per IP for auth routes.
- Payment limiter: 30 requests/minute per IP for payment routes.
- OTP send limiter: 3 requests per phone per 15 minutes using phone as key.

```mermaid
flowchart TD
Req["Incoming Request"] --> Limiter{"Which limiter applies?"}
Limiter --> GL["Global Limiter"]
Limiter --> AL["Auth Limiter"]
Limiter --> PL["Payment Limiter"]
Limiter --> OL["OTP Send Limiter"]
GL --> CheckGL{"Exceeded?"}
AL --> CheckAL{"Exceeded?"}
PL --> CheckPL{"Exceeded?"}
OL --> CheckOL{"Exceeded?"}
CheckGL --> |Yes| Block["429 Too Many Requests"]
CheckGL --> |No| Next["Proceed"]
CheckAL --> |Yes| Block
CheckAL --> |No| Next
CheckPL --> |Yes| Block
CheckPL --> |No| Next
CheckOL --> |Yes| Block
CheckOL --> |No| Next
```

**Diagram sources**
- [rate-limit.middleware.js:16-57](file://apps/server/middleware/rate-limit.middleware.js#L16-L57)
- [auth.routes.js:13-29](file://apps/server/routes/auth.routes.js#L13-L29)

**Section sources**
- [rate-limit.middleware.js:13-58](file://apps/server/middleware/rate-limit.middleware.js#L13-L58)
- [auth.routes.js:12-34](file://apps/server/routes/auth.routes.js#L12-L34)

### Input Validation
- Zod schemas define strict validation for each endpoint.
- validate middleware parses, coerces, and replaces request body/query/params; returns structured 400 errors on failure.

```mermaid
flowchart TD
Start(["validate(schema, source)"]) --> Parse["schema.safeParse(req[source])"]
Parse --> Valid{"success?"}
Valid --> |No| Errors["Map Zod errors to [{field,message}]"]
Errors --> Respond["400 Validation failed"]
Valid --> |Yes| Replace["req[source] = result.data"]
Replace --> Next["next()"]
```

**Diagram sources**
- [validate.middleware.js:9-25](file://apps/server/middleware/validate.middleware.js#L9-L25)
- [auth.validator.js:5-50](file://apps/server/validators/auth.validator.js#L5-L50)

**Section sources**
- [validate.middleware.js:1-28](file://apps/server/middleware/validate.middleware.js#L1-L28)
- [auth.validator.js:1-63](file://apps/server/validators/auth.validator.js#L1-L63)

### Supabase Integration
- Supabase REST wrapper: fetch helper, SQL execution via Management API, filter builder, convenience CRUD helpers.
- User model: bcrypt password hashing, password updates, TOTP enable/disable, sanitization.
- Customer model: find/create, profile updates, address management via Supabase helpers.
- Audit logging: writes to audit_log table without failing the request.

```mermaid
sequenceDiagram
participant Ctrl as "Auth Controller"
participant ModelU as "User Model"
participant ModelC as "Customer Model"
participant Supa as "Supabase"
participant Audit as "Audit Log"
Ctrl->>ModelU : create/find/verify/update password
ModelU->>Supa : insert/update/select
Supa-->>ModelU : Rows/OK
Ctrl->>ModelC : findOrCreate/updateProfile
ModelC->>Supa : insert/update/select/remove
Supa-->>ModelC : Rows/OK
Ctrl->>Audit : writeAuditLog(...)
Audit->>Supa : insert audit_log
```

**Diagram sources**
- [user.model.js:25-49](file://apps/server/models/user.model.js#L25-L49)
- [customer.model.js:16-31](file://apps/server/models/customer.model.js#L16-L31)
- [supabase.js:107-148](file://apps/server/lib/supabase.js#L107-L148)
- [audit.js:18-32](file://apps/server/lib/audit.js#L18-L32)

**Section sources**
- [supabase.js:26-151](file://apps/server/lib/supabase.js#L26-L151)
- [user.model.js:25-61](file://apps/server/models/user.model.js#L25-L61)
- [customer.model.js:16-58](file://apps/server/models/customer.model.js#L16-L58)
- [audit.js:18-32](file://apps/server/lib/audit.js#L18-L32)

### Security Middleware and Configuration
- Helmet: Content-Security-Policy, referrer-policy, cross-origin policies tailored for Stripe, Supabase, and Google Maps.
- CORS: Origin allowlist with development exceptions; credentials allowed; preflight caching.
- Trust proxy: Enabled in production to resolve real client IPs for rate limiting.
- Sentry: Optional APM and error reporting.

```mermaid
graph LR
App["app.js"] --> Helmet["helmet.js"]
App --> CORS["cors.js"]
App --> Sentry["Sentry (optional)"]
App --> TrustProxy["trust proxy = 1 (prod)"]
```

**Diagram sources**
- [app.js:18-65](file://apps/server/app.js#L18-L65)
- [helmet.js:3-25](file://apps/server/config/helmet.js#L3-L25)
- [cors.js:5-33](file://apps/server/config/cors.js#L5-L33)
- [index.js:14](file://apps/server/config/index.js#L14)

**Section sources**
- [app.js:18-65](file://apps/server/app.js#L18-L65)
- [helmet.js:1-28](file://apps/server/config/helmet.js#L1-L28)
- [cors.js:1-36](file://apps/server/config/cors.js#L1-L36)
- [index.js:14](file://apps/server/config/index.js#L14)

## Dependency Analysis
- Controllers depend on services for session and OTP management and on models for persistence.
- Services depend on the session store abstraction and Supabase for database operations.
- Middleware depends on configuration for limits and JWT secrets.
- Routes mount rate limiters and validators before controller actions.

```mermaid
graph TB
CTRL["auth.controller.js"] --> SVC["session.service.js"]
CTRL --> UM["user.model.js"]
CTRL --> CM["customer.model.js"]
SVC --> MEM["memory-session-store.js"]
SVC --> REDIS["redis-session-store.js"]
CTRL --> AUDIT["audit.js"]
CTRL --> SUPA["supabase.js"]
ROUTES["auth.routes.js"] --> CTRL
ROUTES --> VALID["validate.middleware.js"]
ROUTES --> RL["rate-limit.middleware.js"]
MW["auth.middleware.js"] --> SVC
APP["app.js"] --> ROUTES
APP --> CORS["cors.js"]
APP --> HELMET["helmet.js"]
APP --> CFG["config/index.js"]
```

**Diagram sources**
- [auth.controller.js:1-321](file://apps/server/controllers/auth.controller.js#L1-L321)
- [session.service.js:1-180](file://apps/server/services/session.service.js#L1-L180)
- [memory-session-store.js:1-46](file://apps/server/services/memory-session-store.js#L1-L46)
- [redis-session-store.js:1-37](file://apps/server/services/redis-session-store.js#L1-L37)
- [user.model.js:1-64](file://apps/server/models/user.model.js#L1-L64)
- [customer.model.js:1-61](file://apps/server/models/customer.model.js#L1-L61)
- [audit.js:1-35](file://apps/server/lib/audit.js#L1-L35)
- [supabase.js:1-151](file://apps/server/lib/supabase.js#L1-L151)
- [auth.routes.js:1-37](file://apps/server/routes/auth.routes.js#L1-L37)
- [validate.middleware.js:1-28](file://apps/server/middleware/validate.middleware.js#L1-L28)
- [rate-limit.middleware.js:1-60](file://apps/server/middleware/rate-limit.middleware.js#L1-L60)
- [auth.middleware.js:1-123](file://apps/server/middleware/auth.middleware.js#L1-L123)
- [app.js:1-88](file://apps/server/app.js#L1-L88)
- [cors.js:1-36](file://apps/server/config/cors.js#L1-L36)
- [helmet.js:1-28](file://apps/server/config/helmet.js#L1-L28)
- [index.js:1-117](file://apps/server/config/index.js#L1-L117)

**Section sources**
- [auth.controller.js:1-321](file://apps/server/controllers/auth.controller.js#L1-L321)
- [auth.routes.js:1-37](file://apps/server/routes/auth.routes.js#L1-L37)
- [auth.middleware.js:1-123](file://apps/server/middleware/auth.middleware.js#L1-L123)
- [session.service.js:1-180](file://apps/server/services/session.service.js#L1-L180)

## Performance Considerations
- Use Redis-backed session store in production for horizontal scaling and TTL efficiency.
- Tune rate limiter windows and max values based on traffic patterns.
- Keep JWT secret and session secret strong and rotated periodically.
- Cache frequently accessed data (e.g., rider availability) with appropriate TTLs to reduce DB load.
- Monitor audit log writes to ensure they do not become a bottleneck.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and resolutions:
- Authentication failures
  - Verify cookies are set with correct domain/path and SameSite/Secure flags per environment.
  - Confirm Authorization: Bearer tokens are signed with the configured JWT secret.
  - Check that parseSession is applied before requireAdmin/requireCustomer.
- 2FA login errors
  - Ensure pre-auth token is recent and valid.
  - Confirm TOTP token matches the user’s stored secret.
- OTP issues
  - Check OTP send rate limit key generation using phone number.
  - Verify OTP attempts increment and expiration align with config.
- Session not found
  - Confirm session store connectivity (Redis) and keyspace.
  - Validate TTLs and pruning behavior.
- CORS errors
  - Ensure origin is in ALLOWED_ORIGINS or development localhost is permitted.
  - Confirm credentials: true and exposedHeaders include X-Request-Id.
- Helmet CSP issues
  - Review connectSrc allowing Supabase, Stripe, and Google Maps domains.
  - Disable Cross-Origin Embedder Policy only for Stripe iframes as configured.
- Sentry not capturing traces
  - Verify DSN and Express handler compatibility for the installed version.

**Section sources**
- [auth.middleware.js:11-51](file://apps/server/middleware/auth.middleware.js#L11-L51)
- [auth.controller.js:148-186](file://apps/server/controllers/auth.controller.js#L148-L186)
- [session.service.js:85-92](file://apps/server/services/session.service.js#L85-L92)
- [cors.js:5-33](file://apps/server/config/cors.js#L5-L33)
- [helmet.js:3-25](file://apps/server/config/helmet.js#L3-L25)
- [app.js:47-65](file://apps/server/app.js#L47-L65)

## Conclusion
Delivio’s authentication system combines robust session management, JWT-based API support, strict input validation, layered rate limiting, and environment-aware security headers. Supabase underpins identity and audit capabilities, while Redis ensures scalable session persistence. The project reference middleware enables workspace isolation. Together, these components deliver a secure, maintainable, and extensible foundation for multi-role access control.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Authentication Flow Diagrams

#### Admin Login and 2FA Flow
```mermaid
sequenceDiagram
participant Client as "Client"
participant Ctrl as "Auth Controller"
participant Svc as "Session Service"
participant DB as "Supabase"
participant JWT as "JWT"
Client->>Ctrl : POST /auth/login {email,password}
Ctrl->>DB : Find user by email
DB-->>Ctrl : User
Ctrl->>Ctrl : Verify password
alt TOTP enabled
Ctrl->>JWT : sign {type : 'pre_auth', step : 'totp'} (5m)
Ctrl-->>Client : {requiresTwoFactor, preAuthToken}
else TOTP disabled
Ctrl->>Svc : createAdminSession(...)
Ctrl-->>Client : Set admin_session cookie
end
Client->>Ctrl : POST /auth/2fa/login {sessionToken, totpToken}
Ctrl->>JWT : verify sessionToken
Ctrl->>DB : Load user by ID
DB-->>Ctrl : User with totp_secret
Ctrl->>Ctrl : verify TOTP token
alt Valid
Ctrl->>Svc : createAdminSession(...)
Ctrl-->>Client : Set admin_session cookie
else Invalid
Ctrl-->>Client : 400 error
end
```

**Diagram sources**
- [auth.controller.js:26-63](file://apps/server/controllers/auth.controller.js#L26-L63)
- [auth.controller.js:279-313](file://apps/server/controllers/auth.controller.js#L279-L313)

#### Customer OTP Flow
```mermaid
sequenceDiagram
participant Client as "Client"
participant Ctrl as "Auth Controller"
participant Svc as "Session Service"
participant SMS as "SMS Service"
participant DB as "Supabase"
Client->>Ctrl : POST /auth/otp/send {phone, projectRef}
Ctrl->>Svc : checkOTPRateLimit(phone)
alt Allowed
Ctrl->>Svc : setOTP(phone, code)
Ctrl->>SMS : sendSMS(code)
Ctrl-->>Client : {ok : true}
else Blocked
Ctrl-->>Client : 429 Too many requests
end
Client->>Ctrl : POST /auth/otp/verify {phone, code, projectRef, name?, email?}
Ctrl->>Svc : getOTP(phone)
alt Expired/NotFound
Ctrl-->>Client : 400 OTP expired
else Attempts >= max
Ctrl->>Svc : deleteOTP(phone)
Ctrl-->>Client : 400 Too many attempts
else Correct
Ctrl->>Svc : deleteOTP(phone)
Ctrl->>DB : findOrCreate customer
DB-->>Ctrl : customer
Ctrl->>Svc : createCustomerSession(...)
Ctrl-->>Client : Set customer_session cookie
end
```

**Diagram sources**
- [auth.controller.js:144-214](file://apps/server/controllers/auth.controller.js#L144-L214)
- [session.service.js:85-92](file://apps/server/services/session.service.js#L85-L92)

#### Session Lifecycle Management
```mermaid
flowchart TD
Create["createAdminSession/createCustomerSession"] --> Store["Store session by sessionId"]
Store --> Cookie["Set HTTP-only cookie (admin_session/customer_session)"]
Cookie --> Use["parseSession reads cookie/JWT"]
Use --> Guard["requireAdmin/requireCustomer/requireRole"]
Guard --> UseResource["Authorized resource access"]
UseResource --> Delete["logout/deleteCustomerSession"]
Delete --> Clear["Clear cookie and delete session key"]
```

**Diagram sources**
- [session.service.js:28-62](file://apps/server/services/session.service.js#L28-L62)
- [auth.controller.js:65-75](file://apps/server/controllers/auth.controller.js#L65-L75)
- [auth.controller.js:222-232](file://apps/server/controllers/auth.controller.js#L222-L232)
- [auth.middleware.js:11-51](file://apps/server/middleware/auth.middleware.js#L11-L51)