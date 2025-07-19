import { Stack } from "expo-router";
import { PaperProvider } from "react-native-paper";
import { ThemeProvider, useAppTheme } from "../theme/ThemeProvider";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

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
        </View>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootLayoutContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
