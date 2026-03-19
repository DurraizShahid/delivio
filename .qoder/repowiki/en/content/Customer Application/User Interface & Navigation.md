# User Interface & Navigation

<cite>
**Referenced Files in This Document**
- [layout.tsx](file://apps/customer/src/app/layout.tsx)
- [layout.tsx](file://apps/customer/src/app/(main)/layout.tsx)
- [globals.css](file://apps/customer/src/app/globals.css)
- [components.json](file://apps/customer/components.json)
- [query-provider.tsx](file://apps/customer/src/providers/query-provider.tsx)
- [toaster.tsx](file://apps/customer/src/providers/toaster.tsx)
- [auth-store.ts](file://apps/customer/src/stores/auth-store.ts)
- [cart-store.ts](file://apps/customer/src/stores/cart-store.ts)
- [utils.ts](file://apps/customer/src/lib/utils.ts)
- [use-products.ts](file://apps/customer/src/hooks/use-products.ts)
- [use-orders.ts](file://apps/customer/src/hooks/use-orders.ts)
- [use-chat.ts](file://apps/customer/src/hooks/use-chat.ts)
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

## Introduction
This document describes the customer application’s user interface and navigation system. It covers the main layout structure, global styling approach, component hierarchy, navigation patterns (including tab-based navigation and route handling), responsive design, and the UI component library usage. It also documents the header and footer components, the overall user experience flow, and provides examples of component composition, prop interfaces, and styling conventions.

## Project Structure
The customer application is a Next.js app that defines:
- A root layout that sets fonts, global CSS, providers, and toast notifications.
- A main layout that wraps page content with a sticky header, a scrollable main area, and a fixed tab bar at the bottom.
- Global styles using Tailwind, shadcn/ui, and a custom theme with CSS variables.
- Providers for data fetching (React Query), real-time updates (WebSocket), and toast notifications.
- Zustand stores for authentication and cart state.
- Shared utilities and hooks for API interactions and UI composition.

```mermaid
graph TB
RootLayout["Root Layout<br/>sets fonts, providers, global CSS"] --> MainLayout["Main Layout<br/>header + main + bottom tab bar"]
RootLayout --> Providers["Providers<br/>QueryClient + Toaster"]
MainLayout --> Header["Header<br/>brand + account link"]
MainLayout --> TabBar["Bottom Tab Bar<br/>home/cart/orders/chat/account"]
MainLayout --> PageContent["Page Content<br/>dynamic per route"]
Providers --> QueryProvider["React Query Provider"]
Providers --> Toaster["Toast Notifications"]
```

**Diagram sources**
- [layout.tsx:15-28](file://apps/customer/src/app/layout.tsx#L15-L28)
- [layout.tsx](file://apps/customer/src/app/(main)/layout.tsx#L20-L104)
- [query-provider.tsx:6-23](file://apps/customer/src/providers/query-provider.tsx#L6-L23)
- [toaster.tsx:6-14](file://apps/customer/src/providers/toaster.tsx#L6-L14)

**Section sources**
- [layout.tsx:1-29](file://apps/customer/src/app/layout.tsx#L1-L29)
- [layout.tsx](file://apps/customer/src/app/(main)/layout.tsx#L1-L105)
- [globals.css:1-131](file://apps/customer/src/app/globals.css#L1-L131)
- [components.json:1-26](file://apps/customer/components.json#L1-L26)

## Core Components
- Root layout: Initializes fonts, global CSS, and providers.
- Main layout: Provides header, main content container, and a bottom tab bar with five destinations.
- Providers: React Query client and toast notifications.
- Stores: Authentication and cart state management.
- Utilities: Tailwind class merging helper.
- Hooks: Data fetching for products, orders, and chat.

Key responsibilities:
- Root layout ensures consistent typography and theme across the app.
- Main layout enforces a mobile-first, bottom-tab navigation pattern with active state indicators and a cart badge.
- Providers enable optimistic UI, caching, and real-time updates.
- Stores keep user session and cart synchronized locally and with the server.

**Section sources**
- [layout.tsx:15-28](file://apps/customer/src/app/layout.tsx#L15-L28)
- [layout.tsx](file://apps/customer/src/app/(main)/layout.tsx#L20-L104)
- [query-provider.tsx:6-23](file://apps/customer/src/providers/query-provider.tsx#L6-L23)
- [toaster.tsx:6-14](file://apps/customer/src/providers/toaster.tsx#L6-L14)
- [auth-store.ts:14-47](file://apps/customer/src/stores/auth-store.ts#L14-L47)
- [cart-store.ts:28-82](file://apps/customer/src/stores/cart-store.ts#L28-L82)
- [utils.ts:4-6](file://apps/customer/src/lib/utils.ts#L4-L6)

## Architecture Overview
The UI architecture follows a layered approach:
- Layer 1: Root layout and providers.
- Layer 2: Main layout with header and bottom tab bar.
- Layer 3: Page-level routes under the main layout.
- Layer 4: Data fetching via React Query and WebSocket events.
- Layer 5: Local state via Zustand stores.

```mermaid
graph TB
subgraph "Layer 1: App Shell"
RL["Root Layout"]
QP["Query Provider"]
TS["Toaster"]
end
subgraph "Layer 2: Main Shell"
ML["Main Layout"]
HDR["Header"]
TAB["Tab Bar"]
end
subgraph "Layer 3: Pages"
HOME["Home"]
CART["Cart"]
ORDERS["Orders"]
CHAT["Chat"]
ACC["Account"]
end
subgraph "Layer 4: Data"
RQ["React Query"]
WS["WebSocket Events"]
end
subgraph "Layer 5: State"
AUTH["Auth Store"]
CARTS["Cart Store"]
end
RL --> QP
RL --> TS
QP --> ML
TS --> ML
ML --> HDR
ML --> TAB
TAB --> HOME
TAB --> CART
TAB --> ORDERS
TAB --> CHAT
TAB --> ACC
HOME --> RQ
CART --> RQ
ORDERS --> RQ
CHAT --> RQ
ORDERS --> WS
CART --> AUTH
CART --> CARTS
```

**Diagram sources**
- [layout.tsx:15-28](file://apps/customer/src/app/layout.tsx#L15-L28)
- [layout.tsx](file://apps/customer/src/app/(main)/layout.tsx#L20-L104)
- [query-provider.tsx:6-23](file://apps/customer/src/providers/query-provider.tsx#L6-L23)
- [toaster.tsx:6-14](file://apps/customer/src/providers/toaster.tsx#L6-L14)
- [use-orders.ts:6-45](file://apps/customer/src/hooks/use-orders.ts#L6-L45)
- [use-chat.ts:5-19](file://apps/customer/src/hooks/use-chat.ts#L5-L19)
- [use-products.ts:5-19](file://apps/customer/src/hooks/use-products.ts#L5-L19)
- [auth-store.ts:14-47](file://apps/customer/src/stores/auth-store.ts#L14-L47)
- [cart-store.ts:28-82](file://apps/customer/src/stores/cart-store.ts#L28-L82)

## Detailed Component Analysis

### Root Layout and Providers
- Sets up fonts (Geist Sans and Mono) and applies global CSS.
- Wraps children with a QueryClient provider and a toast provider.
- Ensures a consistent theme via CSS variables and Tailwind configuration.

```mermaid
sequenceDiagram
participant Browser as "Browser"
participant Root as "Root Layout"
participant Query as "Query Provider"
participant Toast as "Toaster"
Browser->>Root : Render app shell
Root->>Root : Load fonts and globals.css
Root->>Query : Wrap children with QueryClientProvider
Root->>Toast : Render toast container
Root-->>Browser : App shell ready
```

**Diagram sources**
- [layout.tsx:15-28](file://apps/customer/src/app/layout.tsx#L15-L28)
- [query-provider.tsx:6-23](file://apps/customer/src/providers/query-provider.tsx#L6-L23)
- [toaster.tsx:6-14](file://apps/customer/src/providers/toaster.tsx#L6-L14)

**Section sources**
- [layout.tsx:15-28](file://apps/customer/src/app/layout.tsx#L15-L28)
- [query-provider.tsx:6-23](file://apps/customer/src/providers/query-provider.tsx#L6-L23)
- [toaster.tsx:6-14](file://apps/customer/src/providers/toaster.tsx#L6-L14)

### Main Layout: Header, Main Content, and Bottom Tab Bar
- Header: Sticky, backdrop-blur, brand identity, and an account link that highlights when active.
- Main: Centered content inside a max-width container with padding.
- Bottom Tab Bar: Fixed at the bottom with five icons and labels, active state detection, and a cart badge when items are present.

```mermaid
flowchart TD
Start(["Render Main Layout"]) --> Hydrate["Hydrate auth store on mount"]
Hydrate --> Header["Render Header<br/>brand + account link"]
Header --> Main["Render Main Container<br/>centered content"]
Main --> TabBar["Render Bottom Tab Bar<br/>icons + labels + active state"]
TabBar --> CartBadge{"Cart items > 0?"}
CartBadge --> |Yes| ShowBadge["Show cart badge"]
CartBadge --> |No| NoBadge["No badge"]
ShowBadge --> End(["Layout Ready"])
NoBadge --> End
```

**Diagram sources**
- [layout.tsx](file://apps/customer/src/app/(main)/layout.tsx#L20-L104)
- [cart-store.ts:77-78](file://apps/customer/src/stores/cart-store.ts#L77-L78)

**Section sources**
- [layout.tsx](file://apps/customer/src/app/(main)/layout.tsx#L20-L104)
- [cart-store.ts:28-82](file://apps/customer/src/stores/cart-store.ts#L28-L82)

### Navigation Patterns: Route Handling and Active States
- Uses Next.js routing with dynamic segments and named groups.
- Active tab detection compares current path with each tab’s href, with special handling for the home route.
- Cart badge updates reactively from the cart store.

```mermaid
sequenceDiagram
participant User as "User"
participant Nav as "Tab Bar"
participant Router as "Next Router"
participant Layout as "Main Layout"
User->>Nav : Tap a tab
Nav->>Router : Navigate to href
Router-->>Layout : Update pathname
Layout->>Layout : Recompute active state
Layout-->>User : Re-render with active tab highlighted
```

**Diagram sources**
- [layout.tsx](file://apps/customer/src/app/(main)/layout.tsx#L70-L96)

**Section sources**
- [layout.tsx](file://apps/customer/src/app/(main)/layout.tsx#L70-L96)

### Responsive Design Implementation
- Mobile-first layout with a fixed bottom tab bar.
- Max-width constrained content with horizontal padding.
- Sticky header with backdrop blur for readability on scroll.
- CSS variables and Tailwind utilities ensure consistent spacing and typography.

```mermaid
flowchart TD
Viewport["Viewport"] --> Mobile["Mobile Constraints"]
Mobile --> MaxWidth["Max Width Container"]
MaxWidth --> Padding["Horizontal Padding"]
Mobile --> BottomBar["Fixed Bottom Tab Bar"]
Mobile --> StickyHeader["Sticky Header"]
StickyHeader --> Blur["Backdrop Blur"]
```

**Diagram sources**
- [layout.tsx](file://apps/customer/src/app/(main)/layout.tsx#L37-L68)
- [layout.tsx](file://apps/customer/src/app/(main)/layout.tsx#L68-L99)
- [globals.css:121-131](file://apps/customer/src/app/globals.css#L121-L131)

**Section sources**
- [layout.tsx](file://apps/customer/src/app/(main)/layout.tsx#L37-L99)
- [globals.css:121-131](file://apps/customer/src/app/globals.css#L121-L131)

### UI Component Library Usage and Styling Conventions
- Tailwind CSS with CSS variables for theme tokens.
- shadcn/ui configured with a base style and Lucide icons.
- Utility class merging via a shared cn function.
- Theme toggling handled via CSS custom properties and a dark variant.

```mermaid
graph LR
TW["Tailwind"] --> CSSVars["CSS Variables<br/>colors, radii"]
SHADCN["shadcn/ui"] --> TW
UTILS["cn()"] --> TW
THEME["Theme Config<br/>components.json"] --> SHADCN
THEME --> CSSVars
```

**Diagram sources**
- [globals.css:9-50](file://apps/customer/src/app/globals.css#L9-L50)
- [components.json:6-13](file://apps/customer/components.json#L6-L13)
- [utils.ts:4-6](file://apps/customer/src/lib/utils.ts#L4-L6)

**Section sources**
- [globals.css:1-131](file://apps/customer/src/app/globals.css#L1-L131)
- [components.json:1-26](file://apps/customer/components.json#L1-L26)
- [utils.ts:4-6](file://apps/customer/src/lib/utils.ts#L4-L6)

### Data Fetching and Real-Time Updates
- React Query manages caching, retries, and refetch intervals.
- WebSocket events invalidate relevant queries to keep UI fresh.
- Example hooks:
  - Products and workspace queries.
  - Orders list and single order with periodic refresh.
  - Conversations and messages with polling.

```mermaid
sequenceDiagram
participant Page as "Page"
participant Hook as "useOrders/useChat"
participant Query as "React Query"
participant WS as "WebSocket"
participant Store as "QueryClient"
Page->>Hook : Subscribe to query
Hook->>Query : Fetch data
WS-->>Hook : Emit event (e.g., order : delayed)
Hook->>Store : Invalidate related queries
Store->>Query : Refetch affected queries
Query-->>Page : Updated data
```

**Diagram sources**
- [use-orders.ts:6-45](file://apps/customer/src/hooks/use-orders.ts#L6-L45)
- [use-chat.ts:5-19](file://apps/customer/src/hooks/use-chat.ts#L5-L19)
- [query-provider.tsx:6-23](file://apps/customer/src/providers/query-provider.tsx#L6-L23)

**Section sources**
- [use-products.ts:5-19](file://apps/customer/src/hooks/use-products.ts#L5-L19)
- [use-orders.ts:6-45](file://apps/customer/src/hooks/use-orders.ts#L6-L45)
- [use-chat.ts:5-19](file://apps/customer/src/hooks/use-chat.ts#L5-L19)
- [query-provider.tsx:6-23](file://apps/customer/src/providers/query-provider.tsx#L6-L23)

### State Management: Authentication and Cart
- Authentication store hydrates session on mount and exposes helpers to update or log out.
- Cart store persists items to local storage, supports add/update/remove/clear, and computes totals and counts.

```mermaid
flowchart TD
Mount["App Mount"] --> Hydrate["Hydrate Auth Store"]
Hydrate --> Session{"Session Found?"}
Session --> |Yes| SetAuth["Set authenticated state"]
Session --> |No| ClearAuth["Clear session"]
SetAuth --> CartOps["Cart Operations"]
ClearAuth --> CartOps
CartOps --> Persist["Persist to localStorage"]
Persist --> UI["Re-render UI with cart count"]
```

**Diagram sources**
- [auth-store.ts:19-46](file://apps/customer/src/stores/auth-store.ts#L19-L46)
- [cart-store.ts:37-78](file://apps/customer/src/stores/cart-store.ts#L37-L78)

**Section sources**
- [auth-store.ts:14-47](file://apps/customer/src/stores/auth-store.ts#L14-L47)
- [cart-store.ts:28-82](file://apps/customer/src/stores/cart-store.ts#L28-L82)

## Dependency Analysis
- Root layout depends on providers and global CSS.
- Main layout depends on:
  - Navigation utilities (pathname).
  - Icons from Lucide.
  - Stores for hydration and cart count.
  - WebSocket provider for real-time updates.
- Providers depend on external libraries (React Query, Sonner).
- Stores depend on the API client and local storage.
- Hooks depend on React Query and the API client.

```mermaid
graph TB
Root["Root Layout"] --> Providers["Providers"]
Providers --> Query["React Query"]
Providers --> Toast["Toaster"]
Main["Main Layout"] --> Stores["Auth/Cart Stores"]
Main --> WS["WS Provider"]
Hooks["Hooks"] --> Query
Hooks --> WS
Stores --> API["API Client"]
```

**Diagram sources**
- [layout.tsx:15-28](file://apps/customer/src/app/layout.tsx#L15-L28)
- [layout.tsx](file://apps/customer/src/app/(main)/layout.tsx#L20-L104)
- [query-provider.tsx:6-23](file://apps/customer/src/providers/query-provider.tsx#L6-L23)
- [toaster.tsx:6-14](file://apps/customer/src/providers/toaster.tsx#L6-L14)
- [use-orders.ts:6-45](file://apps/customer/src/hooks/use-orders.ts#L6-L45)
- [use-chat.ts:5-19](file://apps/customer/src/hooks/use-chat.ts#L5-L19)
- [auth-store.ts:14-47](file://apps/customer/src/stores/auth-store.ts#L14-L47)
- [cart-store.ts:28-82](file://apps/customer/src/stores/cart-store.ts#L28-L82)

**Section sources**
- [layout.tsx](file://apps/customer/src/app/(main)/layout.tsx#L20-L104)
- [query-provider.tsx:6-23](file://apps/customer/src/providers/query-provider.tsx#L6-L23)
- [use-orders.ts:6-45](file://apps/customer/src/hooks/use-orders.ts#L6-L45)
- [use-chat.ts:5-19](file://apps/customer/src/hooks/use-chat.ts#L5-L19)
- [auth-store.ts:14-47](file://apps/customer/src/stores/auth-store.ts#L14-L47)
- [cart-store.ts:28-82](file://apps/customer/src/stores/cart-store.ts#L28-L82)

## Performance Considerations
- Caching and staleTime reduce redundant network requests.
- Local persistence for the cart avoids repeated server fetches.
- Backdrop blur and minimal re-renders improve perceived performance.
- Polling intervals for messages and order updates should be tuned to balance freshness and battery/network usage.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- If tabs appear inactive, verify the active detection logic and ensure the href matches the current path.
- If cart badge does not show, confirm the cart store’s item count and that the tab bar reads it.
- If toasts do not appear, check the mounted state initialization in the toast provider.
- If data does not refresh, confirm WebSocket events and query invalidation logic.

**Section sources**
- [layout.tsx](file://apps/customer/src/app/(main)/layout.tsx#L70-L96)
- [cart-store.ts:77-78](file://apps/customer/src/stores/cart-store.ts#L77-L78)
- [toaster.tsx:6-14](file://apps/customer/src/providers/toaster.tsx#L6-L14)
- [use-orders.ts:30-42](file://apps/customer/src/hooks/use-orders.ts#L30-L42)

## Conclusion
The customer application employs a clean, mobile-first UI with a fixed bottom tab bar, a sticky header, and a centered content area. It leverages a robust provider stack (React Query, WebSocket, and toast notifications), a consistent theme via Tailwind and CSS variables, and local state management for authentication and cart. The navigation is straightforward and responsive, with clear active states and contextual indicators like the cart badge. The hooks and stores encapsulate data fetching and state updates, enabling a smooth user experience across routes.