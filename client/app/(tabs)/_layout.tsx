import React from "react";
import { Tabs } from "expo-router";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Svg, { Path } from "react-native-svg";
import { useAppTheme, BORDER_RADIUS } from "@/theme/ThemeProvider";
import ActionMenu from "@/components/navigation/ActionMenu";

function CustomTabBar({ state, navigation }: any) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container]}>
      {/* Tab buttons */}
      <View style={[styles.tabContainer, { paddingBottom: insets.bottom }]}>
        {/* Tasks button */}
        <TouchableOpacity
          style={[styles.tabButton, styles.leftTab]}
          onPress={() => navigation.navigate("tasks")}>
          <Ionicons
            name={state.index === 1 ? "list" : "list-outline"}
            size={32}
            color={state.index === 1 ? theme.colors.onPrimary : theme.colors.outline}
          />
        </TouchableOpacity>

        {/* Calendar button */}
        <TouchableOpacity
          style={[styles.tabButton, styles.rightTab]}
          onPress={() => navigation.navigate("index")}>
          <Ionicons
            name={state.index === 0 ? "calendar-clear" : "calendar-clear-outline"}
            size={32}
            color={state.index === 0 ? theme.colors.onPrimary : theme.colors.outline}
          />
        </TouchableOpacity>
      </View>

      <ActionMenu />

      {/* Curved SVG background */}
      <View style={[styles.svgContainer, { height: insets.bottom + 55 }]}>
        <Svg viewBox="0 0 402 55" style={[styles.svg, { marginBottom: insets.bottom }]}>
          <Path
            fill={theme.colors.primary}
            d="M 161 0 A 40 40 0 0 0 241 0 H 402 V 55 H 0 V 0 H 161 Z"
          />
        </Svg>

        <View
          style={[
            styles.insetsBottom,
            { height: insets.bottom + 15, backgroundColor: theme.colors.primary },
          ]}
        />
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Calendar",
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    justifyContent: "flex-end",
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 50,
    zIndex: 2,
  },
  tabButton: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  leftTab: {
    marginRight: "auto",
  },
  rightTab: {
    marginLeft: "auto",
  },
  svgContainer: {
    position: "absolute",
    width: "100%",
    zIndex: 1,
    elevation: 6,
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
  svg: {
    position: "absolute",
    width: "100%",
    height: 55,
  },
  insetsBottom: {
    position: "absolute",
    width: "100%",
    bottom: 0,
  },
});
