import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, Button, IconButton } from "react-native-paper";
import { useAppTheme, SPACING, BORDER_RADIUS } from "@/theme/ThemeProvider";
import AttachmentList, { AttachmentFile } from "./AttachmentList";

interface AttachmentsSectionProps {
  attachments: AttachmentFile[];
  onDeleteAttachment: (id: string | number) => void;
  onAddAttachment: () => void;
  onPreviewAttachment?: (id: string | number) => void;
  loading?: boolean;
}

export default function AttachmentsSection({
  attachments,
  onDeleteAttachment,
  onAddAttachment,
  onPreviewAttachment,
  loading = false,
}: AttachmentsSectionProps) {
  const { theme } = useAppTheme();

  return (
    <View>
      <View style={styles.sectionLabelContainer}>
        <Text variant="labelLarge" style={styles.sectionLabel}>
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

      <AttachmentList
        attachments={attachments}
        onDeleteAttachment={onDeleteAttachment}
        onPreviewAttachment={onPreviewAttachment}
      />
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
});
