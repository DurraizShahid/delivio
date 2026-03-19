import { useEffect, useCallback } from "react";
import { Text, TextInput } from "react-native";
import { Stack, useSegments, useRouter } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import { useAuthStore } from "@/stores/auth-store";
import { useRiderAvailabilityLocation } from "@/lib/use-rider-availability";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 1 } },
});

function applyDefaultFont() {
  const style = { fontFamily: "Inter_400Regular" };
  const textProps = (Text as any).defaultProps || {};
  (Text as any).defaultProps = { ...textProps, style: [style, textProps.style] };
  const inputProps = (TextInput as any).defaultProps || {};
  (TextInput as any).defaultProps = { ...inputProps, style: [style, inputProps.style] };
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  const { hydrate, isAuthenticated, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    hydrate();
  }, []);

  const isActiveTab = segments[0] === "(tabs)" && segments[1] === "active";
  useRiderAvailabilityLocation(isActiveTab ? "active" : "background");

  const onLayoutReady = useCallback(async () => {
    if (fontsLoaded) {
      applyDefaultFont();
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    onLayoutReady();
  }, [onLayoutReady]);

  useEffect(() => {
    if (isLoading || !fontsLoaded) return;
    const inAuth = segments[0] === "login";
    if (!isAuthenticated && !inAuth) {
      router.replace("/login");
    } else if (isAuthenticated && inAuth) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, segments, fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
