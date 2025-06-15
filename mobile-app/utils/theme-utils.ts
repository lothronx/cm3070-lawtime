import { useTheme } from "react-native-paper";
import { useAppTheme } from "../theme/ThemeProvider";

/**
 * Custom hook that provides access to both React Native Paper's theme
 * and our custom theme provider functionality
 */
export function useLawTimeTheme() {
  const paperTheme = useTheme();
  const appTheme = useAppTheme();

  return {
    ...appTheme,
    colors: paperTheme.colors,
    // Additional theme utilities
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      xxl: 48,
    },
    borderRadius: {
      sm: 4,
      md: 8,
      lg: 12,
      xl: 16,
    },
    elevation: {
      xs: 1,
      sm: 2,
      md: 4,
      lg: 8,
      xl: 12,
    },
    typography: {
      // Font sizes following Material Design 3
      displayLarge: 57,
      displayMedium: 45,
      displaySmall: 36,
      headlineLarge: 32,
      headlineMedium: 28,
      headlineSmall: 24,
      titleLarge: 22,
      titleMedium: 16,
      titleSmall: 14,
      labelLarge: 14,
      labelMedium: 12,
      labelSmall: 11,
      bodyLarge: 16,
      bodyMedium: 14,
      bodySmall: 12,
    },
  };
}

/**
 * Common styles that can be reused across components
 */
export function createCommonStyles(theme: ReturnType<typeof useLawTimeTheme>) {
  return {
    // Container styles
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    safeContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingTop: theme.spacing.md,
    },
    centeredContainer: {
      flex: 1,
      justifyContent: "center" as const,
      alignItems: "center" as const,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.md,
    },

    // Card styles
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      elevation: theme.elevation.sm,
      margin: theme.spacing.md,
      padding: theme.spacing.md,
    },
    cardHeader: {
      backgroundColor: theme.colors.surfaceVariant,
      borderTopLeftRadius: theme.borderRadius.md,
      borderTopRightRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },

    // Button styles
    primaryButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      elevation: theme.elevation.sm,
    },
    secondaryButton: {
      backgroundColor: "transparent",
      borderColor: theme.colors.primary,
      borderWidth: 1,
      borderRadius: theme.borderRadius.md,
    },

    // Text styles
    primaryText: {
      color: theme.colors.onSurface,
      fontSize: theme.typography.bodyMedium,
    },
    secondaryText: {
      color: theme.colors.onSurfaceVariant,
      fontSize: theme.typography.bodySmall,
    },
    headerText: {
      color: theme.colors.onSurface,
      fontSize: theme.typography.headlineSmall,
      fontWeight: "600" as const,
    },

    // Form styles
    inputContainer: {
      marginBottom: theme.spacing.md,
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.sm,
    },

    // Layout helpers
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
    },
    spaceBetween: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
    },

    // Spacing utilities
    marginTop: (multiplier: number = 1) => ({
      marginTop: theme.spacing.md * multiplier,
    }),
    marginBottom: (multiplier: number = 1) => ({
      marginBottom: theme.spacing.md * multiplier,
    }),
    padding: (multiplier: number = 1) => ({
      padding: theme.spacing.md * multiplier,
    }),
  };
}

/**
 * Theme-aware shadow styles
 */
export function createShadowStyle(
  theme: ReturnType<typeof useLawTimeTheme>,
  elevation: number = 2
) {
  return {
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: elevation,
    },
    shadowOpacity: 0.25,
    shadowRadius: elevation * 2,
    elevation: elevation,
  };
}

/**
 * Get status bar style based on current theme
 */
export function getStatusBarStyle(isDark: boolean) {
  return isDark ? "light-content" : "dark-content";
}
