import { MD3LightTheme, MD3DarkTheme } from "react-native-paper";
import type { MD3Theme } from "react-native-paper";

// Custom color palette for LawTime app
const customColors = {
  primary: "#2c404a", // Primary color
  darkBlue: "#1f2a2d", // Dark blue
  lightBlue: "#3e5a66", // Light blue
  secondary: "#ffa02d", // Accent color (orange)
  // Derived colors
  primaryContainer: "#f4f7f9",
  onPrimary: "#FFFFFF",
  onPrimaryContainer: "#1f2a2d",
  secondaryContainer: "#ffaf3f",
  onSecondary: "#FFFFFF",
  onSecondaryContainer: "#1A1A1A",
  // Surface colors for professional look
  surface: "#FEFBFF",
  surfaceVariant: "#F4F6F7",
  onSurface: "#1A1C1E",
  onSurfaceVariant: "#42474E",
  // Background colors
  background: "#FEFBFF",
  onBackground: "#1A1C1E",
  // Error colors
  error: "#BA1A1A",
  onError: "#FFFFFF",
  errorContainer: "#1f2a2da0",
  onErrorContainer: "#F4F6F7",
  // Outline colors
  outline: "#72777F",
  outlineVariant: "#C2C7CE",
  // Other semantic colors
  shadow: "#000000",
  scrim: "#000000",
  inverseSurface: "#2F3033",
  inverseOnSurface: "#F1F0F4",
  inversePrimary: "#A6C8D4",
  elevation: {
    level0: "transparent",
    level1: "#F7F9FA",
    level2: "#F2F5F7",
    level3: "#ECF1F4",
    level4: "#EAEFF2",
    level5: "#E6ECF0",
  },
  surfaceDisabled: "rgba(26, 28, 30, 0.12)",
  onSurfaceDisabled: "rgba(26, 28, 30, 0.38)",
  backdrop: "rgba(42, 47, 78, 0.4)",
};

const customDarkColors = {
  primary: "#7A9AA8", // Lighter version of primary for dark mode
  darkBlue: "#3e5a66", // Becomes lighter in dark mode
  lightBlue: "#5A7A88", // Lighter blue for dark mode
  secondary: "#e28f2a", // Muted orange for dark mode
  // Derived colors for dark mode
  primaryContainer: "#1f2a2d",
  onPrimary: "#0A0E10",
  onPrimaryContainer: "#7A9AA8",
  secondaryContainer: "#cc7a1f",
  onSecondary: "#1A1A1A",
  onSecondaryContainer: "#fff4e2",
  // Surface colors for dark mode
  surface: "#121212", // Pure Material dark surface
  surfaceVariant: "#42474E",
  onSurface: "#E2E2E6",
  onSurfaceVariant: "#C2C7CE",
  // Background colors for dark mode
  background: "#121212",
  onBackground: "#E2E2E6",
  // Error colors for dark mode
  error: "#FFB4AB",
  onError: "#690005",
  errorContainer: "#93000A",
  onErrorContainer: "#FFDAD6",
  // Outline colors for dark mode
  outline: "#8C9199",
  outlineVariant: "#42474E",
  // Other semantic colors for dark mode
  shadow: "#000000",
  scrim: "#000000",
  inverseSurface: "#E2E2E6",
  inverseOnSurface: "#2F3033",
  inversePrimary: "#2c404a",
  elevation: {
    level0: "transparent",
    level1: "#1D2024",
    level2: "#24272C",
    level3: "#2C3137",
    level4: "#2E3439",
    level5: "#31373D",
  },
  surfaceDisabled: "rgba(226, 226, 230, 0.12)",
  onSurfaceDisabled: "rgba(226, 226, 230, 0.38)",
  backdrop: "rgba(0, 0, 0, 0.6)", // Different backdrop for dark mode
};

// Light theme configuration
export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...customColors,
  },
};

// Dark theme configuration
export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...customDarkColors,
  },
};

// Default theme (can be light or dark based on preference)
export const theme = lightTheme;

// Export both themes for potential theme switching functionality
export { lightTheme as defaultLightTheme, darkTheme as defaultDarkTheme };

// Export custom colors for direct use in components
export { customColors, customDarkColors };
