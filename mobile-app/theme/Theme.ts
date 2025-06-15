import { MD3LightTheme, MD3DarkTheme } from "react-native-paper";
import type { MD3Theme } from "react-native-paper";

// Light theme configuration
export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
  },
};

// Dark theme configuration
export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
  },
};

// Default theme (can be light or dark based on preference)
export const theme = lightTheme;

// Export both themes for potential theme switching functionality
export { lightTheme as defaultLightTheme, darkTheme as defaultDarkTheme };
