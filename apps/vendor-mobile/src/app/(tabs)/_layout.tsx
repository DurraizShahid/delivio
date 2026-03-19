import { useEffect } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors } from "@/lib/theme";
import { api } from "@/lib/api";
import { useShopStore } from "@/stores/shop-store";
import type { Shop } from "@delivio/types";

export default function TabLayout() {
  const { setShops, setActiveShop, activeShop } = useShopStore();

  const { data } = useQuery<{ shops: Shop[] }>({
    queryKey: ["shops"],
    queryFn: () => api.shops.list(),
  });

  useEffect(() => {
    if (data?.shops) {
      setShops(data.shops);
      if (!activeShop && data.shops.length > 0) {
        setActiveShop(data.shops[0]);
      }
    }
  }, [data, activeShop, setShops, setActiveShop]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Orders",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: "Menu",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
