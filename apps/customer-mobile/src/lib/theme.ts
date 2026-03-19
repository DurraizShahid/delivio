import type { ColorSchemeName } from "react-native";

export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extrabold: "Inter_800ExtraBold",
};

export type AppColors = typeof lightColors;

export const lightColors = {
  primary: "#111111",
  primaryForeground: "#FAFAFA",
  background: "#FFFFFF",
  foreground: "#0A0A0A",
  card: "#FFFFFF",
  cardForeground: "#0A0A0A",
  muted: "#F5F5F5",
  mutedForeground: "#737373",
  border: "#E5E5E5",
  destructive: "#EF4444",
  success: "#22C55E",
  warning: "#EAB308",
  accent: "#F5F5F5",
};

export const darkColors: AppColors = {
  primary: "#FAFAFA",
  primaryForeground: "#111111",
  background: "#0A0A0A",
  foreground: "#FAFAFA",
  card: "#171717",
  cardForeground: "#FAFAFA",
  muted: "#262626",
  mutedForeground: "#A3A3A3",
  border: "#262626",
  destructive: "#DC2626",
  success: "#16A34A",
  warning: "#CA8A04",
  accent: "#262626",
};

/** @deprecated Use getColors() instead */
export const colors = lightColors;

export function getColors(scheme: ColorSchemeName | "light" | "dark"): AppColors {
  return scheme === "dark" ? darkColors : lightColors;
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const fontSize = { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, "2xl": 24, "3xl": 30 };
export const borderRadius = { sm: 6, md: 8, lg: 12, xl: 16, full: 9999 };
