import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { List } from "react-native-paper";
import { SPACING } from "@/theme/ThemeProvider";
import { TaskWithClient } from "@/types";
import TaskItem from "./TaskItem";

interface TaskSectionProps {
  title: string;
  tasks: TaskWithClient[];
  color: string;
  defaultExpanded?: boolean;
  onToggleComplete: (taskId: number, completedAt: string | null) => void;
  onEdit: (task: TaskWithClient) => void;
  onDelete: (taskId: number) => void;
}

const TaskSection: React.FC<TaskSectionProps> = ({
  title,
  tasks,
  color,
  defaultExpanded = true,
  onToggleComplete,
  onEdit,
  onDelete,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (tasks.length === 0) {
    return null;
  }

  return (
    <List.Accordion
      title={`${title} (${tasks.length})`}
      titleStyle={styles.title}
      expanded={expanded}
      onPress={() => setExpanded(!expanded)}>
      <View>
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            color={color}
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
