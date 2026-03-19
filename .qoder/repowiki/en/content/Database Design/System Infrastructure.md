# System Infrastructure

<cite>
**Referenced Files in This Document**
- [audit.js](file://apps/server/lib/audit.js)
- [geo.js](file://apps/server/lib/geo.js)
- [redis.js](file://apps/server/lib/redis.js)
- [supabase.js](file://apps/server/lib/supabase.js)
- [logger.js](file://apps/server/lib/logger.js)
- [index.js](file://apps/server/config/index.js)
- [007_audit_log.sql](file://apps/server/migrations/007_audit_log.sql)
- [008_indexes.sql](file://apps/server/migrations/008_indexes.sql)
- [000_core_schema.sql](file://apps/server/migrations/000_core_schema.sql)
- [003_rider_locations.sql](file://apps/server/migrations/003_rider_locations.sql)
- [005_conversations_messages.sql](file://apps/server/migrations/005_conversations_messages.sql)
- [location-flush.job.js](file://apps/server/jobs/location-flush.job.js)
- [radius-expansion.job.js](file://apps/server/jobs/radius-expansion.job.js)
- [memory-session-store.js](file://apps/server/services/memory-session-store.js)
- [redis-session-store.js](file://apps/server/services/redis-session-store.js)
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
This document describes the system infrastructure tables and utilities that underpin compliance, location-aware dispatch, caching, session management, logging, and operational observability. It focuses on:
- Audit Log table for compliance tracking, user actions, and system changes
- Geographic utilities for distance calculations and proximity-based dispatch
- Redis integration for caching, session management, and real-time data persistence
- Database indexing strategies and performance optimization patterns
- Monitoring, error tracking, and operational metrics storage
- Data retention policies, backup strategies, and system health monitoring capabilities

## Project Structure
The infrastructure spans several layers:
- Migrations define canonical database schemas and indexes
- Libraries encapsulate database access, logging, Redis connectivity, and geographic utilities
- Jobs orchestrate periodic tasks for location flushing and radius expansion
- Services implement session stores (memory and Redis-backed)
- Configuration centralizes environment-driven settings

```mermaid
graph TB
subgraph "Migrations"
M007["007_audit_log.sql"]
M008["008_indexes.sql"]
M000["000_core_schema.sql"]
M003["003_rider_locations.sql"]
M005["005_conversations_messages.sql"]
end
subgraph "Libraries"
LSupabase["supabase.js"]
LAudit["audit.js"]
LGeo["geo.js"]
LRedis["redis.js"]
LLogger["logger.js"]
end
subgraph "Jobs"
JFlush["location-flush.job.js"]
JRadius["radius-expansion.job.js"]
end
subgraph "Services"
SMemory["memory-session-store.js"]
SRedis["redis-session-store.js"]
end
subgraph "Config"
CIndex["config/index.js"]
end
M007 --> LSupabase
M008 --> LSupabase
M000 --> LSupabase
M003 --> LSupabase
M005 --> LSupabase
LAudit --> LSupabase
LGeo --> JRadius
LRedis --> JFlush
LRedis --> SRedis
SMemory -.-> SRedis
LLogger --> LAudit
LLogger --> LRedis
LLogger --> JFlush
LLogger --> JRadius
CIndex --> LRedis
CIndex --> LSupabase
CIndex --> SRedis
CIndex --> SMemory
```

**Diagram sources**
- [007_audit_log.sql:1-24](file://apps/server/migrations/007_audit_log.sql#L1-L24)
- [008_indexes.sql:1-10](file://apps/server/migrations/008_indexes.sql#L1-L10)
- [000_core_schema.sql:1-165](file://apps/server/migrations/000_core_schema.sql#L1-L165)
- [003_rider_locations.sql:1-23](file://apps/server/migrations/003_rider_locations.sql#L1-L23)
- [005_conversations_messages.sql:1-33](file://apps/server/migrations/005_conversations_messages.sql#L1-L33)
- [supabase.js:1-151](file://apps/server/lib/supabase.js#L1-L151)
- [audit.js:1-35](file://apps/server/lib/audit.js#L1-L35)
- [geo.js:1-15](file://apps/server/lib/geo.js#L1-L15)
- [redis.js:1-42](file://apps/server/lib/redis.js#L1-L42)
- [logger.js:1-36](file://apps/server/lib/logger.js#L1-L36)
- [location-flush.job.js:1-60](file://apps/server/jobs/location-flush.job.js#L1-L60)
- [radius-expansion.job.js:1-87](file://apps/server/jobs/radius-expansion.job.js#L1-L87)
- [memory-session-store.js:1-46](file://apps/server/services/memory-session-store.js#L1-L46)
- [redis-session-store.js:1-37](file://apps/server/services/redis-session-store.js#L1-L37)
- [index.js:1-117](file://apps/server/config/index.js#L1-L117)

**Section sources**
- [007_audit_log.sql:1-24](file://apps/server/migrations/007_audit_log.sql#L1-L24)
- [008_indexes.sql:1-10](file://apps/server/migrations/008_indexes.sql#L1-L10)
- [000_core_schema.sql:1-165](file://apps/server/migrations/000_core_schema.sql#L1-L165)
- [003_rider_locations.sql:1-23](file://apps/server/migrations/003_rider_locations.sql#L1-L23)
- [005_conversations_messages.sql:1-33](file://apps/server/migrations/005_conversations_messages.sql#L1-L33)
- [supabase.js:1-151](file://apps/server/lib/supabase.js#L1-L151)
- [audit.js:1-35](file://apps/server/lib/audit.js#L1-L35)
- [geo.js:1-15](file://apps/server/lib/geo.js#L1-L15)
- [redis.js:1-42](file://apps/server/lib/redis.js#L1-L42)
- [logger.js:1-36](file://apps/server/lib/logger.js#L1-L36)
- [location-flush.job.js:1-60](file://apps/server/jobs/location-flush.job.js#L1-L60)
- [radius-expansion.job.js:1-87](file://apps/server/jobs/radius-expansion.job.js#L1-L87)
- [memory-session-store.js:1-46](file://apps/server/services/memory-session-store.js#L1-L46)
- [redis-session-store.js:1-37](file://apps/server/services/redis-session-store.js#L1-L37)
- [index.js:1-117](file://apps/server/config/index.js#L1-L117)

## Core Components
- Audit logging: Non-blocking write to audit_log with user context, action, resource, and details.
- Geographic utilities: Haversine distance calculation for proximity checks.
- Redis integration: Lazy client initialization with retry/backoff, event logging, and session stores.
- Database access: Centralized Supabase REST/Management API wrapper with safe query builders.
- Logging: Structured Winston logger with console transport and environment-aware formatting.
- Background jobs: Location flushing and radius expansion with distributed locking and rate limiting.

**Section sources**
- [audit.js:1-35](file://apps/server/lib/audit.js#L1-L35)
- [geo.js:1-15](file://apps/server/lib/geo.js#L1-L15)
- [redis.js:1-42](file://apps/server/lib/redis.js#L1-L42)
- [supabase.js:1-151](file://apps/server/lib/supabase.js#L1-L151)
- [logger.js:1-36](file://apps/server/lib/logger.js#L1-L36)
- [location-flush.job.js:1-60](file://apps/server/jobs/location-flush.job.js#L1-L60)
- [radius-expansion.job.js:1-87](file://apps/server/jobs/radius-expansion.job.js#L1-L87)

## Architecture Overview
The infrastructure integrates database migrations, a Supabase abstraction layer, Redis-backed caching and sessions, geographic utilities, and background jobs. The following diagram maps the major components and their interactions.

```mermaid
graph TB
Client["Client Apps<br/>Customer/Rider/Vendor"]
API["API Server"]
Supa["Supabase Abstraction<br/>supabase.js"]
DB["PostgreSQL (via Supabase)"]
Redis["Redis"]
Logger["Winston Logger<br/>logger.js"]
Audit["Audit Writer<br/>audit.js"]
Geo["Geographic Utils<br/>geo.js"]
Jobs["Background Jobs<br/>location-flush.job.js<br/>radius-expansion.job.js"]
Sessions["Session Stores<br/>memory-session-store.js<br/>redis-session-store.js"]
Client --> API
API --> Supa
Supa --> DB
API --> Redis
Redis --> Jobs
API --> Audit
API --> Geo
API --> Sessions
Audit --> Supa
Jobs --> Redis
Jobs --> Supa
Logger --> API
Logger --> Redis
Logger --> Jobs
```

**Diagram sources**
- [supabase.js:1-151](file://apps/server/lib/supabase.js#L1-L151)
- [audit.js:1-35](file://apps/server/lib/audit.js#L1-L35)
- [geo.js:1-15](file://apps/server/lib/geo.js#L1-L15)
- [redis.js:1-42](file://apps/server/lib/redis.js#L1-L42)
- [logger.js:1-36](file://apps/server/lib/logger.js#L1-L36)
- [location-flush.job.js:1-60](file://apps/server/jobs/location-flush.job.js#L1-L60)
- [radius-expansion.job.js:1-87](file://apps/server/jobs/radius-expansion.job.js#L1-L87)
- [memory-session-store.js:1-46](file://apps/server/services/memory-session-store.js#L1-L46)
- [redis-session-store.js:1-37](file://apps/server/services/redis-session-store.js#L1-L37)

## Detailed Component Analysis

### Audit Log Data Model and Utilities
- Data model: audit_log captures user identity, action, resource context, IP, and structured details with timestamps.
- Indexing: Composite and time-based indexes optimize filtering and chronological queries.
- Audit writer: Non-blocking insertion with JSON serialization of details and robust error logging.

```mermaid
erDiagram
AUDIT_LOG {
uuid id PK
uuid user_id
text action
text resource_type
uuid resource_id
jsonb details
inet ip
timestamptz created_at
}
```

**Diagram sources**
- [007_audit_log.sql:4-13](file://apps/server/migrations/007_audit_log.sql#L4-L13)

```mermaid
sequenceDiagram
participant Service as "Business Service"
participant Audit as "audit.js"
participant Supa as "supabase.js"
participant DB as "PostgreSQL"
Service->>Audit : writeAuditLog(entry)
Audit->>Audit : serialize details (if any)
Audit->>Supa : insert("audit_log", row)
Supa->>DB : POST /rest/v1/audit_log
DB-->>Supa : 201 Created
Supa-->>Audit : result
Audit-->>Service : resolved (never throws)
Audit->>Audit : on error, log via logger
```

**Diagram sources**
- [audit.js:18-32](file://apps/server/lib/audit.js#L18-L32)
- [supabase.js:122-127](file://apps/server/lib/supabase.js#L122-L127)
- [logger.js:1-36](file://apps/server/lib/logger.js#L1-L36)

Operational notes:
- Compliance: Timestamped entries with user context enable audit trails for regulatory reporting.
- Resilience: The writer swallows errors to prevent audit failures from breaking business logic.
- Query patterns: Indexes support filtering by user, action, resource, and time range.

**Section sources**
- [007_audit_log.sql:1-24](file://apps/server/migrations/007_audit_log.sql#L1-L24)
- [audit.js:1-35](file://apps/server/lib/audit.js#L1-L35)
- [supabase.js:1-151](file://apps/server/lib/supabase.js#L1-L151)
- [logger.js:1-36](file://apps/server/lib/logger.js#L1-L36)

### Geographic Utilities and Proximity-Based Dispatch
- Distance calculation: Haversine formula computes kilometers between two lat/lon pairs.
- Dispatch expansion: Periodic job expands search radius for stale pending deliveries and notifies nearby riders.

```mermaid
flowchart TD
Start(["Stale Delivery Detection"]) --> Fetch["Fetch pending deliveries older than threshold"]
Fetch --> Settings["Load vendor/admin settings<br/>max radius, step size"]
Settings --> Radius["Compute next radius:<br/>min(current + step, max)"]
Radius --> Cache["Cache delivery search radius"]
Cache --> Workspace["Resolve workspace coordinates"]
Workspace --> Riders["List online riders in project"]
Riders --> Dist["For each rider:<br/>haversine distance to workspace"]
Dist --> Within{"Within new radius?"}
Within --> |Yes| Notify["Send 'delivery:request' via WebSocket"]
Within --> |No| Skip["Skip rider"]
Notify --> Next["Next rider"]
Skip --> Next
Next --> Done(["Done"])
```

**Diagram sources**
- [radius-expansion.job.js:13-84](file://apps/server/jobs/radius-expansion.job.js#L13-L84)
- [geo.js:3-11](file://apps/server/lib/geo.js#L3-L11)

Operational notes:
- Rate limiting: Job runs periodically with distributed locks to avoid concurrent execution.
- Real-time signals: WebSocket notifications are sent to eligible riders within the expanded radius.

**Section sources**
- [radius-expansion.job.js:1-87](file://apps/server/jobs/radius-expansion.job.js#L1-L87)
- [geo.js:1-15](file://apps/server/lib/geo.js#L1-L15)

### Redis Integration for Caching and Sessions
- Client initialization: Lazy connect with retry strategy and connection event logging.
- Session stores:
  - Memory store: Development fallback with TTL pruning.
  - Redis store: Production-grade store with JSON serialization and TTL support.
- Location flushing: Background job reads cached rider positions from Redis and persists them to the audit table.

```mermaid
classDiagram
class RedisClient {
+connect()
+on(event, handler)
+get(key)
+setex(key, ttl, value)
+del(key)
+keys(pattern)
}
class MemorySessionStore {
+get(id)
+set(id, data, ttlSeconds)
+delete(id)
-_prune()
}
class RedisSessionStore {
+get(id)
+set(id, data, ttlSeconds)
+delete(id)
}
RedisSessionStore --> RedisClient : "uses"
```

**Diagram sources**
- [redis.js:8-39](file://apps/server/lib/redis.js#L8-L39)
- [memory-session-store.js:7-43](file://apps/server/services/memory-session-store.js#L7-L43)
- [redis-session-store.js:7-34](file://apps/server/services/redis-session-store.js#L7-L34)

```mermaid
sequenceDiagram
participant Scheduler as "location-flush.job.js"
participant Redis as "Redis"
participant Delivery as "delivery model"
participant Supa as "supabase.js"
participant DB as "PostgreSQL"
Scheduler->>Redis : keys("location : *")
Redis-->>Scheduler : matching keys
Scheduler->>Redis : get(key)
Redis-->>Scheduler : serialized location
Scheduler->>Delivery : findById(deliveryId)
Delivery-->>Scheduler : delivery record
Scheduler->>Delivery : logLocation(...)
Delivery->>Supa : insert("rider_locations", row)
Supa->>DB : POST /rest/v1/rider_locations
DB-->>Supa : 201 Created
Supa-->>Delivery : result
Delivery-->>Scheduler : done
```

**Diagram sources**
- [location-flush.job.js:13-57](file://apps/server/jobs/location-flush.job.js#L13-L57)
- [redis.js:8-39](file://apps/server/lib/redis.js#L8-L39)
- [supabase.js:122-127](file://apps/server/lib/supabase.js#L122-L127)
- [003_rider_locations.sql:4-13](file://apps/server/migrations/003_rider_locations.sql#L4-L13)

Operational notes:
- Fallback behavior: If Redis URL is missing, the system logs a warning and avoids session persistence.
- Reliability: Retry strategy and reconnect-on-error reduce transient failure impact.

**Section sources**
- [redis.js:1-42](file://apps/server/lib/redis.js#L1-L42)
- [memory-session-store.js:1-46](file://apps/server/services/memory-session-store.js#L1-L46)
- [redis-session-store.js:1-37](file://apps/server/services/redis-session-store.js#L1-L37)
- [location-flush.job.js:1-60](file://apps/server/jobs/location-flush.job.js#L1-L60)
- [003_rider_locations.sql:1-23](file://apps/server/migrations/003_rider_locations.sql#L1-L23)

### Database Access Layer and Indexing Strategies
- Supabase abstraction: Centralized fetch helper, safe filter builder, and convenience CRUD wrappers.
- Indexing strategy: Hot-path indexes on foreign keys, status, timestamps, and composite resource keys.
- Core schema: Canonical tables for users, customers, orders, deliveries, cart, and conversations.

```mermaid
erDiagram
APP_USERS {
uuid id PK
text email
text password_hash
text role
text project_ref
boolean totp_enabled
text totp_secret
timestamptz created_at
}
CUSTOMERS {
uuid id PK
text phone
text name
text email
text project_ref
timestamptz created_at
timestamptz updated_at
}
ORDERS {
uuid id PK
text project_ref
uuid customer_id FK
text status
text payment_status
text payment_intent_id
int total_cents
timestamptz scheduled_for
int refund_amount_cents
text refund_reason
text cancellation_reason
text cancelled_by
int prep_time_minutes
timestamptz sla_deadline
boolean sla_breached
text delivery_mode
text rejection_reason
timestamptz created_at
timestamptz updated_at
}
DELIVERIES {
uuid id PK
uuid order_id FK
uuid rider_id FK
text status
uuid zone_id
int eta_minutes
timestamptz claimed_at
timestamptz updated_at
text external_rider_name
text external_rider_phone
boolean is_external
timestamptz created_at
}
CART_SESSIONS {
uuid id PK
text project_ref
uuid customer_id FK
timestamptz created_at
}
CART_ITEMS {
uuid id PK
uuid session_id FK
uuid product_id
text name
int quantity
int unit_price_cents
timestamptz created_at
}
CONVERSATIONS {
uuid id PK
text project_ref
uuid order_id FK
text type
uuid participant_1_id
uuid participant_2_id
timestamptz created_at
timestamptz updated_at
}
MESSAGES {
uuid id PK
uuid conversation_id FK
uuid sender_id
text sender_role
text content
timestamptz read_at
timestamptz created_at
}
APP_USERS ||--o{ ORDERS : "references"
CUSTOMERS ||--o{ ORDERS : "references"
ORDERS ||--o{ DELIVERIES : "references"
CART_SESSIONS ||--o{ CART_ITEMS : "references"
ORDERS ||--o{ CONVERSATIONS : "references"
CONVERSATIONS ||--o{ MESSAGES : "references"
```

**Diagram sources**
- [000_core_schema.sql:9-165](file://apps/server/migrations/000_core_schema.sql#L9-L165)
- [005_conversations_messages.sql:4-33](file://apps/server/migrations/005_conversations_messages.sql#L4-L33)

```mermaid
flowchart TD
A["Query Builder"] --> B["Build filters string"]
B --> C["Construct URLSearchParams"]
C --> D["Call supabaseFetch(path, options)"]
D --> E{"Response OK?"}
E --> |Yes| F["Parse JSON and return"]
E --> |No| G["Log error and throw SupabaseError"]
```

**Diagram sources**
- [supabase.js:93-117](file://apps/server/lib/supabase.js#L93-L117)
- [supabase.js:26-63](file://apps/server/lib/supabase.js#L26-L63)

Performance considerations:
- Hot-path indexes: project_ref, customer_id, status, created_at DESC, session_id.
- Resource-scoped queries: Composite indexes on resource_type/resource_id for audit_log.

**Section sources**
- [supabase.js:1-151](file://apps/server/lib/supabase.js#L1-L151)
- [008_indexes.sql:1-10](file://apps/server/migrations/008_indexes.sql#L1-L10)
- [007_audit_log.sql:15-18](file://apps/server/migrations/007_audit_log.sql#L15-L18)
- [000_core_schema.sql:1-165](file://apps/server/migrations/000_core_schema.sql#L1-L165)
- [005_conversations_messages.sql:1-33](file://apps/server/migrations/005_conversations_messages.sql#L1-L33)

### System Monitoring, Error Tracking, and Operational Metrics
- Logging: Winston logger configured with console transport, environment-aware formatting, and structured metadata.
- Error handling: Supabase fetch logs detailed error context; audit writer logs failures without throwing.
- Health monitoring: Redis client emits connect/error/close events; jobs log info/warn/error.

```mermaid
sequenceDiagram
participant Comp as "Component"
participant Log as "logger.js"
participant Redis as "redis.js"
participant Job as "location-flush.job.js"
Comp->>Log : logger.error("message", meta)
Redis-->>Log : emit "error"
Job-->>Log : info/warn/error logs
```

**Diagram sources**
- [logger.js:24-33](file://apps/server/lib/logger.js#L24-L33)
- [redis.js:34-36](file://apps/server/lib/redis.js#L34-L36)
- [location-flush.job.js:49-50](file://apps/server/jobs/location-flush.job.js#L49-L50)

Operational notes:
- Structured logs enable correlation with traces and dashboards.
- Redis events surface connectivity issues proactively.

**Section sources**
- [logger.js:1-36](file://apps/server/lib/logger.js#L1-L36)
- [redis.js:1-42](file://apps/server/lib/redis.js#L1-L42)
- [location-flush.job.js:1-60](file://apps/server/jobs/location-flush.job.js#L1-L60)

## Dependency Analysis
The following diagram highlights key dependencies among infrastructure components.

```mermaid
graph LR
Config["config/index.js"] --> Redis["lib/redis.js"]
Config --> Supa["lib/supabase.js"]
Config --> Logger["lib/logger.js"]
Redis --> MemStore["services/memory-session-store.js"]
Redis --> RedStore["services/redis-session-store.js"]
Audit["lib/audit.js"] --> Supa
Geo["lib/geo.js"] --> RadiusJob["jobs/radius-expansion.job.js"]
FlushJob["jobs/location-flush.job.js"] --> Redis
FlushJob --> Supa
Supa --> DB["PostgreSQL"]
Logger --> Audit
Logger --> Redis
Logger --> FlushJob
Logger --> RadiusJob
```

**Diagram sources**
- [index.js:1-117](file://apps/server/config/index.js#L1-L117)
- [redis.js:1-42](file://apps/server/lib/redis.js#L1-L42)
- [supabase.js:1-151](file://apps/server/lib/supabase.js#L1-L151)
- [logger.js:1-36](file://apps/server/lib/logger.js#L1-L36)
- [memory-session-store.js:1-46](file://apps/server/services/memory-session-store.js#L1-L46)
- [redis-session-store.js:1-37](file://apps/server/services/redis-session-store.js#L1-L37)
- [audit.js:1-35](file://apps/server/lib/audit.js#L1-L35)
- [geo.js:1-15](file://apps/server/lib/geo.js#L1-L15)
- [location-flush.job.js:1-60](file://apps/server/jobs/location-flush.job.js#L1-L60)
- [radius-expansion.job.js:1-87](file://apps/server/jobs/radius-expansion.job.js#L1-L87)

**Section sources**
- [index.js:1-117](file://apps/server/config/index.js#L1-L117)
- [redis.js:1-42](file://apps/server/lib/redis.js#L1-L42)
- [supabase.js:1-151](file://apps/server/lib/supabase.js#L1-L151)
- [logger.js:1-36](file://apps/server/lib/logger.js#L1-L36)
- [memory-session-store.js:1-46](file://apps/server/services/memory-session-store.js#L1-L46)
- [redis-session-store.js:1-37](file://apps/server/services/redis-session-store.js#L1-L37)
- [audit.js:1-35](file://apps/server/lib/audit.js#L1-L35)
- [geo.js:1-15](file://apps/server/lib/geo.js#L1-L15)
- [location-flush.job.js:1-60](file://apps/server/jobs/location-flush.job.js#L1-L60)
- [radius-expansion.job.js:1-87](file://apps/server/jobs/radius-expansion.job.js#L1-L87)

## Performance Considerations
- Index coverage:
  - Orders: project_ref, customer_id, status, created_at DESC
  - Deliveries: order_id, rider_id
  - Cart items: session_id
  - Audit log: user_id, action, resource_type/resource_id, created_at DESC
- Query patterns:
  - Use indexed columns for filters and sorts (e.g., status, created_at)
  - Leverage composite indexes for resource-scoped queries
- Redis performance:
  - Use TTL for ephemeral caches (e.g., session data)
  - Batch operations where feasible (e.g., bulk flush in jobs)
- Geographic scaling:
  - Precompute and cache derived metrics (e.g., delivery search radius)
  - Limit per-iteration work in jobs to avoid contention

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and diagnostics:
- Redis connectivity:
  - Symptoms: Warning about missing REDIS_URL; session store falls back to memory
  - Actions: Set REDIS_URL; monitor Redis events (connect/error/close)
- Audit log failures:
  - Symptoms: Errors logged but no crash
  - Actions: Inspect logger output; verify Supabase service key and network
- Job contention:
  - Symptoms: Jobs skip execution due to locks
  - Actions: Verify distributed lock acquisition; adjust intervals if needed
- Supabase errors:
  - Symptoms: Detailed error logs with status/body
  - Actions: Review Supabase dashboard; validate service key permissions

**Section sources**
- [redis.js:11-14](file://apps/server/lib/redis.js#L11-L14)
- [redis.js:34-36](file://apps/server/lib/redis.js#L34-L36)
- [audit.js:29-31](file://apps/server/lib/audit.js#L29-L31)
- [logger.js:47-59](file://apps/server/lib/logger.js#L47-L59)
- [location-flush.job.js:18-19](file://apps/server/jobs/location-flush.job.js#L18-L19)

## Conclusion
The system infrastructure combines a canonical database schema, a robust Supabase abstraction, Redis-backed caching and sessions, geographic utilities, and resilient background jobs. Together, these components provide:
- Compliance-ready audit trails with timestamped entries and user context
- Scalable proximity-based dispatch with incremental radius expansion
- Reliable caching and session management with production-grade Redis
- Indexed queries optimized for hot-path operations
- Observability through structured logging and Redis event hooks

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Data Retention Policies
- Audit log retention: Define TTL or archival policy for audit_log rows to meet compliance requirements.
- Rider location history: Consider retention windows for rider_locations to balance SLA monitoring and storage costs.
- Chat messages: Apply project-level retention policies for conversations/messages.

[No sources needed since this section provides general guidance]

### Backup Strategies
- Database backups: Use managed PostgreSQL snapshot/backup features exposed by the hosting platform.
- Redis data: Enable persistence (AOF/RDB) or snapshotting depending on deployment; consider replication for HA.
- Application logs: Ship logs to centralized logging systems for long-term retention.

[No sources needed since this section provides general guidance]

### System Health Monitoring Capabilities
- Database: Monitor query latency, slow queries, and index usage via platform tools.
- Redis: Track connection counts, memory usage, command latency, and error rates.
- Jobs: Observe job runtime, success/failure rates, and lock contention.

[No sources needed since this section provides general guidance]