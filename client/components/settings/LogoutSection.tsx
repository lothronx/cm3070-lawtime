import React from "react";
import { StyleSheet } from "react-native";
import { Text, Button, Surface } from "react-native-paper";
import { useAppTheme } from "@/theme/ThemeProvider";

interface LogoutSectionProps {
  onLogout: () => void;
}

const LogoutSection: React.FC<LogoutSectionProps> = ({ onLogout }) => {
  const { theme } = useAppTheme();

  return (
    <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={1}>
      <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Account</Text>

      <Button
        mode="contained"
        onPress={onLogout}
        style={styles.logoutButton}
        buttonColor={theme.colors.secondary}
        textColor={theme.colors.onSecondary}>
        Logout
      </Button>
    </Surface>
  );
};

export default LogoutSection;

const styles = StyleSheet.create({
  section: {
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  logoutButton: {
    marginTop: 8,
  },
});