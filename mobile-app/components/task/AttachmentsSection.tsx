import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, Button } from "react-native-paper";
import { useAppTheme, SPACING } from "@/theme/ThemeProvider";
import AttachmentList, { AttachmentFile } from "./AttachmentList";

interface AttachmentsSectionProps {
  attachments: AttachmentFile[];
  onDeleteAttachment: (id: string | number) => void;
  onAddAttachment: () => void;
  loading?: boolean;
}

export default function AttachmentsSection({
  attachments,
  onDeleteAttachment,
  onAddAttachment,
  loading = false,
}: AttachmentsSectionProps) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text
          variant="titleMedium"
          style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Attachments
        </Text>
        
        <Button
          mode="text"
          onPress={onAddAttachment}
          disabled={loading}
          icon="plus"
          compact
          style={styles.addButton}
          labelStyle={[styles.addButtonLabel, { color: theme.colors.primary }]}>
          Add
        </Button>
      </View>
      
      <AttachmentList
        attachments={attachments}
        onDeleteAttachment={onDeleteAttachment}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontWeight: "600",
    flex: 1,
  },
  addButton: {
    marginLeft: SPACING.sm,
  },
  addButtonLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
});
