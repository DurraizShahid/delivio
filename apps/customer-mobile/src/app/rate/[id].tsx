import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { colors, spacing, fontSize, borderRadius } from "@/lib/theme";
import type { Order } from "@delivio/types";

export default function RateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [vendorRating, setVendorRating] = useState(0);
  const [riderRating, setRiderRating] = useState(0);
  const [comment, setComment] = useState("");
  const [tipAmount, setTipAmount] = useState<number | null>(null);
  const [customTip, setCustomTip] = useState("");
  const [showCustomTip, setShowCustomTip] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ["order", id],
    queryFn: () => api.orders.get(id!),
    enabled: !!id,
  });

  const handleSubmit = async () => {
    if (!order) return;
    const vendorId = order.vendorId;
    const riderId = order.delivery?.riderId;
    if (!vendorId && !riderId) {
      Alert.alert("Error", "Unable to rate this order.");
      return;
    }
    if ((vendorId && vendorRating === 0) || (riderId && riderRating === 0)) {
      Alert.alert(
        "Rating required",
        vendorId && riderId
          ? "Please rate both food and delivery."
          : vendorId
            ? "Please rate the food."
            : "Please rate the delivery."
      );
      return;
    }
    let tipCents = 0;
    if (tipAmount !== null) {
      tipCents = tipAmount * 100;
    } else if (showCustomTip && customTip.trim()) {
      const parsed = parseFloat(customTip.replace(/[^0-9.]/g, ""));
      if (!isNaN(parsed) && parsed > 0) {
        tipCents = Math.round(parsed * 100);
      }
    }
    setSubmitting(true);
    try {
      if (vendorId && vendorRating > 0) {
        await api.ratings.create({
          orderId: order.id,
          toUserId: vendorId,
          toRole: "vendor",
          rating: vendorRating,
          comment: comment.trim() || undefined,
        });
      }
      if (riderId && riderRating > 0) {
        await api.ratings.create({
          orderId: order.id,
          toUserId: riderId,
          toRole: "rider",
          rating: riderRating,
          comment: comment.trim() || undefined,
        });
      }
      if (riderId && tipCents > 0) {
        await api.tips.create({
          orderId: order.id,
          toRiderId: riderId,
          amountCents: tipCents,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      router.replace("/(tabs)/orders");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTipPress = (amount: number | "custom") => {
    if (amount === "custom") {
      setShowCustomTip(true);
      setTipAmount(null);
      setCustomTip("");
    } else {
      setShowCustomTip(false);
      setTipAmount(tipAmount === amount ? null : amount);
    }
  };

  if (isLoading || !order) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: "Rate Order" }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Rate Order",
          headerBackTitle: "Back",
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>How was your experience?</Text>

        <Text style={styles.label}>Food / Vendor</Text>
        <View style={styles.starRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity
              key={n}
              onPress={() => setVendorRating(n)}
              style={styles.starButton}
              activeOpacity={0.7}
            >
              <Ionicons
                name={n <= vendorRating ? "star" : "star-outline"}
                size={32}
                color={n <= vendorRating ? colors.warning : colors.mutedForeground}
              />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Delivery / Rider</Text>
        <View style={styles.starRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity
              key={n}
              onPress={() => setRiderRating(n)}
              style={styles.starButton}
              activeOpacity={0.7}
            >
              <Ionicons
                name={n <= riderRating ? "star" : "star-outline"}
                size={32}
                color={n <= riderRating ? colors.warning : colors.mutedForeground}
              />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Comment (optional)</Text>
        <TextInput
          style={styles.commentInput}
          placeholder="How was your order?"
          placeholderTextColor={colors.mutedForeground}
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Tip for rider (optional)</Text>
        <View style={styles.tipRow}>
          {[1, 2, 5].map((amount) => (
            <TouchableOpacity
              key={amount}
              style={[
                styles.tipButton,
                tipAmount === amount && !showCustomTip && styles.tipButtonActive,
              ]}
              onPress={() => handleTipPress(amount)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tipText,
                  tipAmount === amount && !showCustomTip && styles.tipTextActive,
                ]}
              >
                £{amount}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[
              styles.tipButton,
              showCustomTip && styles.tipButtonActive,
            ]}
            onPress={() => handleTipPress("custom")}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tipText,
                showCustomTip && styles.tipTextActive,
              ]}
            >
              Custom
            </Text>
          </TouchableOpacity>
        </View>
        {showCustomTip && (
          <TextInput
            style={styles.customTipInput}
            placeholder="Enter amount (£)"
            placeholderTextColor={colors.mutedForeground}
            value={customTip}
            onChangeText={setCustomTip}
            keyboardType="decimal-pad"
          />
        )}

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <Text style={styles.submitText}>Submit</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  heading: {
    fontSize: fontSize.xl,
    fontWeight: "800",
    color: colors.foreground,
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  starRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  starButton: {
    padding: spacing.xs,
  },
  commentInput: {
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    color: colors.foreground,
    minHeight: 80,
    textAlignVertical: "top",
  },
  tipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  tipButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
  },
  tipButtonActive: {
    backgroundColor: colors.primary,
  },
  tipText: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.foreground,
  },
  tipTextActive: {
    color: colors.primaryForeground,
  },
  customTipInput: {
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    color: colors.foreground,
    marginTop: spacing.md,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.xl,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: colors.primaryForeground,
    fontSize: fontSize.base,
    fontWeight: "700",
  },
});
