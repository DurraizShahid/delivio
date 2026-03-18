// ─── Auth ──────────────────────────────────────────────────────────────────────

export type AdminRole = "admin" | "vendor" | "rider";

export interface User {
  id: string;
  email: string;
  role: AdminRole;
  projectRef: string;
  totpEnabled: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  projectRef: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerAddress {
  id: string;
  customerId: string;
  label: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postcode: string;
  lat?: number;
  lon?: number;
  isDefault: boolean;
  createdAt: string;
}

// ─── Orders ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "pending"
  | "accepted_by_vendor"
  | "preparing"
  | "ready"
  | "picked_up"
  | "delivered"
  | "cancelled"
  | "scheduled";

export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";

export interface Order {
  id: string;
  projectRef: string;
  customerId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentIntentId?: string;
  totalCents: number;
  refundAmountCents?: number;
  refundReason?: string;
  cancellationReason?: string;
  cancelledBy?: string;
  scheduledFor?: string;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
}

// ─── Cart ──────────────────────────────────────────────────────────────────────

export interface CartSession {
  id: string;
  projectRef: string;
  customerId?: string;
  createdAt: string;
}

export interface CartItem {
  id: string;
  sessionId: string;
  productId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  createdAt: string;
}

// ─── Delivery ──────────────────────────────────────────────────────────────────

export type DeliveryStatus = "assigned" | "picked_up" | "delivered";

export interface Delivery {
  id: string;
  orderId: string;
  riderId?: string;
  status: DeliveryStatus;
  zoneId?: string;
  etaMinutes?: number;
  claimedAt?: string;
  updatedAt: string;
  createdAt: string;
}

export interface RiderLocation {
  id: string;
  deliveryId: string;
  riderId: string;
  lat: number;
  lon: number;
  heading?: number;
  speed?: number;
  recordedAt: string;
}

// ─── Chat ──────────────────────────────────────────────────────────────────────

export type ConversationType = "customer_vendor" | "vendor_rider";

export interface Conversation {
  id: string;
  projectRef: string;
  orderId: string;
  type: ConversationType;
  participant1Id: string;
  participant2Id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: string;
  content: string;
  readAt?: string;
  createdAt: string;
}

// ─── Products / Menu ───────────────────────────────────────────────────────────

export interface Product {
  id: string;
  projectRef: string;
  name: string;
  description?: string;
  priceCents: number;
  category?: string;
  imageUrl?: string;
  available: boolean;
  createdAt: string;
}

export interface Workspace {
  id: string;
  projectRef: string;
  name: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  address?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Payments ──────────────────────────────────────────────────────────────────

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  isDummy?: boolean;
}

// ─── Push Tokens ───────────────────────────────────────────────────────────────

export type PushPlatform = "web" | "ios" | "android";

export interface PushToken {
  id: string;
  userId: string;
  userRole: string;
  token: string;
  platform: PushPlatform;
  projectRef: string;
  createdAt: string;
}

// ─── WebSocket Events ──────────────────────────────────────────────────────────

export interface WSOrderStatusChanged {
  type: "order:status_changed";
  orderId: string;
  status: OrderStatus;
  previousStatus: OrderStatus;
  updatedAt: string;
  deliveryStatus?: DeliveryStatus;
}

export interface WSDeliveryLocationUpdate {
  type: "delivery:location_update";
  deliveryId: string;
  lat: number;
  lon: number;
  heading?: number;
  speed?: number;
}

export interface WSChatMessage {
  type: "chat:message";
  conversationId: string;
  message: Message;
}

export interface WSChatRead {
  type: "chat:read";
  conversationId: string;
  userId: string;
  readAt: string;
}

export interface WSChatTyping {
  type: "chat:typing";
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export type WSEvent =
  | WSOrderStatusChanged
  | WSDeliveryLocationUpdate
  | WSChatMessage
  | WSChatRead
  | WSChatTyping;

// ─── API Response Wrappers ─────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total?: number;
  limit: number;
  offset: number;
}
