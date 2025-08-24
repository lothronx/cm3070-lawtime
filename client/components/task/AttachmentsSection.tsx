import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, Button } from "react-native-paper";
import { useAppTheme, SPACING, BORDER_RADIUS } from "@/theme/ThemeProvider";
import AttachmentList from "./AttachmentList";
import { Attachment } from "@/types";

interface AttachmentsSectionProps {
  attachments: Attachment[];
  onDeleteAttachment: (id: string | number) => void;
  onAddAttachment: () => void;
  onPreviewAttachment?: (id: string | number) => void;
  loading?: boolean;
  error?: boolean;
  isAttachmentDeleting: (id: string | number) => boolean;
  isAttachmentUploading: (id: string | number) => boolean;
}

export default function AttachmentsSection({
  attachments,
  onDeleteAttachment,
  onAddAttachment,
  onPreviewAttachment,
  loading = false,
  error = false,
  isAttachmentDeleting,
  isAttachmentUploading,
}: AttachmentsSectionProps) {
  const { theme } = useAppTheme();

  return (
    <View>
      <View style={styles.sectionLabelContainer}>
        <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.primary }]}>
          Attachments
        </Text>

        <Button
          mode="contained"
          onPress={onAddAttachment}
          disabled={loading}
          icon="plus"
          compact
          style={styles.addButton}
          accessibilityLabel="Add attachment"
          accessibilityHint="Open file picker to add an attachment to this task">
          <Text
            variant="labelLarge"
            style={[styles.addButtonLabel, { color: theme.colors.onPrimary }]}>
            Add
          </Text>
        </Button>
      </View>

      {error ? (
        <View style={[styles.errorContainer, { backgroundColor: theme.colors.errorContainer }]}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onErrorContainer }}>
            Failed to load attachments. Pull to refresh or try again.
          </Text>
        </View>
      ) : (
        <AttachmentList
          attachments={attachments}
          onDeleteAttachment={onDeleteAttachment}
          onPreviewAttachment={onPreviewAttachment}
          isAttachmentDeleting={isAttachmentDeleting}
          isAttachmentUploading={isAttachmentUploading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabelContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionLabel: {
    padding: SPACING.xs,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  addButton: {
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  addButtonLabel: {
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  errorContainer: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
  },
});
