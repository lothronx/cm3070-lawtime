import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/theme/ThemeProvider";

type HeaderVariant = "main" | "modal";

interface HeaderProps {
  title: string;
  variant: HeaderVariant;
  stackIndex?: number; // 1-based index
  stackTotal?: number; // total items in stack
}

/**
 * Reusable app header component meeting spec:
 * - Calendar & Tasks screens: title left, settings icon right.
 * - Task & Settings screens: title left, close icon right.
 * - Task screen can also display a stack indicator (e.g., 1/3) when provided.
 */
const Header: React.FC<HeaderProps> = ({
  title,
  variant,
  stackIndex,
  stackTotal,
}) => {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();

  const showStack =
    typeof stackIndex === "number" &&
    typeof stackTotal === "number" &&
    stackTotal > 1 &&
    stackIndex >= 1 &&
    stackIndex <= stackTotal;

  const isSettingsVariant = variant === "main";
  const rightIconName = isSettingsVariant ? "settings-outline" : "close";

  const handlePress = () => {
    console.log(`${rightIconName} pressed`);
  };

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingTop: insets.top + 15,
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.surfaceVariant,
        },
      ]}>
      <View style={styles.row}>
        <View style={styles.leftGroup}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>{title}</Text>
          {showStack && (
            <View style={[styles.stackBadge, { backgroundColor: theme.colors.secondary }]}>
              <Text style={[styles.stackText, { color: theme.colors.onSecondary }]}>
                {stackIndex}/{stackTotal}
              </Text>
            </View>
          )}
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.iconButton,
            {
              backgroundColor: pressed ? theme.colors.primaryContainer : "transparent",
            },
          ]}
          onPress={handlePress}>
          <Ionicons name={rightIconName as any} size={26} color={theme.colors.onSurface} />
        </Pressable>
      </View>
    </View>
  );
};

export default Header;

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  title: {
    paddingLeft: 6,
    fontSize: 32,
    fontWeight: "600",
  },
  stackBadge: {
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  stackText: {
    fontSize: 14,
    fontWeight: "600",
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
