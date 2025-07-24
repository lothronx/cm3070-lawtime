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
import { supabase } from "@/utils/supabase";

// Profile type based on database schema
interface UserProfile {
  id: string;
  status: string;
  default_alert_offset_minutes: number;
  updated_at: string;
}

export default function Settings() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { logout } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const router = useRouter();

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setProfileLoading(true);
      // Use the exact API specification format
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .single();

      if (error) {
        console.error('Profile load error:', error);
        setSnackbarMessage(`Failed to load settings: ${error.message}`);
        setSnackbarVisible(true);
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error('Profile load exception:', err);
      setSnackbarMessage('Failed to load settings');
      setSnackbarVisible(true);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAlertTimeChange = async (value: number) => {
    if (!profile) return;

    try {
      // Follow API specification format exactly
      const { data, error } = await supabase
        .from('profiles')
        .update({ default_alert_offset_minutes: value })
        .eq('id', profile.id)
        .select()
        .single();

      if (error) {
        console.error('Settings update error:', error);
        setSnackbarMessage(`Failed to save settings: ${error.message}`);
        setSnackbarVisible(true);
      } else {
        setProfile(data);
        setSnackbarMessage("Settings saved successfully");
        setSnackbarVisible(true);
      }
    } catch (err) {
      console.error('Settings update exception:', err);
      setSnackbarMessage('Failed to save settings');
      setSnackbarVisible(true);
    }
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
