import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme, SPACING } from "@/theme/ThemeProvider";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from "react-native-reanimated";

type HeaderVariant = "main" | "modal";

interface HeaderProps {
  title: string;
  variant: HeaderVariant;
  stackIndex?: number; // 1-based index
  stackTotal?: number; // total items in stack
  onClose?: () => void; // Optional custom close handler
}

/**
 * Reusable app header component meeting spec:
 * - Calendar & Tasks screens: title left, settings icon right.
 * - Task & Settings screens: title left, close icon right.
 * - Task screen can also display a stack indicator (e.g., 1/3) when provided.
 */
const Header: React.FC<HeaderProps> = ({ title, variant, stackIndex, stackTotal, onClose }) => {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const router = useRouter();

  const showStack =
    typeof stackIndex === "number" &&
    typeof stackTotal === "number" &&
    stackTotal > 1 &&
    stackIndex >= 1 &&
    stackIndex <= stackTotal;

  const isSettingsVariant = variant === "main";
  const rightIconName = isSettingsVariant ? "settings-outline" : "close";
  const rightIconSize = isSettingsVariant ? 26 : 32;

  const handlePress = () => {
    if (isSettingsVariant) {
      router.push("/settings");
    } else if (onClose) {
      // Use custom close handler if provided
      onClose();
    } else {
      // Default behavior: go back
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)");
      }
    }
  };

  // Animated press state for right button
  const press = useSharedValue(0);
  const rButton = useAnimatedStyle(() => {
    return {
      transform: [{ scale: interpolate(press.value, [0, 1], [1, 0.88]) }],
      opacity: interpolate(press.value, [0, 1], [1, 0.65]),
    };
  }, []);

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + SPACING.sm,
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.surfaceVariant,
        },
      ]}>
      <View style={styles.row}>
        <View style={styles.leftGroup}>
          <Text style={[styles.title, { color: theme.colors.primary }]}>{title}</Text>
          {showStack && (
            <View style={[styles.stackBadge, { backgroundColor: theme.colors.secondary }]}>
              <Text style={[styles.stackText, { color: theme.colors.onSecondary }]}>
                {stackIndex}/{stackTotal}
              </Text>
            </View>
          )}
        </View>
        <Animated.View style={[styles.iconButton, rButton]}>
          <Pressable
            hitSlop={8}
            onPress={handlePress}
            onPressIn={() => {
              press.value = withTiming(1, { duration: 100 });
            }}
            onPressOut={() => {
              press.value = withTiming(0, { duration: 100 });
            }}
            style={styles.pressableFill}>
            <Ionicons name={rightIconName} size={rightIconSize} color={theme.colors.primary} />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
};

export default Header;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    elevation: 6,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    zIndex: 1,
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
  pressableFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
});
