import React from "react";
import { View, StyleSheet, Linking, Alert } from "react-native";
import { Text, Button } from "react-native-paper";
import { useAppTheme, SPACING, BORDER_RADIUS } from "@/theme/ThemeProvider";
import { isPermanentAttachment, TaskFile } from "@/types";
import { useTaskFiles } from "@/hooks/useTaskFiles";
import { useFileOperations } from "@/hooks/useFileOperations";
import { useImagePicker } from "@/hooks/useImagePicker";
import AttachmentList from "./AttachmentList";

interface AttachmentsSectionProps {
  taskId?: number;
  onSnackbar?: (message: string) => void;
  externalLoading?: boolean;
  onHooksChange?: (hooks: {
    commitTempFiles: (taskId: number, clearTempAfterCommit?: boolean) => Promise<TaskFile[]>;
    clearTempFiles: () => Promise<void>;
    uploading: boolean;
    committing: boolean;
  }) => void;
}

/**
 * Simplified AttachmentsSection focused on UI rendering
 * Responsibilities:
 * - Component structure and styling
 * - Event delegation to hooks
 * - Error display
 * - Parent communication
 */
export default function AttachmentsSection({
  taskId,
  onSnackbar,
  externalLoading = false,
  onHooksChange,
}: AttachmentsSectionProps) {
  const { theme } = useAppTheme();

  // Data layer
  const {
    taskFiles,
    isLoading: dataLoading,
    isError: dataError,
    createTaskFiles,
    deleteTaskFile,
  } = useTaskFiles(taskId || null);

  // Business logic layer
  const {
    attachments,
    isUploading,
    isCommitting,
    uploadToTemp,
    uploadToPerm,
    commitTempFiles,
    clearTempFiles,
    deleteAttachment,
    getPreviewUrl,
    isAttachmentDeleting,
    isAttachmentUploading,
  } = useFileOperations({
    taskFiles,
    onCreateTaskFiles: createTaskFiles,
    onDeleteTaskFile: deleteTaskFile,
  });

  // UI interaction layer
  const { openImagePicker } = useImagePicker({
    onFilesSelected: async (files) => {
      if (taskId) {
        // Edit mode: Upload directly to permanent storage
        await uploadToPerm(files, taskId);
        onSnackbar?.("Files uploaded successfully");
      } else {
        // New task mode: Upload to temp storage, will be committed when task is saved
        await uploadToTemp(files);
        onSnackbar?.("Files uploaded successfully");
      }
    },
    onSuccess: (message) => onSnackbar?.(message),
    onError: (message) => onSnackbar?.(message),
  });

  const loading = externalLoading || dataLoading || isUploading || isCommitting;

  // Memoize the hooks object to prevent unnecessary re-renders
  const hooksObject = React.useMemo(
    () => ({
      commitTempFiles,
      clearTempFiles,
      uploading: isUploading,
      committing: isCommitting,
    }),
    [commitTempFiles, clearTempFiles, isUploading, isCommitting]
  );

  // Notify parent component when hooks change
  React.useEffect(() => {
    onHooksChange?.(hooksObject);
  }, [hooksObject, onHooksChange]);

  // Handle delete with confirmation for permanent files
  const handleDeleteAttachment = async (id: string | number) => {
    console.log("Delete attachment:", id);

    const attachment = attachments.find((att) => att.id === id);
    if (!attachment) {
      console.warn("Attachment not found:", id);
      onSnackbar?.("Attachment not found");
      return;
    }

    // Show confirmation dialog for permanent files
    if (isPermanentAttachment(attachment)) {
      Alert.alert(
        "Delete Attachment",
        `Are you sure you want to delete "${attachment.file_name}"? This action cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => deleteAttachment(id),
          },
        ]
      );
    } else {
      // Temp files can be deleted without confirmation
      deleteAttachment(id);
    }
  };

  // Handle preview
  const handlePreviewAttachment = async (id: string | number) => {
    console.log("Preview attachment:", id);

    try {
      const attachment = attachments.find((att) => att.id === id);
      if (!attachment) {
        console.warn("Attachment not found:", id);
        onSnackbar?.("File not found");
        return;
      }

      const previewUrl = await getPreviewUrl(attachment);
      console.log("Opening file via URL:", previewUrl);

      const supported = await Linking.canOpenURL(previewUrl);
      if (supported) {
        await Linking.openURL(previewUrl);
      } else {
        onSnackbar?.("Cannot open this file type on your device");
      }
    } catch (error) {
      console.error("Failed to preview attachment:", error);
      onSnackbar?.("Failed to open file. Please try again.");
    }
  };

  return (
    <View>
      <View style={styles.sectionLabelContainer}>
        <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.primary }]}>
          Attachments
        </Text>

        <Button
          mode="contained"
          onPress={openImagePicker}
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

      {dataError ? (
        <View style={[styles.errorContainer, { backgroundColor: theme.colors.errorContainer }]}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onErrorContainer }}>
            Failed to load attachments. Pull to refresh or try again.
          </Text>
        </View>
      ) : (
        <AttachmentList
          attachments={attachments}
          onDeleteAttachment={handleDeleteAttachment}
          onPreviewAttachment={handlePreviewAttachment}
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
