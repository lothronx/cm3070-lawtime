import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Snackbar } from "react-native-paper";
import { useAppTheme } from "@/theme/ThemeProvider";
import Header from "@/components/Header";
import AlertTimePicker from "@/components/settings/AlertTimePicker";
import LogoutSection from "@/components/settings/LogoutSection";
import LoadingComponent from "@/components/LoadingComponent";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/useAuthStore";

export default function Settings() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  // Use consolidated auth store for profile management
  const { 
    profile, 
    profileLoading, 
    profileError, 
    loadProfile, 
    updateProfile, 
    clearProfileError,
    logout 
  } = useAuthStore();
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const router = useRouter();

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Handle error state changes
  useEffect(() => {
    if (profileError) {
      setSnackbarMessage(profileError);
      setSnackbarVisible(true);
      clearProfileError(); // Clear error after showing snackbar
    }
  }, [profileError, clearProfileError]);

  const handleAlertTimeChange = async (value: number) => {
    if (!profile) return;

    await updateProfile({
      default_alert_offset_minutes: value,
    });

    // Show success message if no error occurred
    if (!useAuthStore.getState().profileError) {
      setSnackbarMessage("Settings saved successfully");
      setSnackbarVisible(true);
    }
  };

  const handleLogout = async () => {
    try {
      await logout(); // Consolidated logout clears both auth and profile
      router.replace("/auth");
    } catch (error) {
      console.error("Logout error:", error);
      // Even if logout fails, redirect to auth screen
      router.replace("/auth");
    }
  };

  if (profileLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header title="Settings" variant="modal" />
        <LoadingComponent variant="settings" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Settings" variant="modal" />

      <ScrollView style={[styles.scrollContainer, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.content}>
          <AlertTimePicker
            selectedValue={profile?.default_alert_offset_minutes || 1440}
            onValueChange={handleAlertTimeChange}
            disabled={profileLoading}
          />

          <LogoutSection onLogout={handleLogout} />
        </View>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2000}
        style={{
          backgroundColor:
            snackbarMessage.includes("successfully") || snackbarMessage.includes("passed")
              ? theme.colors.secondary
              : theme.colors.error,
        }}>
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 20,
  },
});
