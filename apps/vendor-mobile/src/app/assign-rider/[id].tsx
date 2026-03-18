import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, borderRadius } from "@/lib/theme";
import { api } from "@/lib/api";

export default function AssignRiderScreen() {
  const { id: deliveryId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [riderId, setRiderId] = useState("");

  const assignMutation = useMutation({
    mutationFn: () => api.deliveries.assign(deliveryId!, riderId.trim()),
    onSuccess: () => {
      Alert.alert("Assigned", "Rider assigned successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      Alert.alert("Error", err?.message || "Failed to assign rider.");
    },
  });

  const handleAssign = () => {
    const trimmed = riderId.trim();
    if (!trimmed) {
      Alert.alert("Invalid", "Please enter a rider ID.");
      return;
    }
    assignMutation.mutate();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assign Rider</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Text style={styles.label}>Rider ID</Text>
        <TextInput
          style={styles.input}
          value={riderId}
          onChangeText={setRiderId}
          placeholder="Enter rider user ID"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.assignBtn, assignMutation.isPending && styles.assignBtnDisabled]}
          onPress={handleAssign}
          disabled={assignMutation.isPending}
          activeOpacity={0.8}
        >
          {assignMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text style={styles.assignBtnText}>Assign</Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { fontSize: fontSize.lg, fontWeight: "600", color: colors.foreground },
  content: { padding: spacing.lg },
  label: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    color: colors.foreground,
    marginBottom: spacing.xl,
  },
  assignBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: "center",
  },
  assignBtnDisabled: { opacity: 0.6 },
  assignBtnText: { color: colors.primaryForeground, fontSize: fontSize.base, fontWeight: "600" },
});
