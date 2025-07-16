import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useAppTheme } from "@/theme/ThemeProvider";
import Header from "@/components/Header";
import AlertTimePicker from "@/components/settings/AlertTimePicker";
import LogoutSection from "@/components/settings/LogoutSection";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthContext } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";

export default function Settings() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [defaultAlertOffset, setDefaultAlertOffset] = useState(60);
  const { logout } = useAuthContext();
  const router = useRouter();

  const handleAlertTimeChange = (value: number) => {
    setDefaultAlertOffset(value);
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/auth");
    } catch (error) {
      console.error("Logout error:", error);
      // Even if logout fails, redirect to auth screen
      router.replace("/auth");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Settings" variant="modal" />

      <View style={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
        <AlertTimePicker selectedValue={defaultAlertOffset} onValueChange={handleAlertTimeChange} />

        <LogoutSection onLogout={handleLogout} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    gap: 20,
  },
});
