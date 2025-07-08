import React from "react";
import { View, StyleSheet, Alert, TouchableOpacity } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { Text, Card } from "react-native-paper";
import { CheckBox } from "react-native-elements";
import Icon from "react-native-vector-icons/MaterialIcons";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useAppTheme, SPACING, BORDER_RADIUS } from "@/theme/ThemeProvider";
import { TaskWithClient } from "@/mockData";

interface TaskItemProps {
  task: TaskWithClient;
  onToggleComplete: (taskId: number, isCompleted: boolean) => void;
  onPress: (task: TaskWithClient) => void;
  onDelete: (taskId: number) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onToggleComplete, onPress, onDelete }) => {
  const { theme } = useAppTheme();
  const translateX = useSharedValue(0);

  const overdue = !!task.event_time && !task.is_completed && new Date(task.event_time) < new Date();

  const formatDateTime = (eventTime: string | null) => {
    if (!eventTime) return null;

    try {
      const date = new Date(eventTime);
      const dateStr = date.toLocaleDateString("cn-CN");
      const timeStr = date.toLocaleTimeString("cn-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const formattedDateTime = `${dateStr} ${timeStr}`;

      return overdue ? `${formattedDateTime} - Overdue` : formattedDateTime;
    } catch {
      return null;
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Task", "Are you sure you want to delete this task?", [
      { text: "Cancel", style: "cancel", onPress: resetPosition },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete(task.id),
      },
    ]);
  };

  const resetPosition = () => {
    translateX.value = withSpring(0);
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10]) // Require 10px horizontal movement to activate
    .failOffsetY([-20, 20]) // Fail if vertical movement is more than 20px
    .onUpdate((event) => {
      if (event.translationX < 0) {
        translateX.value = Math.max(event.translationX, -160); // Wider for two buttons
      }
    })
    .onEnd((event) => {
      if (event.translationX < -20) {
        // Snap to reveal both buttons
        translateX.value = withSpring(-160);
      } else {
        // Snap back to original position
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const handleToggleComplete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggleComplete(task.id, !task.is_completed);
  };

  return (
    <View style={[styles.container]}>
      <Card mode="contained">
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.animatedContainer,
              animatedStyle,
              { backgroundColor: theme.colors.surface },
            ]}>
            <View
              style={[
                styles.cardContent,
                { backgroundColor: theme.colors.surface },
                task.is_completed
                  ? { borderLeftColor: theme.colors.onSurfaceDisabled }
                  : { borderLeftColor: theme.colors.primary },
              ]}>
              {/* Left side - Checkbox */}
              <CheckBox
                checked={task.is_completed}
                onPress={handleToggleComplete}
                size={20}
                checkedIcon="check-circle"
                uncheckedIcon="radio-button-unchecked"
                iconType="material"
                checkedColor={theme.colors.onSurfaceDisabled}
                uncheckedColor={theme.colors.primary}
                containerStyle={styles.checkboxStyle}
              />

              {/* Right side - Task Details */}
              <View style={styles.detailsContainer}>
                {/* Title */}
                <Text
                  variant="titleMedium"
                  style={[
                    styles.title,
                    { color: theme.colors.primary },
                    task.is_completed && {
                      textDecorationLine: "line-through" as const,
                      color: theme.colors.onSurfaceDisabled,
                    },
                  ]}
                  numberOfLines={2}>
                  {task.title}
                </Text>

                {/* Client */}
                {task.clients?.client_name && (
                  <View style={styles.detailRow}>
                    <View style={styles.iconContainer}>
                      <Ionicons
                        name="briefcase-outline"
                        size={14}
                        color={theme.colors.onSurfaceVariant}
                      />
                    </View>
                    <View style={styles.subtitleContainer}>
                      <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                        {task.clients.client_name}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Time */}
                {formatDateTime(task.event_time) && (
                  <View style={styles.detailRow}>
                    <View style={styles.iconContainer}>
                      <Ionicons
                        name="time-outline"
                        size={16}
                        color={theme.colors.onSurfaceVariant}
                      />
                    </View>
                    <View style={styles.subtitleContainer}>
                      <Text
                        style={[
                          styles.subtitle,
                          { color: theme.colors.onSurfaceVariant },
                          !task.is_completed &&
                            overdue && { color: theme.colors.error, fontWeight: "600" },
                        ]}>
                        {formatDateTime(task.event_time)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Location */}
                {task.location && (
                  <View style={styles.detailRow}>
                    <View style={styles.iconContainer}>
                      <Ionicons
                        name="location-outline"
                        size={16}
                        color={theme.colors.onSurfaceVariant}
                      />
                    </View>
                    <View style={styles.subtitleContainer}>
                      <Text
                        style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
                        numberOfLines={1}>
                        {task.location}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </Animated.View>
        </GestureDetector>

        {/* Edit and Delete buttons revealed on swipe */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            onPress={() => onPress(task)}
            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}>
            <Icon name="edit" size={20} color={theme.colors.onPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            style={[
              styles.actionButton,
              styles.deleteButton,
              { backgroundColor: theme.colors.error },
            ]}>
            <Icon name="delete" size={20} color={theme.colors.onError} />
          </TouchableOpacity>
        </View>
      </Card>
    </View>
  );
};

export default TaskItem;

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.xs,
  },
  animatedContainer: {
    zIndex: 1,
  },
  cardContent: {
    borderLeftWidth: 2,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: "row",
    elevation: 2,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  checkboxStyle: {
    padding: 0,
    margin: 1,
  },
  detailsContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: SPACING.xs,
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: "row",
    marginTop: SPACING.xs,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: SPACING.md,
  },
  subtitleContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginLeft: SPACING.sm,
    height: 18,
  },
  subtitle: {
    fontSize: 14,
  },
  actionsContainer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 160,
    flexDirection: "row",
    zIndex: 0,
  },
  actionButton: {
    width: 80,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    borderTopRightRadius: BORDER_RADIUS.md,
    borderBottomRightRadius: BORDER_RADIUS.md,
  },
});
