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
  Shop,
  UserShop,
  GeoPolygon,
  RiderGeofence,
  PaymentIntentResponse,
  PushPlatform,
  Rating,
  Tip,
  VendorSettings,
  Superadmin,
  User,
  PlatformTheme,
  AppTarget,
  ThemeColors,
  ResolvedTheme,
  PlatformBanner,
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
    sendOTP(phone: string, projectRef: string): Promise<{ ok: boolean; debugOtp?: string }>;
    verifyOTP(params: {
      phone: string;
      code: string;
      projectRef: string;
      name?: string;
      email?: string;
    }): Promise<{ customer: Customer }>;
    login(
      email: string,
      password: string
    ): Promise<
      | { user: Customer }
      | { requiresTwoFactor: true; preAuthToken: string }
    >;
    login2FA(sessionToken: string, totpToken: string): Promise<{ user: Customer }>;
    logout(): Promise<void>;
    getSession(): Promise<{ customer: Customer } | null>;
    getAdminSession(): Promise<{ user: Customer } | null>;
  };
  orders: {
    list(params?: {
      status?: string;
      limit?: number;
      offset?: number;
      shopId?: string;
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
    getByRider(riderId: string): Promise<{ riderId: string; totalCents: number }>;
    getMine(): Promise<{ riderId: string; totalCents: number }>;
  };
  shops: {
    list(params?: { includeInactive?: boolean }): Promise<{ shops: Shop[] }>;
    get(shopId: string): Promise<{ shop: Shop }>;
    create(params: {
      name: string;
      slug: string;
      description?: string | null;
      logoUrl?: string | null;
      bannerUrl?: string | null;
      address?: string | null;
      phone?: string | null;
      lat?: number | null;
      lon?: number | null;
      deliveryGeofence?: GeoPolygon | null;
      isActive?: boolean;
    }): Promise<{ shop: Shop }>;
    update(shopId: string, params: Partial<{
      name: string;
      slug: string;
      description: string | null;
      logoUrl: string | null;
      bannerUrl: string | null;
      address: string | null;
      phone: string | null;
      lat: number | null;
      lon: number | null;
      deliveryGeofence: GeoPolygon | null;
      isActive: boolean;
    }>): Promise<{ shop: Shop }>;
    delete(shopId: string): Promise<{ ok: boolean }>;
    listUsers(shopId: string): Promise<{ users: Array<{ id: string; email: string; role: string }> }>;
    assignUser(shopId: string, userId: string): Promise<{ ok: boolean }>;
    removeUser(shopId: string, userId: string): Promise<{ ok: boolean }>;
  };
  vendorSettings: {
    get(shopId?: string): Promise<VendorSettings>;
    update(settings: Partial<{
      autoAccept: boolean;
      defaultPrepTimeMinutes: number;
      deliveryMode: string;
      autoDispatchDelayMinutes: number;
    }>, shopId?: string): Promise<VendorSettings>;
  };
  riderGeofence: {
    get(): Promise<{ geofence: RiderGeofence | null }>;
    save(geofence: GeoPolygon): Promise<{ geofence: RiderGeofence }>;
  };
  catalog: {
    listCategories(shopId?: string): Promise<{ categories: Category[] }>;
    createCategory(params: { name: string; sortOrder?: number }, shopId?: string): Promise<{ category: Category }>;
    updateCategory(id: string, params: Partial<{ name: string; sortOrder: number }>, shopId?: string): Promise<{ category: Category }>;
    deleteCategory(id: string, shopId?: string): Promise<{ ok: boolean }>;

    listProducts(params?: { includeUnavailable?: boolean }, shopId?: string): Promise<{ products: Product[] }>;
    createProduct(params: {
      name: string;
      description?: string | null;
      priceCents: number;
      category?: string | null;
      imageUrl?: string | null;
      available?: boolean;
      sortOrder?: number;
    }, shopId?: string): Promise<{ product: Product }>;
    updateProduct(id: string, params: Partial<{
      name: string;
      description: string | null;
      priceCents: number;
      category: string | null;
      imageUrl: string | null;
      available: boolean;
      sortOrder: number;
    }>, shopId?: string): Promise<{ product: Product }>;
    deleteProduct(id: string, shopId?: string): Promise<{ ok: boolean }>;
  };
  public: {
    products(
      ref: string,
      table?: string
    ): Promise<Product[]>;
    workspace(ref: string): Promise<Workspace>;
    shops(ref: string, lat?: number, lon?: number): Promise<Shop[]>;
    shopDetail(ref: string, shopId: string): Promise<Shop>;
    shopProducts(ref: string, shopId: string): Promise<Product[]>;
    shopCategories(ref: string, shopId: string): Promise<Category[]>;
    geocode(address: string): Promise<{ lat: number; lon: number }>;
      reverseGeocode(lat: number, lon: number): Promise<{ address: string | null }>;
    deliveryCheck(ref: string, lat: number, lon: number): Promise<DeliveryCheck>;
    shopDeliveryCheck(ref: string, shopId: string, lat: number, lon: number): Promise<DeliveryCheck>;
    theme(app: string, ref?: string): Promise<ResolvedTheme | null>;
    banners(placement?: string): Promise<{ banners: PlatformBanner[] }>;
  };
  superadmin: {
    auth: {
      login(email: string, password: string): Promise<{ user: Superadmin }>;
      logout(): Promise<void>;
      session(): Promise<{ user: Superadmin } | null>;
    };
    workspaces: {
      list(): Promise<{ workspaces: Workspace[] }>;
      create(params: { projectRef: string; name: string; description?: string | null; address?: string | null; phone?: string | null }): Promise<{ workspace: Workspace }>;
      update(id: string, params: Partial<{ name: string; description: string | null; logoUrl: string | null; bannerUrl: string | null; address: string | null; phone: string | null }>): Promise<{ workspace: Workspace }>;
      delete(id: string): Promise<{ ok: boolean }>;
    };
    users: {
      list(params?: { role?: string; projectRef?: string; limit?: number; offset?: number }): Promise<{ users: User[] }>;
      create(params: { email: string; password: string; role: string; projectRef: string }): Promise<{ user: User }>;
      update(id: string, params: Partial<{ email: string; role: string; projectRef: string }>): Promise<{ user: User }>;
      delete(id: string): Promise<{ ok: boolean }>;
    };
    shops: {
      list(params?: { projectRef?: string; limit?: number }): Promise<{ shops: Shop[] }>;
      create(params: { projectRef: string; name: string; slug: string; description?: string | null; address?: string | null; phone?: string | null; lat?: number | null; lon?: number | null }): Promise<{ shop: Shop }>;
      update(id: string, params: Partial<{ name: string; slug: string; description: string | null; address: string | null; phone: string | null; isActive: boolean }>): Promise<{ shop: Shop }>;
      delete(id: string): Promise<{ ok: boolean }>;
    };
    customers: {
      list(params?: { projectRef?: string; limit?: number; offset?: number }): Promise<{ customers: Customer[] }>;
    };
    orders: {
      list(params?: { projectRef?: string; status?: string; limit?: number; offset?: number }): Promise<{ orders: Order[] }>;
    };
    themes: {
      list(workspaceId?: string): Promise<{ themes: PlatformTheme[] }>;
      upsert(params: { appTarget: AppTarget; workspaceId?: string | null; lightTheme: ThemeColors; darkTheme: ThemeColors }): Promise<{ theme: PlatformTheme }>;
      delete(id: string): Promise<{ ok: boolean }>;
    };
    uploadPlatformLogo(file: File): Promise<{ logoUrl: string }>;
    banners: {
      list(): Promise<{ banners: PlatformBanner[] }>;
      create(params: Partial<PlatformBanner> & { title: string }): Promise<{ banner: PlatformBanner }>;
      update(id: string, params: Partial<PlatformBanner>): Promise<{ banner: PlatformBanner }>;
      delete(id: string): Promise<{ ok: boolean }>;
    };
    stats(): Promise<{ stats: { totalWorkspaces: number; totalShops: number; totalUsers: number; totalCustomers: number; totalOrders: number; totalRevenueCents: number } }>;
  };
}

function shopHeader(shopId?: string): Record<string, string> {
  return shopId ? { "x-shop-id": shopId } : {};
}

export function createApiClient(baseUrl: string): ApiClient {
  const get = <T>(path: string, headers?: Record<string, string>) =>
    request<T>(baseUrl, path, headers ? { headers } : {});
  const post = <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(baseUrl, path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      ...(headers ? { headers } : {}),
    });
  const patch = <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(baseUrl, path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
      ...(headers ? { headers } : {}),
    });
  const del = <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(baseUrl, path, {
      method: "DELETE",
      body: body ? JSON.stringify(body) : undefined,
      ...(headers ? { headers } : {}),
    });

  return {
    auth: {
      sendOTP: (phone, projectRef) =>
        post<{ ok: boolean; debugOtp?: string }>("/api/auth/otp/send", { phone, projectRef }),
      verifyOTP: (params) => post("/api/auth/otp/verify", params),
      login: (email, password) =>
        post("/api/auth/login", { email, password }),
      login2FA: (sessionToken, totpToken) =>
        post("/api/auth/2fa/login", { sessionToken, totpToken }),
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
        if (params?.shopId) qs.set("shopId", params.shopId);
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
        return get<{ deliveries: Delivery[] }>(
          `/api/deliveries/rider/deliveries?${qs}`
        ).then((r) => r.deliveries);
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
      listConversations: () =>
        get<{ conversations: Conversation[] }>("/api/chat/conversations").then(
          (r) => r.conversations
        ),
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
      getMine: () => get("/api/tips/me"),
    },
    shops: {
      list: (params) => {
        const qs = new URLSearchParams();
        if (params?.includeInactive) qs.set("includeInactive", "true");
        const q = qs.toString();
        return get(`/api/shops${q ? `?${q}` : ""}`);
      },
      get: (shopId) => get(`/api/shops/${shopId}`),
      create: (params) => post("/api/shops", params),
      update: (shopId, params) => patch(`/api/shops/${shopId}`, params),
      delete: (shopId) => del(`/api/shops/${shopId}`),
      listUsers: (shopId) => get(`/api/shops/${shopId}/users`),
      assignUser: (shopId, userId) => post(`/api/shops/${shopId}/users`, { userId }),
      removeUser: (shopId, userId) => del(`/api/shops/${shopId}/users/${userId}`),
    },
    vendorSettings: {
      get: (shopId) => {
        const qs = shopId ? `?shopId=${shopId}` : "";
        return get(`/api/vendor-settings${qs}`);
      },
      update: (settings, shopId) => {
        const body = shopId ? { ...settings, shopId } : settings;
        return patch("/api/vendor-settings", body);
      },
    },
    riderGeofence: {
      get: () => get("/api/rider/geofence"),
      save: (geofence) => request(baseUrl, "/api/rider/geofence", {
        method: "PUT",
        body: JSON.stringify({ geofence }),
        headers: { "Content-Type": "application/json" },
      }),
    },
    catalog: {
      listCategories: (shopId) =>
        get("/api/catalog/categories", shopHeader(shopId)),
      createCategory: (params, shopId) =>
        post("/api/catalog/categories", params, shopHeader(shopId)),
      updateCategory: (id, params, shopId) =>
        patch(`/api/catalog/categories/${id}`, params, shopHeader(shopId)),
      deleteCategory: (id, shopId) =>
        del(`/api/catalog/categories/${id}`, undefined, shopHeader(shopId)),

      listProducts: (params, shopId) => {
        const qs = new URLSearchParams();
        if (params?.includeUnavailable === false) qs.set("includeUnavailable", "false");
        const q = qs.toString();
        return get(`/api/catalog/products${q ? `?${q}` : ""}`, shopHeader(shopId));
      },
      createProduct: (params, shopId) =>
        post("/api/catalog/products", params, shopHeader(shopId)),
      updateProduct: (id, params, shopId) =>
        patch(`/api/catalog/products/${id}`, params, shopHeader(shopId)),
      deleteProduct: (id, shopId) =>
        del(`/api/catalog/products/${id}`, undefined, shopHeader(shopId)),
    },
    public: {
      products: (ref, table = "products") =>
        get<unknown>(`/api/public/${ref}/${table}`).then((data) => {
          if (Array.isArray(data)) return data as Product[];
          if (
            data &&
            typeof data === "object" &&
            "products" in data &&
            Array.isArray((data as any).products)
          )
            return (data as any).products as Product[];
          if (
            data &&
            typeof data === "object" &&
            "items" in data &&
            Array.isArray((data as any).items)
          )
            return (data as any).items as Product[];
          return [];
        }),
      workspace: (ref) => get(`/api/workspace/${ref}`),
      shops: (ref, lat?, lon?) => {
        const qs = new URLSearchParams();
        if (lat != null) qs.set("lat", String(lat));
        if (lon != null) qs.set("lon", String(lon));
        const q = qs.toString();
        return get<{ shops: Shop[] }>(`/api/public/${ref}/shops${q ? `?${q}` : ""}`).then((r) => r.shops);
      },
      shopDetail: (ref, shopId) =>
        get<{ shop: Shop }>(`/api/public/${ref}/shops/${shopId}`).then((r) => r.shop),
      shopProducts: (ref, shopId) =>
        get<{ products: Product[] }>(`/api/public/${ref}/shops/${shopId}/products`).then((r) => r.products),
      shopCategories: (ref, shopId) =>
        get<{ categories: Category[] }>(`/api/public/${ref}/shops/${shopId}/categories`).then((r) => r.categories),
      geocode: (address) =>
        get(`/api/geocode?address=${encodeURIComponent(address)}`),
      reverseGeocode: (lat, lon) =>
        get<{ address: string | null }>(`/api/reverse-geocode?lat=${lat}&lon=${lon}`),
      deliveryCheck: (ref, lat, lon) =>
        get(`/api/public/${ref}/delivery-check?lat=${lat}&lon=${lon}`),
      shopDeliveryCheck: (ref, shopId, lat, lon) =>
        get(`/api/public/${ref}/shops/${shopId}/delivery-check?lat=${lat}&lon=${lon}`),
      theme: (app, ref?) => {
        const qs = new URLSearchParams({ app });
        if (ref) qs.set("ref", ref);
        return get<ResolvedTheme>(`/api/public/theme?${qs}`).catch(() => null);
      },
      banners: (placement) =>
        get(
          `/api/public/banners?placement=${encodeURIComponent(placement ?? "home_promotions")}`
        ),
    },
    superadmin: {
      auth: {
        login: (email, password) =>
          post("/api/superadmin/auth/login", { email, password }),
        logout: () => post("/api/superadmin/auth/logout"),
        session: () =>
          get<{ user: Superadmin } | null>("/api/superadmin/auth/session").catch(() => null),
      },
      workspaces: {
        list: () => get("/api/superadmin/workspaces"),
        create: (params) => post("/api/superadmin/workspaces", params),
        update: (id, params) => patch(`/api/superadmin/workspaces/${id}`, params),
        delete: (id) => del(`/api/superadmin/workspaces/${id}`),
      },
      users: {
        list: (params) => {
          const qs = new URLSearchParams();
          if (params?.role) qs.set("role", params.role);
          if (params?.projectRef) qs.set("projectRef", params.projectRef);
          if (params?.limit) qs.set("limit", String(params.limit));
          if (params?.offset) qs.set("offset", String(params.offset));
          const q = qs.toString();
          return get(`/api/superadmin/users${q ? `?${q}` : ""}`);
        },
        create: (params) => post("/api/superadmin/users", params),
        update: (id, params) => patch(`/api/superadmin/users/${id}`, params),
        delete: (id) => del(`/api/superadmin/users/${id}`),
      },
      shops: {
        list: (params) => {
          const qs = new URLSearchParams();
          if (params?.projectRef) qs.set("projectRef", params.projectRef);
          if (params?.limit) qs.set("limit", String(params.limit));
          const q = qs.toString();
          return get(`/api/superadmin/shops${q ? `?${q}` : ""}`);
        },
        create: (params) => post("/api/superadmin/shops", params),
        update: (id, params) => patch(`/api/superadmin/shops/${id}`, params),
        delete: (id) => del(`/api/superadmin/shops/${id}`),
      },
      customers: {
        list: (params) => {
          const qs = new URLSearchParams();
          if (params?.projectRef) qs.set("projectRef", params.projectRef);
          if (params?.limit) qs.set("limit", String(params.limit));
          if (params?.offset) qs.set("offset", String(params.offset));
          const q = qs.toString();
          return get(`/api/superadmin/customers${q ? `?${q}` : ""}`);
        },
      },
      orders: {
        list: (params) => {
          const qs = new URLSearchParams();
          if (params?.projectRef) qs.set("projectRef", params.projectRef);
          if (params?.status) qs.set("status", params.status);
          if (params?.limit) qs.set("limit", String(params.limit));
          if (params?.offset) qs.set("offset", String(params.offset));
          const q = qs.toString();
          return get(`/api/superadmin/orders${q ? `?${q}` : ""}`);
        },
      },
      themes: {
        list: (workspaceId) => {
          const qs = new URLSearchParams();
          if (workspaceId) qs.set("workspaceId", workspaceId);
          const q = qs.toString();
          return get(`/api/superadmin/themes${q ? `?${q}` : ""}`);
        },
        upsert: (params) =>
          request(baseUrl, "/api/superadmin/themes", {
            method: "PUT",
            body: JSON.stringify(params),
          }),
        delete: (id) => del(`/api/superadmin/themes/${id}`),
      },
      uploadPlatformLogo: async (file) => {
        const formData = new FormData();
        formData.append("logo", file);
        const url = `${baseUrl}/api/superadmin/platform-logo`;
        const res = await fetch(url, {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw Object.assign(
            new Error(
              (body as { error?: string }).error || res.statusText
            ),
            { statusCode: res.status, body }
          );
        }
        return res.json() as Promise<{ logoUrl: string }>;
      },
      banners: {
        list: () => get("/api/superadmin/banners"),
        create: (params) => post("/api/superadmin/banners", params),
        update: (id, params) => patch(`/api/superadmin/banners/${id}`, params),
        delete: (id) => del(`/api/superadmin/banners/${id}`),
      },
      stats: () => get("/api/superadmin/stats"),
    },
  };
}
