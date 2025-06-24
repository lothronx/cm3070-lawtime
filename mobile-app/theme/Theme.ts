import { MD3LightTheme, MD3DarkTheme } from "react-native-paper";
import type { MD3Theme } from "react-native-paper";

// Custom color palette for LawTime app
// Base palette: Wine Red, Light Beige, Light Camel, Light Gray, White
const customColors = {
  // Primary colors - Wine Red (#7c0102) for key actions and branding
  primary: "#7c0102", // Wine red - primary brand color
  primaryContainer: "#f0ebd5", // Light beige container for primary elements
  onPrimary: "#ffffff", // White text on wine red
  onPrimaryContainer: "#7c0102", // Wine red text on light beige
  
  // Secondary colors - Light Camel (#d0b38b) for secondary actions
  secondary: "#d0b38b", // Light camel for secondary elements
  secondaryContainer: "#f0ebd5", // Light beige for secondary containers
  onSecondary: "#7c0102", // Wine red text on camel
  onSecondaryContainer: "#7c0102", // Wine red text on light beige
  
  // Surface colors for professional look
  surface: "#ffffff", // Pure white for main surfaces
  surfaceVariant: "#f0ebd5", // Light beige for variant surfaces
  onSurface: "#7c0102", // Wine red text on white
  onSurfaceVariant: "#7c0102", // Wine red text on light beige
  
  // Background colors
  background: "#ffffff", // Pure white background
  onBackground: "#7c0102", // Wine red text on white background
  
  // Error colors - Using wine red tones for consistency
  error: "#d32f2f", // Slightly brighter red for errors
  onError: "#ffffff", // White text on error red
  errorContainer: "#ffebee", // Very light red container
  onErrorContainer: "#d32f2f", // Error red text on light container
  
  // Outline colors
  outline: "#ababab", // Light gray for borders and dividers
  outlineVariant: "#d0b38b", // Light camel for subtle outlines
  
  // Other semantic colors
  shadow: "#000000", // Black shadow
  scrim: "rgba(124, 1, 2, 0.6)", // Wine red scrim with transparency
  inverseSurface: "#7c0102", // Wine red inverse surface
  inverseOnSurface: "#ffffff", // White on wine red
  inversePrimary: "#f0ebd5", // Light beige as inverse primary
  
  // Elevation levels with subtle beige tints
  elevation: {
    level0: "transparent",
    level1: "rgba(240, 235, 213, 0.05)", // Very subtle beige tint
    level2: "rgba(240, 235, 213, 0.08)",
    level3: "rgba(240, 235, 213, 0.11)",
    level4: "rgba(240, 235, 213, 0.12)",
    level5: "rgba(240, 235, 213, 0.14)",
  },
  
  // Disabled states
  surfaceDisabled: "rgba(240, 235, 213, 0.12)", // Disabled surface with beige tint
  onSurfaceDisabled: "rgba(124, 1, 2, 0.38)", // Disabled text with wine red
  backdrop: "rgba(171, 171, 171, 0.4)", // Light gray backdrop
};

const customDarkColors = {
  // Primary colors - Softer wine red for dark mode
  primary: "#b71c1c", // Slightly brighter wine red for better contrast in dark mode
  primaryContainer: "#3e2723", // Dark brown container
  onPrimary: "#ffffff", // White text on wine red
  onPrimaryContainer: "#f0ebd5", // Light beige text on dark container
  
  // Secondary colors - Muted camel for dark mode
  secondary: "#a1887f", // Muted camel for better dark mode contrast
  secondaryContainer: "#4e342e", // Dark brown secondary container
  onSecondary: "#ffffff", // White text on muted camel
  onSecondaryContainer: "#f0ebd5", // Light beige text on dark container
  
  // Surface colors for dark mode - using dark browns and grays
  surface: "#1c1b1f", // Dark surface following Material Design
  surfaceVariant: "#2e2e2e", // Dark gray variant surface
  onSurface: "#e6e1e5", // Light text on dark surface
  onSurfaceVariant: "#c8c5ca", // Muted light text on dark variant
  
  // Background colors for dark mode
  background: "#121212", // Pure dark background
  onBackground: "#e6e1e5", // Light text on dark background
  
  // Error colors for dark mode
  error: "#ffb4ab", // Light red for dark mode errors
  onError: "#690005", // Dark red text on light error background
  errorContainer: "#93000a", // Dark red container
  onErrorContainer: "#ffb4ab", // Light red text on dark container
  
  // Outline colors for dark mode
  outline: "#696969", // Medium gray for borders and dividers
  outlineVariant: "#5a4a42", // Dark brownish gray for subtle outlines
  
  // Other semantic colors for dark mode
  shadow: "#000000", // Black shadow
  scrim: "rgba(0, 0, 0, 0.8)", // Dark scrim
  inverseSurface: "#e6e1e5", // Light inverse surface
  inverseOnSurface: "#1c1b1f", // Dark text on light surface
  inversePrimary: "#7c0102", // Original wine red as inverse primary
  
  // Elevation levels with subtle warm tints for dark mode
  elevation: {
    level0: "transparent",
    level1: "rgba(94, 52, 46, 0.05)", // Very subtle warm tint
    level2: "rgba(94, 52, 46, 0.08)",
    level3: "rgba(94, 52, 46, 0.11)",
    level4: "rgba(94, 52, 46, 0.12)",
    level5: "rgba(94, 52, 46, 0.14)",
  },
  
  // Disabled states for dark mode
  surfaceDisabled: "rgba(230, 225, 229, 0.12)", // Disabled surface
  onSurfaceDisabled: "rgba(230, 225, 229, 0.38)", // Disabled text
  backdrop: "rgba(0, 0, 0, 0.6)", // Dark backdrop
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
