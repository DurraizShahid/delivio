import { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, Modal, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors, spacing, fontSize, borderRadius } from "@/lib/theme";
import { api } from "@/lib/api";
import type { Product, Category } from "@delivio/types";

function isValidHttpUrl(value: string) {
  if (!value.trim()) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ products: Product[] }>({
    queryKey: ["vendor-products"],
    queryFn: () => api.catalog.listProducts(),
  });

  const { data: catRes } = useQuery<{ categories: Category[] }>({
    queryKey: ["catalog", "categories"],
    queryFn: () => api.catalog.listCategories(),
  });

  const product = useMemo(
    () => (data?.products ?? []).find((p) => p.id === id) ?? null,
    [data, id]
  );

  const [name, setName] = useState("");
  const [priceCents, setPriceCents] = useState("");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [available, setAvailable] = useState(true);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const categoryOptions = useMemo(
    () => (catRes?.categories ?? []).map((c) => c.name).sort(),
    [catRes]
  );
  const imageUrlValid = isValidHttpUrl(imageUrl);

  useEffect(() => {
    if (!product) return;
    setName(product.name ?? "");
    setPriceCents(String(product.priceCents ?? ""));
    setCategory(product.category ?? "");
    setImageUrl(product.imageUrl ?? "");
    setDescription(product.description ?? "");
    setAvailable(!!product.available);
  }, [product]);

  const updateMutation = useMutation({
    mutationFn: async () =>
      api.catalog.updateProduct(id!, {
        name: name.trim(),
        priceCents: Number(priceCents),
        category: category.trim() || null,
        imageUrl: imageUrl.trim() || null,
        description: description.trim() || null,
        available,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["vendor-products"] });
      await qc.invalidateQueries({ queryKey: ["catalog", "categories"] });
      router.back();
    },
    onError: (err: unknown) => {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : "Failed to update product";
      Alert.alert("Error", message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => api.catalog.deleteProduct(id!),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["vendor-products"] });
      await qc.invalidateQueries({ queryKey: ["catalog", "categories"] });
      router.back();
    },
    onError: (err: unknown) => {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : "Failed to delete product";
      Alert.alert("Error", message);
    },
  });

  const title = product ? `Edit ${product.name}` : "Edit Product";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: true, title }} />

      {isLoading ? (
        <View style={styles.content}>
          <Text style={styles.muted}>Loading...</Text>
        </View>
      ) : !product ? (
        <View style={styles.content}>
          <Text style={styles.muted}>Product not found</Text>
        </View>
      ) : (
        <View style={styles.content}>
          <Field label="Name">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Burger"
              placeholderTextColor={colors.mutedForeground}
              style={styles.input}
            />
          </Field>
          <Field label="Price (cents)">
            <TextInput
              value={priceCents}
              onChangeText={(v) => setPriceCents(v.replace(/[^\d]/g, ""))}
              placeholder="e.g. 1299"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              style={styles.input}
            />
          </Field>
          <Field label="Category (optional)">
            <TouchableOpacity
              style={styles.picker}
              activeOpacity={0.8}
              onPress={() => setCategoryPickerOpen(true)}
            >
              <Text style={styles.pickerText}>
                {category.trim() ? category : categoryOptions.length ? "Select a category" : "Type a category"}
              </Text>
            </TouchableOpacity>
            <TextInput
              value={category}
              onChangeText={setCategory}
              placeholder="Or type a category"
              placeholderTextColor={colors.mutedForeground}
              style={styles.input}
            />
          </Field>
          <Field label="Image URL (optional)">
            <TextInput
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="https://..."
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              style={styles.input}
            />
            {!imageUrlValid && (
              <Text style={styles.errorText}>Please enter a valid http(s) URL</Text>
            )}
            {!!imageUrl.trim() && imageUrlValid && (
              <View style={styles.previewWrap}>
                <Image
                  source={{ uri: imageUrl.trim() }}
                  style={styles.preview}
                  resizeMode="cover"
                />
              </View>
            )}
          </Field>
          <Field label="Description (optional)">
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Short description"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, styles.multiline]}
              multiline
            />
          </Field>

          <TouchableOpacity
            style={[styles.toggle, available ? styles.toggleOn : styles.toggleOff]}
            onPress={() => setAvailable((v) => !v)}
            activeOpacity={0.8}
          >
            <Text style={styles.toggleText}>
              {available ? "Available" : "Unavailable"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primary, updateMutation.isPending && styles.disabled]}
            onPress={() => updateMutation.mutate()}
            disabled={
              updateMutation.isPending ||
              !name.trim() ||
              !priceCents ||
              Number.isNaN(Number(priceCents)) ||
              !imageUrlValid
            }
            activeOpacity={0.85}
          >
            <Text style={styles.primaryText}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.danger, deleteMutation.isPending && styles.disabled]}
            onPress={() => {
              Alert.alert(
                "Delete product?",
                "This cannot be undone.",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate() },
                ]
              );
            }}
            disabled={deleteMutation.isPending}
            activeOpacity={0.85}
          >
            <Text style={styles.dangerText}>
              {deleteMutation.isPending ? "Deleting..." : "Delete Product"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={categoryPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select category</Text>
            <FlatList
              data={categoryOptions}
              keyExtractor={(c) => c}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalRow}
                  onPress={() => {
                    setCategory(item);
                    setCategoryPickerOpen(false);
                  }}
                >
                  <Text style={styles.modalRowText}>{item}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.mutedText}>No categories yet</Text>
              }
            />
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setCategoryPickerOpen(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.lg },
  muted: { color: colors.mutedForeground },
  field: { gap: spacing.xs },
  label: { fontSize: fontSize.sm, fontWeight: "600", color: colors.foreground },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    color: colors.foreground,
  },
  multiline: { minHeight: 90, textAlignVertical: "top" },
  picker: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  pickerText: { color: colors.foreground, fontSize: fontSize.base },
  errorText: { color: colors.destructive, fontSize: fontSize.xs },
  previewWrap: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    backgroundColor: colors.muted,
  },
  preview: { width: "100%", height: 160 },
  toggle: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderWidth: 1,
  },
  toggleOn: { backgroundColor: colors.success + "22", borderColor: colors.success },
  toggleOff: { backgroundColor: colors.muted, borderColor: colors.border },
  toggleText: { color: colors.foreground, fontWeight: "700" },
  primary: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: "center",
  },
  danger: {
    backgroundColor: colors.destructive,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: "center",
  },
  disabled: { opacity: 0.6 },
  primaryText: { color: colors.primaryForeground, fontWeight: "700", fontSize: fontSize.base },
  dangerText: { color: "#fff", fontWeight: "700", fontSize: fontSize.base },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: "70%",
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: "700", color: colors.foreground, marginBottom: spacing.md },
  modalRow: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalRowText: { color: colors.foreground, fontSize: fontSize.base },
  mutedText: { color: colors.mutedForeground, paddingVertical: spacing.md },
  modalClose: {
    marginTop: spacing.md,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCloseText: { color: colors.foreground, fontWeight: "700" },
});

