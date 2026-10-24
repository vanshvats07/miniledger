import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getLoans, getSummary, markLoanRepaid } from "../api";
import type { Loan, LoanSummary } from "../types";
import { AddLoanModal } from "./AddLoanModal";

const NAVY = "#19324D";
const TEAL = "#148A78";
const MUTED = "#687787";
const RED = "#B83232";

const emptySummary: LoanSummary = {
  totalLent: 0,
  totalRepaid: 0,
  overdueAmount: 0,
};

function money(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

// Use the phone's local calendar date to compare YYYY-MM-DD values safely.
function localToday(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isOverdue(loan: Loan): boolean {
  return !loan.isRepaid && loan.dueDate < localToday();
}

function displayDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export function DashboardScreen({
  token,
  onLogout,
}: {
  token: string;
  onLogout: () => void;
}) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [summary, setSummary] = useState<LoanSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyLoanId, setBusyLoanId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Fetch entries and the summary together when this screen first opens.
  const loadDashboard = useCallback(async () => {
    setError("");
    try {
      const [loanRows, loanSummary] = await Promise.all([
        getLoans(token),
        getSummary(token),
      ]);
      setLoans(loanRows);
      setSummary(loanSummary);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load your ledger.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  async function handleMarkRepaid(loan: Loan) {
    Alert.alert(
      "Mark as repaid?",
      `Mark ${loan.friendName}'s ${money(loan.amount)} entry as repaid?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark repaid",
          onPress: async () => {
            setBusyLoanId(loan.id);
            setError("");
            try {
              await markLoanRepaid(token, loan.id);
              await loadDashboard();
            } catch (requestError) {
              setError(requestError instanceof Error ? requestError.message : "Could not update this entry.");
            } finally {
              setBusyLoanId(null);
            }
          },
        },
      ],
    );
  }

  function handleRefresh() {
    setRefreshing(true);
    void loadDashboard();
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={TEAL} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>MINILEDGER</Text>
            <Text style={styles.pageTitle}>Your ledger</Text>
            <Text style={styles.subtitle}>A clear view of money you've lent.</Text>
          </View>
          <Pressable onPress={onLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Your money, at a glance</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>TOTAL LENT</Text>
              <Text style={styles.summaryValue}>{money(summary.totalLent)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>REPAID</Text>
              <Text style={styles.summaryValue}>{money(summary.totalRepaid)}</Text>
            </View>
          </View>
          <View style={styles.summaryDivider} />
          <Text style={styles.summaryLabel}>OVERDUE · NOT YET REPAID</Text>
          <Text style={styles.overdueSummaryValue}>{money(summary.overdueAmount)}</Text>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Your entries</Text>
            <Text style={styles.sectionSubtitle}>{loans.length} {loans.length === 1 ? "entry" : "entries"} recorded</Text>
          </View>
          <Pressable
            onPress={() => setShowAddForm(true)}
            style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
          >
            <Text style={styles.addButtonText}>+ Add entry</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.errorMessage}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator size="large" color={TEAL} style={styles.loader} />
        ) : loans.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Your ledger starts here</Text>
            <Text style={styles.emptyText}>Add the first amount you've lent to a friend. You can update it when they repay you.</Text>
            <Pressable onPress={() => setShowAddForm(true)} style={styles.emptyButton}>
              <Text style={styles.emptyButtonText}>Add your first entry</Text>
            </Pressable>
          </View>
        ) : (
          loans.map((loan) => {
            const overdue = isOverdue(loan);
            const status = loan.isRepaid ? "REPAID" : overdue ? "OVERDUE" : "PENDING";
            return (
              <View key={loan.id} style={[styles.loanCard, overdue && styles.overdueCard]}>
                <View style={styles.loanTopRow}>
                  <View style={styles.friendInitial}>
                    <Text style={styles.friendInitialText}>{loan.friendName.trim().charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.friendDetails}>
                    <Text style={styles.friendName}>{loan.friendName}</Text>
                    <Text style={styles.dueDate}>Due {displayDate(loan.dueDate)}</Text>
                  </View>
                  <View style={[styles.statusPill, loan.isRepaid ? styles.repaidPill : overdue ? styles.overduePill : styles.pendingPill]}>
                    <Text style={[styles.statusText, overdue && styles.overdueStatusText]}>{status}</Text>
                  </View>
                </View>
                <View style={styles.loanBottomRow}>
                  <Text style={styles.loanAmount}>{money(loan.amount)}</Text>
                  {loan.isRepaid ? (
                    <Text style={styles.repaidNote}>Payment recorded</Text>
                  ) : (
                    <Pressable
                      onPress={() => handleMarkRepaid(loan)}
                      disabled={busyLoanId === loan.id}
                      style={({ pressed }) => [styles.repayButton, pressed && styles.pressed, busyLoanId === loan.id && styles.disabled]}
                    >
                      {busyLoanId === loan.id ? <ActivityIndicator color={TEAL} /> : <Text style={styles.repayButtonText}>Mark repaid</Text>}
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
        )}

        <Text style={styles.footerNote}>Pull down to refresh. Entries are private to your account.</Text>
      </ScrollView>

      <AddLoanModal
        visible={showAddForm}
        token={token}
        onClose={() => setShowAddForm(false)}
        onSaved={loadDashboard}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F7FA" },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22 },
  eyebrow: { color: TEAL, fontSize: 10, fontWeight: "800", letterSpacing: 2 },
  pageTitle: { color: NAVY, fontSize: 29, fontWeight: "800", marginTop: 5 },
  subtitle: { color: MUTED, fontSize: 13, marginTop: 5 },
  logoutButton: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: "#DCE3E9", backgroundColor: "#FFFFFF" },
  logoutText: { color: NAVY, fontWeight: "700", fontSize: 12 },
  summaryCard: { backgroundColor: NAVY, borderRadius: 20, padding: 20, marginBottom: 28 },
  summaryTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", marginBottom: 20 },
  summaryRow: { flexDirection: "row", gap: 14 },
  summaryItem: { flex: 1 },
  summaryLabel: { color: "#BCCAD6", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  summaryValue: { color: "#FFFFFF", fontSize: 20, fontWeight: "800", marginTop: 8 },
  summaryDivider: { height: 1, backgroundColor: "#41576D", marginVertical: 17 },
  overdueSummaryValue: { color: "#FFB6B6", fontSize: 24, fontWeight: "800", marginTop: 6 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { color: NAVY, fontSize: 20, fontWeight: "800" },
  sectionSubtitle: { color: MUTED, fontSize: 12, marginTop: 4 },
  addButton: { backgroundColor: TEAL, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 11 },
  addButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  pressed: { opacity: 0.78 },
  loader: { marginTop: 40 },
  errorMessage: { color: RED, backgroundColor: "#FFF0F0", padding: 12, borderRadius: 10, marginBottom: 12, overflow: "hidden" },
  emptyCard: { backgroundColor: "#FFFFFF", borderColor: "#E5EAF0", borderWidth: 1, borderRadius: 18, padding: 22, alignItems: "flex-start" },
  emptyTitle: { color: NAVY, fontSize: 17, fontWeight: "800" },
  emptyText: { color: MUTED, fontSize: 13, lineHeight: 20, marginTop: 8 },
  emptyButton: { marginTop: 18, paddingVertical: 11, paddingHorizontal: 14, backgroundColor: TEAL, borderRadius: 10 },
  emptyButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  loanCard: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E5EAF0", padding: 16, marginBottom: 12 },
  overdueCard: { borderColor: "#E9A5A5", backgroundColor: "#FFF9F9" },
  loanTopRow: { flexDirection: "row", alignItems: "center" },
  friendInitial: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#E3F3EF", alignItems: "center", justifyContent: "center" },
  friendInitialText: { color: TEAL, fontSize: 17, fontWeight: "800" },
  friendDetails: { flex: 1, marginLeft: 11 },
  friendName: { color: NAVY, fontSize: 15, fontWeight: "800" },
  dueDate: { color: MUTED, fontSize: 12, marginTop: 4 },
  statusPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  repaidPill: { backgroundColor: "#E2F6EC" },
  overduePill: { backgroundColor: "#FFE5E5" },
  pendingPill: { backgroundColor: "#FFF2D8" },
  statusText: { color: NAVY, fontSize: 9, letterSpacing: 0.5, fontWeight: "900" },
  overdueStatusText: { color: RED },
  loanBottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#EEF1F4", marginTop: 15, paddingTop: 13 },
  loanAmount: { color: NAVY, fontSize: 19, fontWeight: "800" },
  repayButton: { borderWidth: 1, borderColor: "#B7DCD4", backgroundColor: "#F0FAF7", borderRadius: 9, paddingHorizontal: 11, paddingVertical: 8, minWidth: 104, alignItems: "center" },
  repayButtonText: { color: TEAL, fontSize: 11, fontWeight: "800" },
  repaidNote: { color: TEAL, fontSize: 11, fontWeight: "700" },
  disabled: { opacity: 0.6 },
  footerNote: { color: "#8A97A4", fontSize: 11, textAlign: "center", marginTop: 18 },
});
