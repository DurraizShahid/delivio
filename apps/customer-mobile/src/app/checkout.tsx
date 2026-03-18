import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { useCartStore } from "@/stores/cart-store";
import { colors, spacing, fontSize, borderRadius } from "@/lib/theme";

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

const DELIVERY_FEE_CENTS = 299;

export default function CheckoutScreen() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const totalCents = useCartStore((s) => s.totalCents());
  const clear = useCartStore((s) => s.clear);

  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const grandTotal = totalCents + DELIVERY_FEE_CENTS;

  async function handlePlaceOrder() {
    if (!address.trim()) {
      Alert.alert("Address required", "Please enter a delivery address.");
      return;
    }
    if (items.length === 0) {
      Alert.alert("Empty cart", "Add items to your cart before checking out.");
      return;
    }

    setLoading(true);
    try {
      await api.payments.createIntent({
        amountCents: grandTotal,
        currency: "usd",
        metadata: {
          address: address.trim(),
          notes: notes.trim(),
          items: JSON.stringify(
            items.map((i) => ({
              productId: i.productId,
              name: i.name,
              quantity: i.quantity,
              unitPriceCents: i.unitPriceCents,
            }))
          ),
        },
      });
      clear();
      Alert.alert("Order Placed!", "Your order has been placed successfully.", [
        {
          text: "View Orders",
          onPress: () => router.replace("/(tabs)/orders"),
        },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Checkout",
          headerBackTitle: "Back",
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <TextInput
            style={styles.addressInput}
            placeholder="Enter your delivery address"
            placeholderTextColor={colors.mutedForeground}
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={2}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Notes</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Any special instructions? (optional)"
            placeholderTextColor={colors.mutedForeground}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
            {items.map((item) => (
              <View key={item.id} style={styles.summaryItem}>
                <Text style={styles.summaryItemText} numberOfLines={1}>
                  {item.quantity}x {item.name}
                </Text>
                <Text style={styles.summaryItemPrice}>
                  {formatPrice(item.unitPriceCents * item.quantity)}
                </Text>
              </View>
            ))}

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatPrice(totalCents)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery fee</Text>
              <Text style={styles.summaryValue}>
                {formatPrice(DELIVERY_FEE_CENTS)}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatPrice(grandTotal)}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.placeOrderButton, loading && styles.buttonDisabled]}
          onPress={handlePlaceOrder}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <>
              <Ionicons
                name="bag-check-outline"
                size={20}
                color={colors.primaryForeground}
              />
              <Text style={styles.placeOrderText}>
                Place Order — {formatPrice(grandTotal)}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  addressInput: {
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    color: colors.foreground,
    minHeight: 56,
    textAlignVertical: "top",
  },
  notesInput: {
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    color: colors.foreground,
    minHeight: 56,
    textAlignVertical: "top",
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  summaryItemText: {
    fontSize: fontSize.sm,
    color: colors.foreground,
    flex: 1,
    marginRight: spacing.md,
  },
  summaryItemPrice: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    color: colors.foreground,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  summaryValue: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    color: colors.foreground,
  },
  totalLabel: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.foreground,
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontWeight: "800",
    color: colors.foreground,
  },
  placeOrderButton: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  placeOrderText: {
    color: colors.primaryForeground,
    fontSize: fontSize.base,
    fontWeight: "700",
  },
});
