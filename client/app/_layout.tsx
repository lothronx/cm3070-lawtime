import { Stack } from "expo-router";
import { PaperProvider } from "react-native-paper";
import { ThemeProvider, useAppTheme } from "../theme/ThemeProvider";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, StatusBar, Platform, Text, TextInput } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Set default font family for all Text and TextInput components globally
const fontFamily = "Avenir";

// Override default props for Text and TextInput components using type assertions
(Text as any).defaultProps = (Text as any).defaultProps || {};
(Text as any).defaultProps.style = { fontFamily, ...((Text as any).defaultProps.style || {}) };

(TextInput as any).defaultProps = (TextInput as any).defaultProps || {};
(TextInput as any).defaultProps.style = {
  fontFamily,
  ...((TextInput as any).defaultProps.style || {}),
};

function RootLayoutContent() {
  const { theme, isDark } = useAppTheme();

  const [fontsLoaded] = useFonts({
    // For Android, using SpaceMono as fallback
    ...(Platform.OS === "android" && {
      Avenir: require("../assets/fonts/SpaceMono-Regular.ttf"),
    }),
  });

  useEffect(() => {
    if (fontsLoaded || Platform.OS === "ios") {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded && Platform.OS === "android") {
    return null;
  }

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
