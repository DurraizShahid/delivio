import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { colors, spacing, fontSize, borderRadius } from "@/lib/theme";

const PROJECT_REF = "default";

export default function LoginScreen() {
  const router = useRouter();
  const setCustomer = useAuthStore((s) => s.setCustomer);

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);

  const otpRefs = useRef<(TextInput | null)[]>([]);

  async function handleSendOTP() {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 8) {
      Alert.alert("Invalid phone", "Please enter a valid phone number.");
      return;
    }
    setLoading(true);
    try {
      await api.auth.sendOTP(`+${cleaned}`, PROJECT_REF);
      setStep("otp");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP() {
    const code = otp.join("");
    if (code.length !== 6) {
      Alert.alert("Invalid code", "Please enter the full 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      const cleaned = phone.replace(/\D/g, "");
      const { customer } = await api.auth.verifyOTP({
        phone: `+${cleaned}`,
        code,
        projectRef: PROJECT_REF,
      });
      setCustomer(customer);
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Invalid OTP code");
    } finally {
      setLoading(false);
    }
  }

  function handleOTPChange(text: string, index: number) {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOTPKeyPress(key: string, index: number) {
    if (key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.card}>
        <Text style={styles.logo}>Delivio</Text>
        <Text style={styles.subtitle}>
          {step === "phone"
            ? "Enter your phone number to get started"
            : "Enter the 6-digit code we sent you"}
        </Text>

        {step === "phone" ? (
          <>
            <View style={styles.phoneRow}>
              <View style={styles.prefixBox}>
                <Text style={styles.prefixText}>+</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="1 234 567 8900"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                autoFocus
              />
            </View>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSendOTP}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={styles.buttonText}>Send Code</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.otpRow}>
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(r) => {
                    otpRefs.current[i] = r;
                  }}
                  style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={digit}
                  onChangeText={(t) => handleOTPChange(t, i)}
                  onKeyPress={({ nativeEvent }) =>
                    handleOTPKeyPress(nativeEvent.key, i)
                  }
                  autoFocus={i === 0}
                />
              ))}
            </View>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleVerifyOTP}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={styles.buttonText}>Verify</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setStep("phone");
                setOtp(["", "", "", "", "", ""]);
              }}
            >
              <Text style={styles.backText}>Change phone number</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  logo: {
    fontSize: fontSize["3xl"],
    fontWeight: "800",
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
    textAlign: "center",
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: spacing.lg,
  },
  prefixBox: {
    height: 52,
    width: 44,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  prefixText: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.foreground,
  },
  phoneInput: {
    flex: 1,
    height: 52,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.lg,
    color: colors.foreground,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  otpBox: {
    width: 48,
    height: 56,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    textAlign: "center",
    fontSize: fontSize["2xl"],
    fontWeight: "700",
    color: colors.foreground,
    borderWidth: 2,
    borderColor: "transparent",
  },
  otpBoxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  button: {
    width: "100%",
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.base,
    fontWeight: "700",
  },
  backButton: {
    marginTop: spacing.lg,
  },
  backText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
});
