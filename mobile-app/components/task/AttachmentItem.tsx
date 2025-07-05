import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, IconButton } from "react-native-paper";
import { useAppTheme, BORDER_RADIUS, SPACING } from "@/theme/ThemeProvider";

interface AttachmentItemProps {
  id: string | number;
  file_name: string;
  mime_type: string | null;
  onDelete: (id: string | number) => void;
}

const getFileIcon = (mimeType: string | null): string => {
  if (!mimeType) return "file";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "file-pdf-box";
  if (mimeType.startsWith("text/")) return "file-document";
  if (mimeType.includes("word")) return "file-word-box";
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "file-excel-box";
  return "file";
};

export default function AttachmentItem({
  id,
  file_name,
  mime_type,
  onDelete,
}: AttachmentItemProps) {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.fileInfo}>
        <IconButton
          icon={getFileIcon(mime_type)}
          size={24}
          iconColor={theme.colors.primary}
          style={styles.fileIcon}
        />
        <Text
          variant="bodyMedium"
          style={[styles.fileName, { color: theme.colors.onSurface }]}
          numberOfLines={1}
          ellipsizeMode="middle">
          {file_name}
        </Text>
      </View>
      <IconButton
        icon="close"
        size={20}
        iconColor={theme.colors.error}
        onPress={() => onDelete(id)}
        style={styles.deleteButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  fileInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  fileIcon: {
    margin: 0,
    marginRight: SPACING.sm,
  },
  fileName: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  deleteButton: {
    margin: 0,
  },
});