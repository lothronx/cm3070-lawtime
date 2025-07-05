import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { useAppTheme, SPACING } from "@/theme/ThemeProvider";
import AttachmentItem from "./AttachmentItem";
import { Database } from "@/types/supabase";

export type AttachmentFile = Database["public"]["Tables"]["task_files"]["Row"];

interface AttachmentListProps {
  attachments: AttachmentFile[];
  onDeleteAttachment: (id: string | number) => void;
}

export default function AttachmentList({
  attachments,
  onDeleteAttachment,
}: AttachmentListProps) {
  const { theme } = useAppTheme();

  if (attachments.length === 0) {
    return (
      <Text
        variant="bodyMedium"
        style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
        No attachments
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      {attachments.map((attachment) => (
        <AttachmentItem
          key={attachment.id}
          id={attachment.id}
          file_name={attachment.file_name}
          mime_type={attachment.mime_type}
          onDelete={onDeleteAttachment}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.sm,
  },
  emptyText: {
    textAlign: "center",
    fontStyle: "italic",
    marginVertical: SPACING.md,
  },
});