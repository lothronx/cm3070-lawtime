import { MD3LightTheme, MD3DarkTheme } from "react-native-paper";
import type { MD3Theme } from "react-native-paper";
import { Platform } from 'react-native';

// LawTime Color Schema - Blue-Red Corporate Theme
// Base palette: Light Blue, Dark Blue, Red

const customColors = {
  // Primary colors - Dark Blue (#013364) for authority and trust
  primary: "#013364", // Dark blue - primary brand color
  primaryContainer: "#e3f2fd", // Very light blue container
  onPrimary: "#ffffff", // White text on dark blue
  onPrimaryContainer: "#013364", // Dark blue text on light blue
  
  // Secondary colors - Red (#d30b0d) for secondary actions and visual interest
  secondary: "#d30b0d", // Red for secondary elements - creates warmth and contrast
  secondaryContainer: "#ffebee", // Very light red secondary container
  onSecondary: "#ffffff", // White text on red
  onSecondaryContainer: "#d30b0d", // Red text on light red container
  
  // Surface colors for clean look
  surface: "#ffffff", // Pure white for main surfaces
  surfaceVariant: "#f5f9ff", // Very subtle blue tint for variant surfaces
  onSurface: "#013364", // Dark blue text on white
  onSurfaceVariant: "#013364", // Medium blue text on light surfaces
  
  // Background colors
  background: "#ffffff", // Pure white background
  onBackground: "#013364", // Dark blue text on white background
  
  // Error colors - Light Blue (#428bca) for errors (since red is now secondary)
  error: "#428bca", // Light blue for errors - softer than traditional red
  onError: "#ffffff", // White text on light blue
  errorContainer: "#e1f5fe", // Very light blue container
  onErrorContainer: "#013364", // Dark blue text on light container
  
  // Outline colors
  outline: "#90a4ae", // Blue-gray for borders and dividers
  outlineVariant: "#d30b0d", // Red for subtle outlines - adds warmth
  
  // Other semantic colors
  shadow: "#000000", // Black shadow
  scrim: "rgba(1, 51, 100, 0.6)", // Dark blue scrim with transparency
  inverseSurface: "#013364", // Dark blue inverse surface
  inverseOnSurface: "#ffffff", // White on dark blue
  inversePrimary: "#64b5f6", // Light blue as inverse primary
  
  // Elevation levels with subtle blue tints
  elevation: {
    level0: "transparent",
    level1: "rgba(227, 242, 253, 0.05)", // Very subtle blue tint
    level2: "rgba(227, 242, 253, 0.08)",
    level3: "rgba(227, 242, 253, 0.11)",
    level4: "rgba(227, 242, 253, 0.12)",
    level5: "rgba(227, 242, 253, 0.14)",
  },
  
  // Disabled states
  surfaceDisabled: "rgba(227, 242, 253, 0.12)", // Disabled surface with blue tint
  onSurfaceDisabled: "rgba(1, 51, 100, 0.38)", // Disabled text with dark blue
  backdrop: "rgba(144, 164, 174, 0.4)", // Blue-gray backdrop
};

const customDarkColors = {
  // Primary colors - Brighter blue for dark mode contrast
  primary: "#2196f3", // Brighter blue for dark mode
  primaryContainer: "#0d47a1", // Dark blue container
  onPrimary: "#ffffff", // White text on blue
  onPrimaryContainer: "#bbdefb", // Light blue text on dark container
  
  // Secondary colors - Red for dark mode
  secondary: "#f44336", // Brighter red for dark mode contrast
  secondaryContainer: "#b71c1c", // Dark red secondary container
  onSecondary: "#ffffff", // White text on red
  onSecondaryContainer: "#ffcdd2", // Light red text on dark container
  
  // Surface colors for dark mode
  surface: "#262627ff", // Dark surface
  surfaceVariant: "#2e3440", // Dark blue-gray variant surface
  onSurface: "#e3f2fd", // Light blue text on dark surface
  onSurfaceVariant: "#90caf9", // Medium light blue text on dark variant
  
  // Background colors for dark mode
  background: "#292929ff", // Pure dark background
  onBackground: "#e3f2fd", // Light blue text on dark background
  
  // Error colors for dark mode - Light blue (since red is now secondary)
  error: "#64b5f6", // Light blue for dark mode errors
  onError: "#000000", // Black text on light blue
  errorContainer: "#1565c0", // Medium blue container
  onErrorContainer: "#e3f2fd", // Very light blue text on dark container
  
  // Outline colors for dark mode
  outline: "#546e7a", // Blue-gray for borders in dark mode
  outlineVariant: "#f44336", // Red for subtle outlines in dark mode
  
  // Other semantic colors for dark mode
  shadow: "#000000", // Black shadow
  scrim: "rgba(0, 0, 0, 0.8)", // Dark scrim
  inverseSurface: "#e3f2fd", // Light blue inverse surface
  inverseOnSurface: "#0d47a1", // Dark blue text on light surface
  inversePrimary: "#013364", // Original dark blue as inverse primary
  placeholder: "rgba(0, 0, 0, 0.6)",

  // Elevation levels with subtle blue tints for dark mode
  elevation: {
    level0: "transparent",
    level1: "rgba(46, 52, 64, 0.05)", // Very subtle blue-gray tint
    level2: "rgba(46, 52, 64, 0.08)",
    level3: "rgba(46, 52, 64, 0.11)",
    level4: "rgba(46, 52, 64, 0.12)",
    level5: "rgba(46, 52, 64, 0.14)",
  },
  
  // Disabled states for dark mode
  surfaceDisabled: "rgba(227, 242, 253, 0.12)", // Disabled surface
  onSurfaceDisabled: "rgba(227, 242, 253, 0.38)", // Disabled text
  backdrop: "rgba(0, 0, 0, 0.6)", // Dark backdrop
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
