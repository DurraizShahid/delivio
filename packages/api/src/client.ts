import type {
  Order,
  OrderItem,
  CartItem,
  Delivery,
  DeliveryCheck,
  RiderLocation,
  Conversation,
  Message,
  Customer,
  CustomerAddress,
  Product,
  Category,
  Workspace,
  PaymentIntentResponse,
  PushPlatform,
  Rating,
  Tip,
  VendorSettings,
} from "@delivio/types";

async function request<T>(
  baseUrl: string,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.message || res.statusText), {
      statusCode: res.status,
      body,
    });
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface ApiClient {
  auth: {
    sendOTP(phone: string, projectRef: string): Promise<{ message: string }>;
    verifyOTP(params: {
      phone: string;
      code: string;
      projectRef: string;
      name?: string;
      email?: string;
    }): Promise<{ customer: Customer }>;
    login(email: string, password: string): Promise<{ user: Customer }>;
    logout(): Promise<void>;
    getSession(): Promise<{ customer: Customer } | null>;
    getAdminSession(): Promise<{ user: Customer } | null>;
  };
  orders: {
    list(params?: {
      status?: string;
      limit?: number;
      offset?: number;
    }): Promise<Order[]>;
    get(id: string): Promise<Order & { items: OrderItem[] }>;
    updateStatus(id: string, status: string): Promise<Order>;
    cancel(
      id: string,
      params?: { reason?: string; initiator?: string }
    ): Promise<Order>;
    refund(
      id: string,
      params?: { amountCents?: number; reason?: string }
    ): Promise<Order>;
    accept(id: string, prepTimeMinutes?: number): Promise<Order>;
    reject(id: string, reason?: string): Promise<Order>;
    complete(id: string): Promise<Order>;
    extendSla(id: string, additionalMinutes?: number): Promise<{ ok: boolean; newDeadline: string }>;
  };
  cart: {
    get(): Promise<{ session: { id: string }; items: CartItem[] }>;
    addItem(item: {
      productId?: string;
      name?: string;
      quantity?: number;
      unitPriceCents?: number;
    }): Promise<CartItem>;
    updateItem(itemId: string, quantity: number): Promise<CartItem>;
    removeItem(itemId: string): Promise<void>;
    merge(guestSessionId: string): Promise<{ merged: number }>;
  };
  deliveries: {
    list(params?: {
      zoneId?: string;
      status?: string;
    }): Promise<Delivery[]>;
    claim(id: string): Promise<Delivery>;
    updateStatus(id: string, status: string): Promise<Delivery>;
    updateLocation(
      id: string,
      location: { lat: number; lon: number; heading?: number; speed?: number }
    ): Promise<void>;
    updateRiderAvailability(location: {
      lat: number;
      lon: number;
      heading?: number;
      speed?: number;
    }): Promise<void>;
    getLocation(id: string): Promise<RiderLocation>;
    arrived(id: string): Promise<Delivery>;
    assign(id: string, riderId: string): Promise<Delivery>;
    reassign(id: string): Promise<{ ok: boolean }>;
    assignExternal(id: string, params: { name: string; phone: string }): Promise<{ ok: boolean }>;
  };
  chat: {
    createConversation(params: {
      orderId: string;
      type: "customer_vendor" | "vendor_rider";
    }): Promise<Conversation>;
    listConversations(): Promise<Conversation[]>;
    getMessages(
      conversationId: string,
      page?: number
    ): Promise<Message[]>;
    sendMessage(
      conversationId: string,
      content: string
    ): Promise<Message>;
    markRead(conversationId: string): Promise<void>;
  };
  payments: {
    createIntent(params: {
      amountCents: number;
      currency?: string;
      metadata?: Record<string, string>;
    }): Promise<PaymentIntentResponse>;
  };
  push: {
    register(token: string, platform: PushPlatform): Promise<void>;
    unregister(platform?: PushPlatform): Promise<void>;
  };
  ratings: {
    create(params: {
      orderId: string;
      toUserId: string;
      toRole: "vendor" | "rider";
      rating: number;
      comment?: string;
    }): Promise<Rating>;
    getByOrder(orderId: string): Promise<Rating[]>;
    getByUser(userId: string): Promise<{ ratings: Rating[]; average: number }>;
  };
  tips: {
    create(params: {
      orderId: string;
      toRiderId: string;
      amountCents: number;
    }): Promise<Tip>;
    getByRider(riderId: string): Promise<{ total: number }>;
  };
  vendorSettings: {
    get(): Promise<VendorSettings>;
    update(settings: Partial<{
      autoAccept: boolean;
      defaultPrepTimeMinutes: number;
      deliveryMode: string;
      deliveryRadiusKm: number;
    }>): Promise<VendorSettings>;
  };
  catalog: {
    listCategories(): Promise<{ categories: Category[] }>;
    createCategory(params: { name: string; sortOrder?: number }): Promise<{ category: Category }>;
    updateCategory(id: string, params: Partial<{ name: string; sortOrder: number }>): Promise<{ category: Category }>;
    deleteCategory(id: string): Promise<{ ok: boolean }>;

    listProducts(params?: { includeUnavailable?: boolean }): Promise<{ products: Product[] }>;
    createProduct(params: {
      name: string;
      description?: string | null;
      priceCents: number;
      category?: string | null;
      imageUrl?: string | null;
      available?: boolean;
      sortOrder?: number;
    }): Promise<{ product: Product }>;
    updateProduct(id: string, params: Partial<{
      name: string;
      description: string | null;
      priceCents: number;
      category: string | null;
      imageUrl: string | null;
      available: boolean;
      sortOrder: number;
    }>): Promise<{ product: Product }>;
    deleteProduct(id: string): Promise<{ ok: boolean }>;
  };
  public: {
    products(
      ref: string,
      table?: string
    ): Promise<Product[]>;
    workspace(ref: string): Promise<Workspace>;
    geocode(address: string): Promise<{ lat: number; lon: number }>;
    deliveryCheck(ref: string, lat: number, lon: number): Promise<DeliveryCheck>;
  };
}

export function createApiClient(baseUrl: string): ApiClient {
  const get = <T>(path: string) => request<T>(baseUrl, path);
  const post = <T>(path: string, body?: unknown) =>
    request<T>(baseUrl, path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  const patch = <T>(path: string, body?: unknown) =>
    request<T>(baseUrl, path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  const del = <T>(path: string, body?: unknown) =>
    request<T>(baseUrl, path, {
      method: "DELETE",
      body: body ? JSON.stringify(body) : undefined,
    });

  return {
    auth: {
      sendOTP: (phone, projectRef) =>
        post("/api/auth/otp/send", { phone, projectRef }),
      verifyOTP: (params) => post("/api/auth/otp/verify", params),
      login: (email, password) =>
        post("/api/auth/login", { email, password }),
      logout: () => post("/api/auth/customer/logout"),
      getSession: () =>
        get<{ customer: Customer } | null>("/api/auth/customer/session").catch(
          () => null
        ),
      getAdminSession: () =>
        get<{ user: Customer } | null>("/api/auth/session").catch(() => null),
    },
    orders: {
      list: (params) => {
        const qs = new URLSearchParams();
        if (params?.status) qs.set("status", params.status);
        if (params?.limit) qs.set("limit", String(params.limit));
        if (params?.offset) qs.set("offset", String(params.offset));
        const q = qs.toString();
        return get<{ orders: Order[] }>(`/api/orders${q ? `?${q}` : ""}`).then(
          (r) => r.orders
        );
      },
      get: (id) => get(`/api/orders/${id}`),
      updateStatus: (id, status) =>
        patch(`/api/orders/${id}/status`, { status }),
      cancel: (id, params) => post(`/api/orders/${id}/cancel`, params),
      refund: (id, params) => post(`/api/orders/${id}/refund`, params),
      accept: (id, prepTimeMinutes) =>
        post(`/api/orders/${id}/accept`, prepTimeMinutes ? { prepTimeMinutes } : {}),
      reject: (id, reason) =>
        post(`/api/orders/${id}/reject`, reason ? { reason } : {}),
      complete: (id) => post(`/api/orders/${id}/complete`),
      extendSla: (id, additionalMinutes) => post(`/api/orders/${id}/extend-sla`, additionalMinutes ? { additionalMinutes } : {}),
    },
    cart: {
      get: () => get("/api/cart"),
      addItem: (item) => post("/api/cart", item),
      updateItem: (itemId, quantity) =>
        patch(`/api/cart/${itemId}`, { quantity }),
      removeItem: (itemId) => del(`/api/cart/${itemId}`),
      merge: (guestSessionId) =>
        post("/api/cart/merge", { guestSessionId }),
    },
    deliveries: {
      list: (params) => {
        const qs = new URLSearchParams();
        if (params?.zoneId) qs.set("zoneId", params.zoneId);
        if (params?.status) qs.set("status", params.status);
        return get(`/api/deliveries/rider/deliveries?${qs}`);
      },
      claim: (id) => post(`/api/deliveries/${id}/claim`),
      updateStatus: (id, status) =>
        post(`/api/deliveries/${id}/status`, { status }),
      updateLocation: (id, location) =>
        post(`/api/deliveries/${id}/location`, location),
      updateRiderAvailability: (location) =>
        post(`/api/deliveries/rider/location`, location),
      getLocation: (id) => get(`/api/deliveries/${id}/location`),
      arrived: (id) => post(`/api/deliveries/${id}/arrived`),
      assign: (id, riderId) => post(`/api/deliveries/${id}/assign`, { riderId }),
      reassign: (id) => post(`/api/deliveries/${id}/reassign`),
      assignExternal: (id, params) => post(`/api/deliveries/${id}/assign-external`, params),
    },
    chat: {
      createConversation: (params) =>
        post("/api/chat/conversations", params),
      listConversations: () => get("/api/chat/conversations"),
      getMessages: (conversationId, page) =>
        get(
          `/api/chat/conversations/${conversationId}/messages${page ? `?page=${page}` : ""}`
        ),
      sendMessage: (conversationId, content) =>
        post(`/api/chat/conversations/${conversationId}/messages`, {
          content,
        }),
      markRead: (conversationId) =>
        patch(`/api/chat/conversations/${conversationId}/read`),
    },
    payments: {
      createIntent: (params) => post("/api/payments/create-intent", params),
    },
    push: {
      register: (token, platform) =>
        post("/api/push/register", { token, platform }),
      unregister: (platform) =>
        del("/api/push/register", platform ? { platform } : undefined),
    },
    ratings: {
      create: (params) => post("/api/ratings", params),
      getByOrder: (orderId) => get(`/api/ratings/order/${orderId}`),
      getByUser: (userId) => get(`/api/ratings/user/${userId}`),
    },
    tips: {
      create: (params) => post("/api/tips", params),
      getByRider: (riderId) => get(`/api/tips/rider/${riderId}`),
    },
    vendorSettings: {
      get: () => get("/api/vendor-settings"),
      update: (settings) => patch("/api/vendor-settings", settings),
    },
    catalog: {
      listCategories: () => get("/api/catalog/categories"),
      createCategory: (params) => post("/api/catalog/categories", params),
      updateCategory: (id, params) => patch(`/api/catalog/categories/${id}`, params),
      deleteCategory: (id) => del(`/api/catalog/categories/${id}`),

      listProducts: (params) => {
        const qs = new URLSearchParams();
        if (params?.includeUnavailable === false) qs.set("includeUnavailable", "false");
        const q = qs.toString();
        return get(`/api/catalog/products${q ? `?${q}` : ""}`);
      },
      createProduct: (params) => post("/api/catalog/products", params),
      updateProduct: (id, params) => patch(`/api/catalog/products/${id}`, params),
      deleteProduct: (id) => del(`/api/catalog/products/${id}`),
    },
    public: {
      products: (ref, table = "products") =>
        get(`/api/public/${ref}/${table}`),
      workspace: (ref) => get(`/api/workspace/${ref}`),
      geocode: (address) =>
        get(`/api/geocode?address=${encodeURIComponent(address)}`),
      deliveryCheck: (ref, lat, lon) =>
        get(`/api/public/${ref}/delivery-check?lat=${lat}&lon=${lon}`),
    },
  };
}
