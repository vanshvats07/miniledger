import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { addLoan } from "../api";

const NAVY = "#19324D";
const TEAL = "#148A78";

export function AddLoanModal({
  visible,
  token,
  onClose,
  onSaved,
}: {
  visible: boolean;
  token: string;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [friendName, setFriendName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setError("");
    const cleanName = friendName.trim();
    const cleanAmount = Number(amount);
    const cleanDate = dueDate.trim();

    if (!cleanName) {
      setError("Enter your friend's name.");
      return;
    }
    if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    // The backend checks that the date actually exists as well.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
      setError("Use the date format YYYY-MM-DD, for example 2026-11-05.");
      return;
    }

    setSaving(true);
    try {
      await addLoan(token, { friendName: cleanName, amount: cleanAmount, dueDate: cleanDate });
      setFriendName("");
      setAmount("");
      setDueDate("");
      onClose();
      await onSaved();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save this entry.");
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    if (saving) return;
    setError("");
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card}>
          <View style={styles.headingRow}>
            <View style={styles.headingCopy}>
              <Text style={styles.title}>Add a loan</Text>
              <Text style={styles.subtitle}>Keep the details simple and clear.</Text>
            </View>
            <Pressable onPress={handleClose} disabled={saving} style={styles.closeButton}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>FRIEND'S NAME</Text>
          <TextInput
            style={styles.input}
            value={friendName}
            onChangeText={setFriendName}
            placeholder="e.g. Rahul"
            placeholderTextColor="#97A3AE"
            maxLength={100}
            editable={!saving}
            returnKeyType="next"
          />

          <Text style={styles.label}>AMOUNT (₹)</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="e.g. 1500"
            placeholderTextColor="#97A3AE"
            keyboardType="decimal-pad"
            editable={!saving}
          />

          <Text style={styles.label}>DUE DATE</Text>
          <TextInput
            style={styles.input}
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#97A3AE"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            editable={!saving}
          />
          <Text style={styles.helper}>A past date is allowed, so you can record overdue loans too.</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [styles.saveButton, pressed && styles.pressed, saving && styles.disabled]}
          >
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Save entry</Text>}
          </Pressable>
          <Pressable onPress={handleClose} disabled={saving} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", backgroundColor: "rgba(18, 35, 52, 0.45)", padding: 18 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 22, padding: 22 },
  headingRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 18 },
  headingCopy: { flex: 1 },
  title: { color: NAVY, fontSize: 23, fontWeight: "800" },
  subtitle: { color: "#687787", fontSize: 13, marginTop: 5 },
  closeButton: { width: 30, height: 30, backgroundColor: "#F1F4F7", borderRadius: 10, alignItems: "center", justifyContent: "center" },
  closeText: { color: NAVY, fontSize: 24, lineHeight: 27 },
  label: { color: "#617080", fontSize: 10, fontWeight: "800", letterSpacing: 1, marginBottom: 7, marginTop: 5 },
  input: { color: NAVY, backgroundColor: "#F8FAFC", borderColor: "#DEE5EB", borderWidth: 1, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 12, fontSize: 15, marginBottom: 12 },
  helper: { color: "#7C8995", fontSize: 11, lineHeight: 16, marginBottom: 12, marginTop: -4 },
  error: { color: "#B83232", fontSize: 12, lineHeight: 17, marginBottom: 12 },
  saveButton: { backgroundColor: TEAL, minHeight: 48, borderRadius: 11, alignItems: "center", justifyContent: "center", marginTop: 3 },
  saveText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  cancelButton: { alignItems: "center", padding: 13, marginTop: 3 },
  cancelText: { color: NAVY, fontSize: 13, fontWeight: "700" },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.6 },
});
