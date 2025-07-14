import React, { createContext, useContext, useState, ReactNode } from "react";
import { useColorScheme } from "react-native";
import type { MD3Theme } from "react-native-paper";
import { lightTheme, darkTheme } from "./Theme";

export const SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const BORDER_RADIUS = { sm: 4, md: 8, lg: 12, xl: 16 };

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  theme: MD3Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");

  const isDark = themeMode === "dark" || (themeMode === "system" && systemColorScheme === "dark");
  const theme = isDark ? darkTheme : lightTheme;

  const value = {
    theme,
    themeMode,
    setThemeMode,
    isDark,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useAppTheme must be used within a ThemeProvider");
  }
  return context;
}

export default ThemeProvider;
