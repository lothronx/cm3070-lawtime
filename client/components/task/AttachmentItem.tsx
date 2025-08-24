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
}

const getFileIcon = (mimeType: string | null): string => {
  if (!mimeType) return "file";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "file-pdf-box";
  if (mimeType.startsWith("text/")) return "file-document";
  if (mimeType.includes("word")) return "file-word-box";
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "file-excel-box";
  if (mimeType === "message/rfc822") return "email";
  return "file";
};

const getFileIconColor = (mimeType: string | null, theme: any): string => {
  if (!mimeType) return theme.colors.onSurfaceVariant;
  if (mimeType.startsWith("image/")) return "#4CAF50";
  if (mimeType === "application/pdf") return "#F44336";
  if (mimeType.startsWith("text/")) return theme.colors.primary;
  if (mimeType.includes("word")) return "#2196F3";
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "#4CAF50";
  if (mimeType === "message/rfc822") return "#FF9800";
  return theme.colors.onSurfaceVariant;
};

const getUserFriendlyFileType = (mimeType: string | null, fileName: string): string => {
  if (!mimeType) {
    // Extract extension from filename as fallback
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ext ? `${ext.toUpperCase()} file` : 'Unknown type';
  }
  
  if (mimeType.startsWith("image/")) return "Image";
  if (mimeType === "application/pdf") return "PDF document";
  if (mimeType.startsWith("text/")) return "Text file";
  if (mimeType.includes("word")) return "Word document";
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "Spreadsheet";
  if (mimeType === "message/rfc822") return "Email";
  if (mimeType.startsWith("audio/")) return "Audio file";
  if (mimeType.startsWith("video/")) return "Video file";
  
  // Extract file extension as fallback
  const ext = fileName.split('.').pop()?.toLowerCase();
  return ext ? `${ext.toUpperCase()} file` : 'Document';
};

export default function AttachmentItem({
  id,
  file_name,
  mime_type,
  onDelete,
  onPreview,
}: AttachmentItemProps) {
  const { theme } = useAppTheme();

  return (
    <TouchableOpacity 
      style={[styles.container, { 
        backgroundColor: theme.colors.surface,
      }]}
      activeOpacity={0.7}
      onPress={() => onPreview?.(id)}>
      <View style={styles.fileInfo}>
        <View style={[styles.iconContainer, { 
          backgroundColor: getFileIconColor(mime_type, theme) + '20',
        }]}>
          <IconButton
            icon={getFileIcon(mime_type)}
            size={20}
            iconColor={getFileIconColor(mime_type, theme)}
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
            {getUserFriendlyFileType(mime_type, file_name)}
          </Text>
        </View>
      </View>
      <IconButton
        icon="close"
        size={20}
        iconColor={theme.colors.error}
        onPress={() => onDelete(id)}
        style={styles.deleteButton}
        accessibilityLabel="Delete attachment"
        accessibilityHint={`Delete ${file_name}`}
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