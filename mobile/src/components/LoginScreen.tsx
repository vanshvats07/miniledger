import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { sendOtp, verifyOtp } from "../api";

const NAVY = "#19324D";
const TEAL = "#148A78";

export function LoginScreen({ onLoginSuccess }: { onLoginSuccess: (token: string) => void }) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleSendOtp() {
    setError("");
    setNotice("");
    if (!phone.trim()) {
      setError("Enter your phone number first.");
      return;
    }

    setBusy(true);
    try {
      const result = await sendOtp(phone.trim());
      setOtpSent(true);
      setNotice(result.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not send OTP.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp() {
    setError("");
    setNotice("");
    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Enter the 6-digit OTP shown in the backend terminal.");
      return;
    }

    setBusy(true);
    try {
      const result = await verifyOtp(phone.trim(), otp.trim());
      onLoginSuccess(result.token);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not verify OTP.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.mark}><Text style={styles.markText}>M</Text></View>
      <Text style={styles.brand}>MiniLedger</Text>
      <Text style={styles.headline}>Keep money matters simple.</Text>
      <Text style={styles.subheading}>A small, clear record of money you've lent to friends.</Text>

      <View style={styles.form}>
        <Text style={styles.label}>PHONE NUMBER</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="e.g. +91 98765 43210"
          placeholderTextColor="#9AA5B1"
          keyboardType="phone-pad"
          autoCapitalize="none"
          editable={!busy}
          style={styles.input}
        />

        {otpSent && (
          <>
            <Text style={styles.label}>6-DIGIT OTP</Text>
            <TextInput
              value={otp}
              onChangeText={(value) => setOtp(value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Enter the code from your server terminal"
              placeholderTextColor="#9AA5B1"
              keyboardType="number-pad"
              maxLength={6}
              editable={!busy}
              style={styles.input}
            />
          </>
        )}

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={otpSent ? handleVerifyOtp : handleSendOtp}
          disabled={busy}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, busy && styles.disabled]}
        >
          {busy ? <ActivityIndicator color="#FFFFFF" /> : (
            <Text style={styles.primaryButtonText}>{otpSent ? "Verify and continue" : "Send mock OTP"}</Text>
          )}
        </Pressable>

        {otpSent && (
          <Pressable onPress={handleSendOtp} disabled={busy} style={styles.resendButton}>
            <Text style={styles.resendText}>Generate a new OTP</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.footer}>DEMO LOGIN · OTP IS PRINTED BY THE BACKEND</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: "center", paddingHorizontal: 26, paddingVertical: 24, backgroundColor: "#F5F7FA" },
  mark: { width: 54, height: 54, borderRadius: 16, backgroundColor: NAVY, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  markText: { color: "#FFFFFF", fontSize: 28, fontWeight: "800" },
  brand: { color: NAVY, fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  headline: { color: NAVY, fontSize: 24, fontWeight: "700", marginTop: 26, lineHeight: 31 },
  subheading: { color: "#687787", fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 28 },
  form: { backgroundColor: "#FFFFFF", padding: 20, borderRadius: 20, borderWidth: 1, borderColor: "#E8EDF2" },
  label: { color: "#617080", fontSize: 11, fontWeight: "800", letterSpacing: 1, marginBottom: 8, marginTop: 6 },
  input: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#DEE5EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: NAVY, marginBottom: 16 },
  primaryButton: { minHeight: 50, borderRadius: 12, backgroundColor: TEAL, alignItems: "center", justifyContent: "center", marginTop: 2 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.65 },
  notice: { color: TEAL, marginBottom: 12, fontSize: 13, lineHeight: 18 },
  error: { color: "#B83232", marginBottom: 12, fontSize: 13, lineHeight: 18 },
  resendButton: { alignItems: "center", paddingTop: 14 },
  resendText: { color: NAVY, fontWeight: "700", fontSize: 13 },
  footer: { color: "#93A0AB", textAlign: "center", fontSize: 10, letterSpacing: 1.2, marginTop: 24 },
});
