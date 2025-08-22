import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { List } from "react-native-paper";
import { useAppTheme, SPACING } from "@/theme/ThemeProvider";
import { TaskWithClient } from "@/types";
import TaskItem from "./TaskItem";

interface TaskSectionProps {
  title: string;
  tasks: TaskWithClient[];
  defaultExpanded?: boolean;
  onToggleComplete: (taskId: number, completedAt: string | null) => void;
  onEdit: (task: TaskWithClient) => void;
  onDelete: (taskId: number) => void;
}

const TaskSection: React.FC<TaskSectionProps> = ({
  title,
  tasks,
  defaultExpanded = true,
  onToggleComplete,
  onEdit,
  onDelete,
}) => {
  const { theme } = useAppTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (tasks.length === 0) {
    return null;
  }

  // Function to get task color - handles all color logic internally
  const getTaskColor = (task: TaskWithClient) => {
    // Completed tasks are always muted
    if (task.completed_at) {
      return theme.colors.onSurfaceDisabled;
    }
    
    // Overdue tasks are always red
    if (task.event_time && new Date(task.event_time) < new Date()) {
      return theme.colors.error;
    }
    
    // Default colors based on section type
    switch (title) {
      case "Unscheduled":
        return theme.colors.secondary;
      case "Upcoming":
        return theme.colors.primary;
      case "Completed":
        return theme.colors.onSurfaceDisabled;
      default:
        return theme.colors.primary;
    }
  };

  return (
    <List.Accordion
      title={`${title} (${tasks.length})`}
      titleStyle={[styles.title, { color: theme.colors.primary }]}
      expanded={expanded}
      onPress={() => setExpanded(!expanded)}>
      <View>
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            color={getTaskColor(task)}
            onToggleComplete={onToggleComplete}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </View>
    </List.Accordion>
  );
};

export default TaskSection;

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: "600",
    paddingLeft: SPACING.sm,
  },
});
