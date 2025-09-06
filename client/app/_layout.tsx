import { Stack } from "expo-router";
import { PaperProvider } from "react-native-paper";
import { ThemeProvider, useAppTheme } from "../theme/ThemeProvider";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProcessingOverlay } from "@/components/ProcessingOverlay";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Create QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Smart retry logic - don't retry auth errors, do retry network errors
      retry: (failureCount, error) => {
        // Don't retry authentication errors - redirect to login instead
        if (
          error.message.includes("Authentication error") ||
          error.message.includes("No authenticated user")
        ) {
          return false;
        }
        // Retry network/server errors up to 3 times
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Network error handling optimized for mobile usage
      networkMode: "offlineFirst",

      // Conservative refetch settings for battery life
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,

      // Default cache times - overridden by individual queries
      staleTime: 10 * 60 * 1000, // 10 minutes default
      gcTime: 2 * 60 * 60 * 1000, // 2 hours default
    },
    mutations: {
      // Retry critical mutations that might fail due to network
      retry: 1,
      networkMode: "offlineFirst",
    },
  },
});

/**
 * Inner layout component that handles the app shell structure
 * and provides access to the theme context
 */
function RootLayoutContent() {
  const { theme, isDark } = useAppTheme();

  useEffect(() => {
    // Hide splash screen immediately since we're using system fonts
    SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={theme}>
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <StatusBar
            barStyle={isDark ? "light-content" : "dark-content"}
            backgroundColor={theme.colors.background}
            translucent={true}
          />
          <Stack screenOptions={{ headerShown: false }} />
          <ProcessingOverlay />
        </View>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <RootLayoutContent />
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
