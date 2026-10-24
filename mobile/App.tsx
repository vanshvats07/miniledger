import { useState } from "react";
import { StatusBar, StyleSheet, View } from "react-native";

import { LoginScreen } from "./src/components/LoginScreen";
import { DashboardScreen } from "./src/components/DashboardScreen";

export default function App() {
  // Token is stored in memory for this basic version.
  const [token, setToken] = useState<string | null>(null);

  return (
    <View style={styles.app}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F5F7FA"
      />

      {token ? (
        <DashboardScreen
          token={token}
          onLogout={() => setToken(null)}
        />
      ) : (
        <LoginScreen onLoginSuccess={setToken} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
});