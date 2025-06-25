import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "react-native-paper";
const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface CurvedBackgroundProps {
  children?: React.ReactNode;
}

export default function CurvedBackground({ children }: CurvedBackgroundProps) {
  const theme = useTheme();

  // Calculate dimensions for a large circular arc
  const curveHeight = screenHeight * 0.5;

  // Create SVG path for a large circular arc curving upward
  const curvePath = `
    M 0,0
    L ${screenWidth},0
    L ${screenWidth},${curveHeight}
    A ${screenWidth},${screenWidth} 0 0,1 0,${curveHeight}
    Z
  `;

  return (
    <View style={styles.container}>
      {/* Background for the whole screen */}
      <View style={[styles.background]} />

      {/* Upper colored section with large circular curve */}
      <View style={styles.svgContainer}>
        <Svg
          style={[
            styles.svgCurve,
            {
              shadowColor: theme.colors.shadow,
              shadowOffset: {
                width: 0,
                height: 4,
              },
              shadowOpacity: 0.4,
              shadowRadius: 15,
              elevation: 4,
            },
          ]}>
          <Path d={curvePath} fill={theme.colors.primary} />
        </Svg>
      </View>

      {/* Content area */}
      <View style={styles.contentContainer}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  background: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  svgContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: screenHeight * 0.6 + 50,
    zIndex: 1,
  },
  svgCurve: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  contentContainer: {
    flex: 1,
    zIndex: 2,
  },
});
