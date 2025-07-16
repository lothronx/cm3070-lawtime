import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuthSession } from "@/hooks/useAuthSession";
import { View } from "react-native";
import { ActivityIndicator } from "react-native-paper";
import { useAppTheme } from "@/theme/ThemeProvider";

export default function Index() {
  const { isLoading, isAuthenticated } = useAuthSession();
  const { theme } = useAppTheme();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace("/(tabs)");
      } else {
        router.replace("/auth");
      }
    }
  }, [isLoading, isAuthenticated, router]);

  // Show loading spinner while determining auth status
  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center',
      backgroundColor: theme.colors.background 
    }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}