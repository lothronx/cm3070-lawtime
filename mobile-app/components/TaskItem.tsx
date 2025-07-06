import React from "react";
import { View, StyleSheet, Alert, TouchableOpacity } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Text, Card } from "react-native-paper";
import { CheckBox } from "react-native-elements";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useAppTheme, SPACING } from "@/theme/ThemeProvider";
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
  const [isDeleting, setIsDeleting] = React.useState(false);

  const formatDateTime = (eventTime: string | null) => {
    if (!eventTime) return null;

    try {
      const date = new Date(eventTime);
      const isPast = date < new Date() && !task.is_completed;

      const dateStr = date.toLocaleDateString("cn-CN");
      const timeStr = date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const formattedDateTime = `${dateStr} ${timeStr}`;

      return isPast ? `${formattedDateTime} - Overdue` : formattedDateTime;
    } catch {
      return null;
    }
  };

  const isOverdue = () => {
    if (!task.event_time || task.is_completed) return false;
    return new Date(task.event_time) < new Date();
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
    translateX.value = withSpring(0, {
      damping: 20,
      stiffness: 300,
    });
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
      if (event.translationX < -80) {
        // Snap to reveal both buttons
        translateX.value = withSpring(-160, {
          damping: 20,
          stiffness: 300,
        });
        runOnJS(setIsDeleting)(true);
      } else {
        // Snap back to original position
        translateX.value = withSpring(0, {
          damping: 20,
          stiffness: 300,
        });
        runOnJS(setIsDeleting)(false);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const handleToggleComplete = () => {
    onToggleComplete(task.id, !task.is_completed);
  };

  const overdue = isOverdue();

  return (
    <View style={styles.container}>
      <Card
        style={[
          styles.card,
          { backgroundColor: theme.colors.surface },
          task.is_completed
            ? { borderLeftColor: theme.colors.onSurfaceDisabled }
            : { borderLeftColor: theme.colors.primary },
        ]}
        mode="contained">
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.animatedContainer,
              { backgroundColor: theme.colors.surface },
              animatedStyle,
            ]}>
            <View style={styles.cardContent}>
              <View style={styles.mainContent}>
                {/* Left side - Checkbox */}
                <View style={styles.checkboxContainer}>
                  <CheckBox
                    checked={task.is_completed}
                    onPress={handleToggleComplete}
                    checkedIcon="checkbox"
                    uncheckedIcon="square-outline"
                    iconType="ionicon"
                    checkedColor={theme.colors.onSurfaceDisabled}
                    uncheckedColor={theme.colors.primary}
                    containerStyle={styles.checkboxStyle}
                  />
                </View>

                {/* Center - Task Details */}
                <View style={styles.detailsContainer}>
                  {/* Title */}
                  <Text
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
                      <Icon
                        name="person"
                        size={16}
                        color={theme.colors.onSurfaceVariant}
                        style={styles.icon}
                      />
                      <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                        {task.clients.client_name}
                      </Text>
                    </View>
                  )}

                  {/* Time */}
                  {formatDateTime(task.event_time) && (
                    <View style={styles.detailRow}>
                      <Icon
                        name="access-time"
                        size={16}
                        color={theme.colors.onSurfaceVariant}
                        style={styles.icon}
                      />
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
                  )}

                  {/* Location */}
                  {task.location && (
                    <View style={styles.detailRow}>
                      <Icon
                        name="location-on"
                        size={16}
                        color={theme.colors.onSurfaceVariant}
                        style={styles.icon}
                      />
                      <Text
                        style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
                        numberOfLines={1}>
                        {task.location}
                      </Text>
                    </View>
                  )}
                </View>
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
            style={[styles.actionButton, { backgroundColor: theme.colors.error }]}>
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
  card: {
    borderLeftWidth: 2,
    elevation: 2,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    overflow: "hidden",
    position: "relative",
  },
  animatedContainer: {
    zIndex: 1,
  },
  cardContent: {
    padding: SPACING.md,
  },
  mainContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  checkboxContainer: {
    marginRight: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  checkboxStyle: {
    backgroundColor: "transparent",
    borderWidth: 0,
    padding: 0,
    margin: 0,
  },
  detailsContainer: {
    flex: 1,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xs / 2,
  },
  icon: {
    marginRight: SPACING.xs,
    width: 20,
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
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: SPACING.xs,
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: SPACING.xs / 2,
    lineHeight: 18,
  },
  sourceText: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginTop: SPACING.xs,
    textAlign: "right",
  },
});
