import { MD3LightTheme, MD3DarkTheme } from "react-native-paper";
import type { MD3Theme } from "react-native-paper";
import { Platform } from 'react-native';

// LawTime Color Schema - Blue-Teal Professional Theme
// Base palette: Dark Blue, Teal, Clean Neutrals

const customColors = {
  // Primary colors - Dark Blue (#013364) for authority and trust
  primary: "#013364", // Dark blue - primary brand color
  primaryContainer: "#e3f2fd", // Very light blue container
  onPrimary: "#ffffff", // White text on dark blue
  onPrimaryContainer: "#013364", // Dark blue text on light blue
  
  // Secondary colors - Light Blue (#428bca) for secondary actions
  secondary: "#428bca", // Light blue for secondary elements - complements primary blue
  secondaryContainer: "#e3f2fd", // Very light blue container
  onSecondary: "#ffffff", // White text on light blue
  onSecondaryContainer: "#1976d2", // Dark blue text on light blue container
  
  // Surface colors for clean look
  surface: "#fefeffff", // Pure white for main surfaces
  surfaceVariant: "#fafafa", // Neutral light gray for variant surfaces
  onSurface: "#013364", // Dark blue text on white
  onSurfaceVariant: "#37474f", // Dark blue-gray text on light surfaces
  
  // Background colors
  background: "#ffffff", // Pure white background
  onBackground: "#013364", // Dark blue text on white background
  
  // Error colors - Red (#d32f2f) for clear error indication
  error: "#d32f2f", // Standard red for errors - clear and recognizable
  onError: "#ffffff", // White text on red
  errorContainer: "#ffebee", // Very light red container
  onErrorContainer: "#c62828", // Dark red text on light container
  
  // Outline colors
  outline: "#90a4ae", // Blue-gray for borders and dividers
  outlineVariant: "#90caf9", // Lighter blue for subtle outlines - complements secondary color
  
  // Other semantic colors
  shadow: "#000000", // Black shadow
  scrim: "rgba(1, 51, 100, 0.6)", // Dark blue scrim with transparency
  inverseSurface: "#013364", // Dark blue inverse surface
  inverseOnSurface: "#ffffff", // White on dark blue
  inversePrimary: "#64b5f6", // Light blue as inverse primary
  
  // Elevation levels with neutral tints
  elevation: {
    level0: "transparent",
    level1: "rgba(0, 0, 0, 0.05)", // Very subtle shadow
    level2: "rgba(0, 0, 0, 0.08)",
    level3: "rgba(0, 0, 0, 0.11)",
    level4: "rgba(0, 0, 0, 0.12)",
    level5: "rgba(0, 0, 0, 0.14)",
  },
  
  // Disabled states
  surfaceDisabled: "rgba(0, 0, 0, 0.12)", // Disabled surface with neutral tint
  onSurfaceDisabled: "rgba(0, 0, 0, 0.38)", // Disabled text with neutral opacity
  backdrop: "rgba(0, 0, 0, 0.4)", // Neutral backdrop
};

const customDarkColors = {
  // Primary colors - Brighter blue for dark mode contrast
  primary: "#2196f3", // Brighter blue for dark mode
  primaryContainer: "#0d47a1", // Dark blue container
  onPrimary: "#ffffff", // White text on blue
  onPrimaryContainer: "#bbdefb", // Light blue text on dark container
  
  // Secondary colors - Light Blue for dark mode
  secondary: "#64b5f6", // Brighter light blue for dark mode contrast
  secondaryContainer: "#0d47a1", // Dark blue secondary container
  onSecondary: "#000000", // Black text on light blue
  onSecondaryContainer: "#bbdefb", // Light blue text on dark container
  
  // Surface colors for dark mode
  surface: "#1e1e1e", // Dark surface
  surfaceVariant: "#424242", // Dark gray variant surface
  onSurface: "#ffffff", // White text on dark surface
  onSurfaceVariant: "#e0e0e0", // Light gray text on dark variant
  
  // Background colors for dark mode
  background: "#121212", // Pure dark background
  onBackground: "#ffffff", // White text on dark background
  
  // Error colors for dark mode - Red for clear error indication
  error: "#ef5350", // Bright red for dark mode errors
  onError: "#ffffff", // White text on red
  errorContainer: "#b71c1c", // Dark red container
  onErrorContainer: "#ffcdd2", // Light red text on dark container
  
  // Outline colors for dark mode
  outline: "#546e7a", // Blue-gray for borders in dark mode
  outlineVariant: "#64b5f6", // Light blue for subtle outlines in dark mode
  
  // Other semantic colors for dark mode
  shadow: "#000000", // Black shadow
  scrim: "rgba(0, 0, 0, 0.8)", // Dark scrim
  inverseSurface: "#ffffff", // White inverse surface
  inverseOnSurface: "#013364", // Dark blue text on light surface
  inversePrimary: "#013364", // Original dark blue as inverse primary
  placeholder: "rgba(0, 0, 0, 0.6)",

  // Elevation levels with neutral tints for dark mode
  elevation: {
    level0: "transparent",
    level1: "rgba(255, 255, 255, 0.05)", // Very subtle light tint
    level2: "rgba(255, 255, 255, 0.08)",
    level3: "rgba(255, 255, 255, 0.11)",
    level4: "rgba(255, 255, 255, 0.12)",
    level5: "rgba(255, 255, 255, 0.14)",
  },
  
  // Disabled states for dark mode
  surfaceDisabled: "rgba(255, 255, 255, 0.12)", // Disabled surface
  onSurfaceDisabled: "rgba(255, 255, 255, 0.38)", // Disabled text
  backdrop: "rgba(191, 191, 191, 0.6)", // Dark backdrop
};

// Font family configuration - use Avenir on iOS, fallback on Android
const fontFamily = Platform.OS === 'ios' ? 'Avenir' : 'Roboto';

// Font configuration
const fontConfig = {
  displayLarge: {
    fontFamily,
    fontWeight: "400" as const,
    fontSize: 57,
    lineHeight: 64,
    letterSpacing: 0,
  },
  displayMedium: {
    fontFamily,
    fontWeight: "400" as "400",
    fontSize: 45,
    lineHeight: 52,
    letterSpacing: 0,
  },
  displaySmall: {
    fontFamily,
    fontWeight: "400" as "400",
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: 0,
  },
  headlineLarge: {
    fontFamily,
    fontWeight: "400" as "400",
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: 0,
  },
  headlineMedium: {
    fontFamily,
    fontWeight: "400" as "400",
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: 0,
  },
  headlineSmall: {
    fontFamily,
    fontWeight: "400" as "400",
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: 0,
  },
  titleLarge: {
    fontFamily,
    fontWeight: "400" as "400",
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0,
  },
  titleMedium: {
    fontFamily,
    fontWeight: "500" as "500",
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.1,
  },
  titleSmall: {
    fontFamily,
    fontWeight: "500" as "500",
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  labelLarge: {
    fontFamily,
    fontWeight: "500" as "500",
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  labelMedium: {
    fontFamily,
    fontWeight: "500" as "500",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
  labelSmall: {
    fontFamily,
    fontWeight: "500" as "500",
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
  bodyLarge: {
    fontFamily,
    fontWeight: "400" as "400",
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.15,
  },
  bodyMedium: {
    fontFamily,
    fontWeight: "400" as "400",
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.25,
  },
  bodySmall: {
    fontFamily,
    fontWeight: "400" as "400",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  default: {
    fontFamily,
    fontWeight: "400" as "400",
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.25,
  },
};


// Light theme configuration
export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...customColors,
  },
  fonts: fontConfig,
};

// Dark theme configuration
export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...customDarkColors,
  },
  fonts: fontConfig,
};

// Default theme (can be light or dark based on preference)
export const theme = lightTheme;

// Export custom colors for direct use in components
export { customColors, customDarkColors };
