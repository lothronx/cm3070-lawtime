import React from "react";
import { Tabs } from "expo-router";
import { View, StyleSheet, Dimensions, TouchableOpacity } from "react-native";
import { Icon } from "react-native-paper";
import Svg, { Path } from "react-native-svg";
import { useAppTheme } from "@/theme/ThemeProvider";
import ActionMenu from "@/components/navigation/ActionMenu";

const { width: screenWidth } = Dimensions.get("window");

function CustomTabBar({ state, navigation }: any) {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.container]}>
      {/* Tab buttons */}
      <View style={styles.subContent}>
        {/* Tasks button */}
        <TouchableOpacity
          style={[styles.tabButton, styles.leftTab]}
          onPress={() => navigation.navigate("tasks")}>
          <Icon
            source={state.index === 1 ? "format-list-bulleted" : "format-list-bulleted-variant"}
            size={24}
            color={state.index === 1 ? theme.colors.onPrimary : theme.colors.onSurfaceDisabled}
          />
        </TouchableOpacity>

        {/* Calendar button */}
        <TouchableOpacity
          style={[styles.tabButton, styles.rightTab]}
          onPress={() => navigation.navigate("index")}>
          <Icon
            source={state.index === 0 ? "calendar" : "calendar-outline"}
            size={24}
            color={state.index === 0 ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
          />
        </TouchableOpacity>
      </View>

      <ActionMenu />

      {/* Curved SVG background */}
      <Svg width="100%" height="100" viewBox="0 0 1092 260" style={styles.svg}>
        <Path
          fill={theme.colors.primary}
          d="M30,60h357.3c17.2,0,31,14.4,30,31.6c-0.2,2.7-0.3,5.5-0.3,8.2c0,71.2,58.1,129.6,129.4,130c72.1,0.3,130.6-58,130.6-130c0-2.7-0.1-5.4-0.2-8.1C675.7,74.5,689.5,60,706.7,60H1062c16.6,0,30,13.4,30,30v94c0,42-34,76-76,76H76c-42,0-76-34-76-76V90C0,73.4,13.4,60,30,60z"
        />
      </Svg>
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
  subContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 40,
    zIndex: 2,
  },
  tabButton: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "red",
  },
  leftTab: {
    marginRight: "auto",
  },
  rightTab: {
    marginLeft: "auto",
  },
  svg: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
});
