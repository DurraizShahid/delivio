# Vendor Application

<cite>
**Referenced Files in This Document**
- [apps/vendor-mobile/src/app/_layout.tsx](file://apps/vendor-mobile/src/app/_layout.tsx)
- [apps/vendor-mobile/src/app/(tabs)/_layout.tsx](file://apps/vendor-mobile/src/app/(tabs)/_layout.tsx)
- [apps/vendor-mobile/src/app/(tabs)/index.tsx](file://apps/vendor-mobile/src/app/(tabs)/index.tsx)
- [apps/vendor-mobile/src/app/order/[id].tsx](file://apps/vendor-mobile/src/app/order/[id].tsx)
- [apps/vendor-mobile/src/app/(tabs)/menu.tsx](file://apps/vendor-mobile/src/app/(tabs)/menu.tsx)
- [apps/vendor-mobile/src/app/product/[id].tsx](file://apps/vendor-mobile/src/app/product/[id].tsx)
- [apps/vendor-mobile/src/app/product/new.tsx](file://apps/vendor-mobile/src/app/product/new.tsx)
- [apps/vendor-mobile/src/app/(tabs)/settings.tsx](file://apps/vendor-mobile/src/app/(tabs)/settings.tsx)
- [apps/vendor-mobile/src/app/(tabs)/chat.tsx](file://apps/vendor-mobile/src/app/(tabs)/chat.tsx)
- [apps/vendor-mobile/src/lib/api.ts](file://apps/vendor-mobile/src/lib/api.ts)
- [apps/vendor-mobile/src/stores/auth-store.ts](file://apps/vendor-mobile/src/stores/auth-store.ts)
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
This document describes the vendor/mobile application for managing restaurant operations on the Delivio platform. It covers the restaurant management interface, order queue monitoring, preparation workflow, menu catalog management, pricing configuration, vendor settings, workspace configuration, real-time order notifications, rider coordination, and customer interaction features. The guide also outlines practical vendor workflows and best practices for efficient daily operations.

## Project Structure
The vendor/mobile app is built as an Expo Router-based React Native application. It organizes screens under tabbed navigation and integrates with a shared API client and WebSocket client for real-time updates. Authentication state is managed via a Zustand store, and the UI follows a consistent theming system.

```mermaid
graph TB
subgraph "App Shell"
L["Root Layout<br/>_layout.tsx"]
T["Tab Layout<br/>(tabs)/_layout.tsx"]
end
subgraph "Main Tabs"
ORD["Orders Dashboard<br/>(tabs)/index.tsx"]
MENU["Menu Catalog<br/>(tabs)/menu.tsx"]
CHAT["Chats<br/>(tabs)/chat.tsx"]
SET["Settings<br/>(tabs)/settings.tsx"]
end
subgraph "Order Details"
ODET["Order Detail<br/>order/[id].tsx"]
end
subgraph "Catalog Management"
PNEW["New Product<br/>product/new.tsx"]
PEDT["Edit Product<br/>product/[id].tsx"]
end
subgraph "Integration"
API["API Client<br/>lib/api.ts"]
AUTH["Auth Store<br/>stores/auth-store.ts"]
end
L --> T
T --> ORD
T --> MENU
T --> CHAT
T --> SET
ORD --> ODET
MENU --> PNEW
MENU --> PEDT
ORD --> API
ODET --> API
MENU --> API
PNEW --> API
PEDT --> API
CHAT --> API
SET --> API
L --> AUTH
```

**Diagram sources**
- [apps/vendor-mobile/src/app/_layout.tsx:11-36](file://apps/vendor-mobile/src/app/_layout.tsx#L11-L36)
- [apps/vendor-mobile/src/app/(tabs)/_layout.tsx](file://apps/vendor-mobile/src/app/(tabs)/_layout.tsx#L5-L51)
- [apps/vendor-mobile/src/app/(tabs)/index.tsx](file://apps/vendor-mobile/src/app/(tabs)/index.tsx#L81-L85)
- [apps/vendor-mobile/src/app/order/[id].tsx](file://apps/vendor-mobile/src/app/order/[id].tsx#L87-L91)
- [apps/vendor-mobile/src/app/(tabs)/menu.tsx](file://apps/vendor-mobile/src/app/(tabs)/menu.tsx#L28-L38)
- [apps/vendor-mobile/src/app/product/new.tsx:42-64](file://apps/vendor-mobile/src/app/product/new.tsx#L42-L64)
- [apps/vendor-mobile/src/app/product/[id].tsx](file://apps/vendor-mobile/src/app/product/[id].tsx#L63-L85)
- [apps/vendor-mobile/src/app/(tabs)/chat.tsx](file://apps/vendor-mobile/src/app/(tabs)/chat.tsx#L25-L29)
- [apps/vendor-mobile/src/app/(tabs)/settings.tsx](file://apps/vendor-mobile/src/app/(tabs)/settings.tsx#L38-L41)
- [apps/vendor-mobile/src/lib/api.ts:1-12](file://apps/vendor-mobile/src/lib/api.ts#L1-L12)
- [apps/vendor-mobile/src/stores/auth-store.ts:15-42](file://apps/vendor-mobile/src/stores/auth-store.ts#L15-L42)

**Section sources**
- [apps/vendor-mobile/src/app/_layout.tsx:11-36](file://apps/vendor-mobile/src/app/_layout.tsx#L11-L36)
- [apps/vendor-mobile/src/app/(tabs)/_layout.tsx](file://apps/vendor-mobile/src/app/(tabs)/_layout.tsx#L5-L51)
- [apps/vendor-mobile/src/lib/api.ts:1-12](file://apps/vendor-mobile/src/lib/api.ts#L1-L12)
- [apps/vendor-mobile/src/stores/auth-store.ts:15-42](file://apps/vendor-mobile/src/stores/auth-store.ts#L15-L42)

## Core Components
- Authentication and routing: Root layout handles hydration, redirects, and global providers; tab layout defines the main navigation.
- Orders dashboard: Lists incoming orders, supports acceptance/rejection, preparation start, readiness marking, and SLA extension.
- Order detail: Full order view with actions, SLA countdown, delivery info, and rider assignment controls.
- Menu catalog: Browse, filter by categories, toggle availability, and navigate to edit/create flows.
- Product management: Create/edit product details, pricing, category, image URL, description, and availability.
- Settings: Configure auto-accept, default prep time, delivery mode, delivery radius, auto-dispatch delay, and logout.
- Chat: List conversations with customers and riders, navigate to chat UI.
- API/WebSocket: Centralized clients for HTTP and real-time updates.
- Auth store: Persistent session hydration and logout.

**Section sources**
- [apps/vendor-mobile/src/app/_layout.tsx:11-36](file://apps/vendor-mobile/src/app/_layout.tsx#L11-L36)
- [apps/vendor-mobile/src/app/(tabs)/_layout.tsx](file://apps/vendor-mobile/src/app/(tabs)/_layout.tsx#L5-L51)
- [apps/vendor-mobile/src/app/(tabs)/index.tsx](file://apps/vendor-mobile/src/app/(tabs)/index.tsx#L81-L123)
- [apps/vendor-mobile/src/app/order/[id].tsx](file://apps/vendor-mobile/src/app/order/[id].tsx#L87-L163)
- [apps/vendor-mobile/src/app/(tabs)/menu.tsx](file://apps/vendor-mobile/src/app/(tabs)/menu.tsx#L28-L48)
- [apps/vendor-mobile/src/app/product/[id].tsx](file://apps/vendor-mobile/src/app/product/[id].tsx#L63-L101)
- [apps/vendor-mobile/src/app/product/new.tsx:42-64](file://apps/vendor-mobile/src/app/product/new.tsx#L42-L64)
- [apps/vendor-mobile/src/app/(tabs)/settings.tsx](file://apps/vendor-mobile/src/app/(tabs)/settings.tsx#L38-L81)
- [apps/vendor-mobile/src/app/(tabs)/chat.tsx](file://apps/vendor-mobile/src/app/(tabs)/chat.tsx#L25-L61)
- [apps/vendor-mobile/src/lib/api.ts:1-12](file://apps/vendor-mobile/src/lib/api.ts#L1-L12)
- [apps/vendor-mobile/src/stores/auth-store.ts:15-42](file://apps/vendor-mobile/src/stores/auth-store.ts#L15-L42)

## Architecture Overview
The vendor/mobile app uses a modular, screen-based architecture with:
- Navigation: Expo Router with stack and tabs.
- State: React Query for caching and optimistic updates; Zustand for auth.
- Real-time: WebSocket client for live order status updates.
- Backend: Shared API client configured per environment.

```mermaid
sequenceDiagram
participant U as "Vendor User"
participant UI as "Vendor Mobile UI"
participant R as "Expo Router"
participant Q as "React Query"
participant S as "WebSocket Client"
participant B as "Backend API"
U->>UI : Open app
UI->>R : Navigate to tabbed layout
R-->>UI : Render Orders tab
UI->>Q : Fetch orders (polling)
Q->>B : GET /orders
B-->>Q : Orders list
Q-->>UI : Orders data
UI->>S : Connect and subscribe to "order : status_changed"
S-->>UI : Real-time event
UI->>Q : Invalidate orders cache
Q->>B : Refetch orders
B-->>Q : Updated orders
Q-->>UI : Re-render with latest status
```

**Diagram sources**
- [apps/vendor-mobile/src/app/_layout.tsx:30-35](file://apps/vendor-mobile/src/app/_layout.tsx#L30-L35)
- [apps/vendor-mobile/src/app/(tabs)/index.tsx](file://apps/vendor-mobile/src/app/(tabs)/index.tsx#L81-L123)
- [apps/vendor-mobile/src/lib/api.ts:10-11](file://apps/vendor-mobile/src/lib/api.ts#L10-L11)

**Section sources**
- [apps/vendor-mobile/src/app/_layout.tsx:30-35](file://apps/vendor-mobile/src/app/_layout.tsx#L30-L35)
- [apps/vendor-mobile/src/app/(tabs)/index.tsx](file://apps/vendor-mobile/src/app/(tabs)/index.tsx#L81-L123)
- [apps/vendor-mobile/src/lib/api.ts:10-11](file://apps/vendor-mobile/src/lib/api.ts#L10-L11)

## Detailed Component Analysis

### Orders Dashboard
The Orders Dashboard displays incoming orders, shows status badges, and enables quick actions:
- Accept order with prep time
- Reject order with optional reason
- Start preparing
- Mark ready
- View SLA countdown and breach indicator
- Real-time updates via WebSocket subscription

```mermaid
sequenceDiagram
participant UI as "Orders Dashboard"
participant Q as "React Query"
participant B as "Backend API"
participant W as "WebSocket"
UI->>Q : useQuery(["vendor-orders"])
Q->>B : GET /orders
B-->>Q : Orders[]
Q-->>UI : Render list
UI->>W : Subscribe "order : status_changed"
W-->>UI : Event
UI->>Q : Invalidate ["vendor-orders"]
Q->>B : Refetch orders
B-->>Q : Orders[]
Q-->>UI : Re-render
```

**Diagram sources**
- [apps/vendor-mobile/src/app/(tabs)/index.tsx](file://apps/vendor-mobile/src/app/(tabs)/index.tsx#L81-L123)

**Section sources**
- [apps/vendor-mobile/src/app/(tabs)/index.tsx](file://apps/vendor-mobile/src/app/(tabs)/index.tsx#L22-L123)

### Order Detail Screen
The Order Detail Screen provides granular control:
- Accept/Reject with prep time or reason
- Start Preparing and Mark Ready
- Extend SLA deadline
- Assign or reassign rider
- Assign external rider (vendor-mode)
- Real-time updates for single order

```mermaid
sequenceDiagram
participant UI as "Order Detail"
participant Q as "React Query"
participant B as "Backend API"
participant W as "WebSocket"
UI->>Q : useQuery(["vendor-order", id])
Q->>B : GET /orders/ : id
B-->>Q : Order
Q-->>UI : Render order details
UI->>W : Subscribe "order : status_changed" for orderId
W-->>UI : Event for this order
UI->>Q : Invalidate ["vendor-order", id]
Q->>B : Refetch order
B-->>Q : Order
Q-->>UI : Update UI
```

**Diagram sources**
- [apps/vendor-mobile/src/app/order/[id].tsx](file://apps/vendor-mobile/src/app/order/[id].tsx#L87-L163)

**Section sources**
- [apps/vendor-mobile/src/app/order/[id].tsx](file://apps/vendor-mobile/src/app/order/[id].tsx#L73-L163)

### Menu Catalog Management
The Menu screen lists products, toggles availability, and navigates to editing or creation:
- Fetch categories and products
- Toggle availability via mutation
- Navigate to edit or create product screens

```mermaid
flowchart TD
Start(["Open Menu"]) --> LoadCats["Load Categories"]
LoadCats --> LoadProds["Load Products"]
LoadProds --> Render["Render Product List"]
Render --> Toggle{"Toggle Available?"}
Toggle --> |Yes/No| Update["Update Product Availability"]
Update --> Invalidate["Invalidate Queries"]
Invalidate --> Reload["Re-render List"]
Render --> Edit["Edit Product"]
Render --> New["New Product"]
```

**Diagram sources**
- [apps/vendor-mobile/src/app/(tabs)/menu.tsx](file://apps/vendor-mobile/src/app/(tabs)/menu.tsx#L28-L48)

**Section sources**
- [apps/vendor-mobile/src/app/(tabs)/menu.tsx](file://apps/vendor-mobile/src/app/(tabs)/menu.tsx#L23-L120)

### Product Management (Edit and New)
Both screens share a similar form with validation:
- Name, price (cents), category, image URL, description, availability
- Validation for URL format and numeric price
- Save and delete operations with optimistic updates and error alerts

```mermaid
flowchart TD
Start(["Open Product Form"]) --> Fields["Fill Fields"]
Fields --> Validate{"Valid?"}
Validate --> |No| ShowErrors["Show Validation Errors"]
Validate --> |Yes| Submit["Submit Mutation"]
Submit --> Success["Invalidate Cache & Navigate Back"]
Submit --> Error["Alert Error Message"]
```

**Diagram sources**
- [apps/vendor-mobile/src/app/product/[id].tsx](file://apps/vendor-mobile/src/app/product/[id].tsx#L63-L101)
- [apps/vendor-mobile/src/app/product/new.tsx:42-64](file://apps/vendor-mobile/src/app/product/new.tsx#L42-L64)

**Section sources**
- [apps/vendor-mobile/src/app/product/[id].tsx](file://apps/vendor-mobile/src/app/product/[id].tsx#L20-L101)
- [apps/vendor-mobile/src/app/product/new.tsx:20-64](file://apps/vendor-mobile/src/app/product/new.tsx#L20-L64)

### Vendor Settings
Settings allow configuring operational preferences:
- Auto-accept orders
- Default prep time (minutes)
- Delivery mode (third party or vendor rider)
- Delivery radius (km)
- Auto-dispatch delay (minutes)
- Logout flow with confirmation

```mermaid
flowchart TD
Open(["Open Settings"]) --> Load["Load Current Settings"]
Load --> Change["Change Values"]
Change --> Validate{"Validate Inputs"}
Validate --> |Invalid| Alert["Show Alert"]
Validate --> |Valid| Save["Update Settings"]
Save --> Success["Invalidate Cache & Alert Saved"]
Save --> Failure["Alert Error"]
Load --> Logout["Logout"]
```

**Diagram sources**
- [apps/vendor-mobile/src/app/(tabs)/settings.tsx](file://apps/vendor-mobile/src/app/(tabs)/settings.tsx#L38-L81)

**Section sources**
- [apps/vendor-mobile/src/app/(tabs)/settings.tsx](file://apps/vendor-mobile/src/app/(tabs)/settings.tsx#L26-L238)

### Chat Interface
The Chat list shows conversations with customers and riders and allows navigation to chat sessions.

```mermaid
sequenceDiagram
participant UI as "Chat List"
participant Q as "React Query"
participant B as "Backend API"
UI->>Q : useQuery(["vendor-conversations"])
Q->>B : GET /chat/conversations
B-->>Q : Conversations[]
Q-->>UI : Render list
```

**Diagram sources**
- [apps/vendor-mobile/src/app/(tabs)/chat.tsx](file://apps/vendor-mobile/src/app/(tabs)/chat.tsx#L25-L29)

**Section sources**
- [apps/vendor-mobile/src/app/(tabs)/chat.tsx](file://apps/vendor-mobile/src/app/(tabs)/chat.tsx#L22-L81)

### Authentication and Routing
The root layout hydrates the session, enforces authentication, and sets up global providers. The auth store persists and clears session tokens.

```mermaid
sequenceDiagram
participant App as "Root Layout"
participant Auth as "Auth Store"
participant API as "Backend API"
App->>Auth : hydrate()
Auth->>API : GET /admin/session
API-->>Auth : Session { user }
Auth-->>App : Set isAuthenticated + user
App->>App : Redirect if unauthenticated or authenticated
```

**Diagram sources**
- [apps/vendor-mobile/src/app/_layout.tsx:16-28](file://apps/vendor-mobile/src/app/_layout.tsx#L16-L28)
- [apps/vendor-mobile/src/stores/auth-store.ts:20-31](file://apps/vendor-mobile/src/stores/auth-store.ts#L20-L31)

**Section sources**
- [apps/vendor-mobile/src/app/_layout.tsx:11-36](file://apps/vendor-mobile/src/app/_layout.tsx#L11-L36)
- [apps/vendor-mobile/src/stores/auth-store.ts:15-42](file://apps/vendor-mobile/src/stores/auth-store.ts#L15-L42)

## Dependency Analysis
- Navigation: Expo Router manages routes and transitions.
- State: React Query caches and invalidates data; Zustand holds auth state.
- Real-time: WebSocket client listens for order events and refreshes UI.
- API: Centralized client abstracts HTTP and WebSocket endpoints.
- Theming: Shared theme constants drive consistent UI.

```mermaid
graph LR
Router["Expo Router"] --> Orders["Orders Dashboard"]
Router --> OrderDetail["Order Detail"]
Router --> Menu["Menu"]
Router --> ProductEdit["Edit Product"]
Router --> ProductNew["New Product"]
Router --> Settings["Settings"]
Router --> Chat["Chat"]
Orders --> Query["React Query"]
OrderDetail --> Query
Menu --> Query
ProductEdit --> Query
ProductNew --> Query
Settings --> Query
Chat --> Query
Orders --> WS["WebSocket Client"]
OrderDetail --> WS
Chat --> WS
Orders --> API["API Client"]
OrderDetail --> API
Menu --> API
ProductEdit --> API
ProductNew --> API
Settings --> API
Chat --> API
Auth["Auth Store"] --> API
```

**Diagram sources**
- [apps/vendor-mobile/src/app/(tabs)/index.tsx](file://apps/vendor-mobile/src/app/(tabs)/index.tsx#L81-L123)
- [apps/vendor-mobile/src/app/order/[id].tsx](file://apps/vendor-mobile/src/app/order/[id].tsx#L87-L163)
- [apps/vendor-mobile/src/app/(tabs)/menu.tsx](file://apps/vendor-mobile/src/app/(tabs)/menu.tsx#L28-L38)
- [apps/vendor-mobile/src/app/product/[id].tsx](file://apps/vendor-mobile/src/app/product/[id].tsx#L63-L85)
- [apps/vendor-mobile/src/app/product/new.tsx:42-64](file://apps/vendor-mobile/src/app/product/new.tsx#L42-L64)
- [apps/vendor-mobile/src/app/(tabs)/settings.tsx](file://apps/vendor-mobile/src/app/(tabs)/settings.tsx#L38-L57)
- [apps/vendor-mobile/src/app/(tabs)/chat.tsx](file://apps/vendor-mobile/src/app/(tabs)/chat.tsx#L25-L29)
- [apps/vendor-mobile/src/lib/api.ts:10-11](file://apps/vendor-mobile/src/lib/api.ts#L10-L11)
- [apps/vendor-mobile/src/stores/auth-store.ts:15-42](file://apps/vendor-mobile/src/stores/auth-store.ts#L15-L42)

**Section sources**
- [apps/vendor-mobile/src/app/(tabs)/index.tsx](file://apps/vendor-mobile/src/app/(tabs)/index.tsx#L81-L123)
- [apps/vendor-mobile/src/app/order/[id].tsx](file://apps/vendor-mobile/src/app/order/[id].tsx#L87-L163)
- [apps/vendor-mobile/src/app/(tabs)/menu.tsx](file://apps/vendor-mobile/src/app/(tabs)/menu.tsx#L28-L38)
- [apps/vendor-mobile/src/app/product/[id].tsx](file://apps/vendor-mobile/src/app/product/[id].tsx#L63-L85)
- [apps/vendor-mobile/src/app/product/new.tsx:42-64](file://apps/vendor-mobile/src/app/product/new.tsx#L42-L64)
- [apps/vendor-mobile/src/app/(tabs)/settings.tsx](file://apps/vendor-mobile/src/app/(tabs)/settings.tsx#L38-L57)
- [apps/vendor-mobile/src/app/(tabs)/chat.tsx](file://apps/vendor-mobile/src/app/(tabs)/chat.tsx#L25-L29)
- [apps/vendor-mobile/src/lib/api.ts:10-11](file://apps/vendor-mobile/src/lib/api.ts#L10-L11)
- [apps/vendor-mobile/src/stores/auth-store.ts:15-42](file://apps/vendor-mobile/src/stores/auth-store.ts#L15-L42)

## Performance Considerations
- Polling intervals: Orders dashboard polls every 15 seconds; adjust based on load.
- Query invalidation: Use targeted invalidation keys to minimize unnecessary refetches.
- Network efficiency: Group related queries (e.g., categories and products) to avoid redundant requests.
- Real-time updates: WebSocket subscriptions reduce polling overhead for critical updates.
- Image URLs: Validate and sanitize to prevent rendering errors and improve UX.
- Input validation: Enforce numeric ranges for prep time and delivery radius to avoid backend errors.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and resolutions:
- Authentication failures: Ensure session hydration completes; check network connectivity and backend availability.
- Orders not updating: Verify WebSocket connection and subscription; confirm event payload includes the correct order ID.
- Product save errors: Validate price is numeric and image URL is a valid http(s) URL; review error alerts for specific messages.
- Settings not saving: Confirm inputs are within allowed ranges; check for pending mutations blocking submission.
- Chat list empty: Ensure conversations exist and polling interval is sufficient.

**Section sources**
- [apps/vendor-mobile/src/stores/auth-store.ts:20-31](file://apps/vendor-mobile/src/stores/auth-store.ts#L20-L31)
- [apps/vendor-mobile/src/app/(tabs)/index.tsx](file://apps/vendor-mobile/src/app/(tabs)/index.tsx#L115-L123)
- [apps/vendor-mobile/src/app/product/[id].tsx](file://apps/vendor-mobile/src/app/product/[id].tsx#L78-L84)
- [apps/vendor-mobile/src/app/(tabs)/settings.tsx](file://apps/vendor-mobile/src/app/(tabs)/settings.tsx#L69-L81)
- [apps/vendor-mobile/src/app/(tabs)/chat.tsx](file://apps/vendor-mobile/src/app/(tabs)/chat.tsx#L25-L29)

## Conclusion
The vendor/mobile application provides a comprehensive toolkit for restaurant operators to monitor orders, manage menus, configure operational settings, coordinate riders, and communicate with customers. Its real-time capabilities, structured navigation, and robust state management enable efficient daily workflows while maintaining a consistent and responsive user experience.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Example Vendor Workflows
- Accepting an order:
  - Navigate to Orders tab.
  - Tap Accept on a placed order.
  - Enter prep time (validated 1–120 minutes).
  - Confirm; the order transitions to accepted and starts SLA countdown.
- Starting preparation:
  - From the order detail, tap Start Preparing.
  - The order moves to preparing; riders can be assigned if applicable.
- Marking ready:
  - From the order detail, tap Mark Ready when food is prepared.
  - The order moves to ready; customer receives updates.
- Extending SLA:
  - While accepted/preparing, open Extend Time and specify additional minutes.
  - The SLA deadline is recalculated.
- Managing menu:
  - Go to Menu tab.
  - Toggle availability or edit product details.
  - Use the floating action button to add a new product.
- Configuring settings:
  - Open Settings tab.
  - Adjust auto-accept, default prep time, delivery mode, delivery radius, and auto-dispatch delay.
  - Save and verify changes take effect immediately.

[No sources needed since this section provides general guidance]