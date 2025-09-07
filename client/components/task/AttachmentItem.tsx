import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text, IconButton } from "react-native-paper";
import { useAppTheme, BORDER_RADIUS, SPACING } from "@/theme/ThemeProvider";
interface AttachmentItemProps {
  id: string | number; // Unified ID (number for permanent, string for temp)
  file_name: string;
  mime_type: string | null;
  onDelete: (id: string | number) => void;
  onPreview?: (id: string | number) => void;
  isDeleting: boolean;
  isUploading: boolean;
}

const getFileIcon = (mimeType: string | null): string => {
  if (!mimeType) return "file";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "music";
  if (mimeType === "application/pdf") return "file-pdf-box";
  if (mimeType.startsWith("text/")) return "file-document";
  if (mimeType.includes("word")) return "file-word-box";
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "file-excel-box";
  return "file";
};

const getFileIconColor = (mimeType: string | null, theme: any): string => {
  if (!mimeType) return theme.colors.onSurfaceVariant;
  if (mimeType.startsWith("image/")) return "#4CAF50";
  if (mimeType.startsWith("video/")) return "#E91E63";
  if (mimeType.startsWith("audio/")) return "#9C27B0";
  if (mimeType === "application/pdf") return "#F44336";
  if (mimeType.startsWith("text/")) return theme.colors.primary;
  if (mimeType.includes("word")) return "#2196F3";
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "#4CAF50";
  return theme.colors.onSurfaceVariant;
};

const getUserFriendlyFileType = (mimeType: string | null, fileName: string): string => {
  if (!mimeType) {
    const ext = fileName.split(".").pop()?.toLowerCase();
    return ext ? `${ext.toUpperCase()} file` : "Unknown type";
  }

  if (mimeType.startsWith("image/")) return "Image";
  if (mimeType.startsWith("video/")) return "Video";
  if (mimeType.startsWith("audio/")) return "Audio";
  if (mimeType === "application/pdf") return "PDF document";
  if (mimeType.startsWith("text/")) return "Text file";
  if (mimeType.includes("word")) return "Word document";
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "Spreadsheet";

  const ext = fileName.split(".").pop()?.toLowerCase();
  return ext ? `${ext.toUpperCase()} file` : "Document";
};

function AttachmentItem({
  id,
  file_name,
  mime_type,
  onDelete,
  onPreview,
  isDeleting,
  isUploading,
}: AttachmentItemProps) {
  const { theme } = useAppTheme();

  const isDisabled = isUploading || isDeleting;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: theme.colors.surface },
        isDisabled && { opacity: 0.7 },
      ]}
      activeOpacity={isDisabled ? 1 : 0.7}
      onPress={() => !isDisabled && onPreview?.(id)}
      disabled={isDisabled}>
      <View style={styles.fileInfo}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: getFileIconColor(mime_type, theme) + "20",
            },
          ]}>
          <IconButton
            icon={isUploading ? "upload" : getFileIcon(mime_type)}
            size={20}
            iconColor={isUploading ? theme.colors.primary : getFileIconColor(mime_type, theme)}
            style={styles.fileIcon}
          />
        </View>
        <View style={styles.fileDetails}>
          <Text
            variant="bodyMedium"
            style={[styles.fileName, { color: theme.colors.onSurface }]}
            numberOfLines={1}
            ellipsizeMode="middle">
            {file_name}
          </Text>
          <Text
            variant="bodySmall"
            style={[styles.fileType, { color: theme.colors.onSurfaceVariant }]}>
            {isUploading ? "Uploading..." : getUserFriendlyFileType(mime_type, file_name)}
          </Text>
        </View>
      </View>
      <IconButton
        icon={isDeleting ? "loading" : "close"}
        size={20}
        iconColor={theme.colors.error}
        onPress={() => !isDeleting && onDelete(id)}
        style={[styles.deleteButton, isDeleting && { opacity: 0.5 }]}
        disabled={isDeleting}
        accessibilityLabel={isDeleting ? "Deleting attachment..." : "Delete attachment"}
        accessibilityHint={isDeleting ? `Deleting ${file_name}...` : `Delete ${file_name}`}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: SPACING.xs,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  fileInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    borderRadius: BORDER_RADIUS.sm,
    marginRight: SPACING.md,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  fileIcon: {
    margin: 0,
  },
  fileDetails: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  fileName: {
    fontWeight: "500",
    marginBottom: 2,
  },
  fileType: {
    fontSize: 12,
    opacity: 0.7,
  },
  deleteButton: {
    margin: 0,
    borderRadius: BORDER_RADIUS.sm,
    width: 44,
    height: 44,
  },
});

export default React.memo(AttachmentItem);
