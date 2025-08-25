import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { useAppTheme, SPACING } from "@/theme/ThemeProvider";
import AttachmentItem from "./AttachmentItem";
import { Attachment } from "@/types";

interface AttachmentListProps {
  attachments: Attachment[];
  onDeleteAttachment: (id: string | number) => void;
  onPreviewAttachment?: (id: string | number) => void;
  isAttachmentDeleting: (id: string | number) => boolean;
  isAttachmentUploading: (id: string | number) => boolean;
}

export default function AttachmentList({
  attachments,
  onDeleteAttachment,
  onPreviewAttachment,
  isAttachmentDeleting,
  isAttachmentUploading,
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
          key={`${attachment.isTemporary ? 'temp' : 'perm'}-${attachment.id}`}
          id={attachment.id}
          file_name={attachment.file_name}
          mime_type={attachment.mime_type}
          onDelete={onDeleteAttachment}
          onPreview={onPreviewAttachment}
          isDeleting={isAttachmentDeleting(attachment.id)}
          isUploading={isAttachmentUploading(attachment.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.sm,
  },
  emptyText: {
    textAlign: "center",
    fontStyle: "italic",
    marginVertical: SPACING.lg,
  },
});
