import React from "react";
import { View, StyleSheet, Linking, Alert } from "react-native";
import { Text, Button } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { useAppTheme, SPACING, BORDER_RADIUS } from "@/theme/ThemeProvider";
import { processAndValidatePickerFile } from "@/utils/fileUploadUtils";
import { isPermanentAttachment, TaskFile } from "@/types";
import { useTaskFiles } from "@/hooks/useTaskFiles";
import AttachmentList from "./AttachmentList";

interface AttachmentsSectionProps {
  taskId?: number;
  onFileUpload?: () => void;
  onSnackbar?: (message: string) => void;
  externalLoading?: boolean;
  onHooksChange?: (hooks: {
    commitTempFiles: (taskId: number, clearTempAfterCommit?: boolean) => Promise<TaskFile[]>;
    clearTempFiles: () => Promise<void>;
    uploading: boolean;
    committing: boolean;
  }) => void;
}

export default function AttachmentsSection({
  taskId,
  onFileUpload,
  onSnackbar,
  externalLoading = false,
  onHooksChange,
}: AttachmentsSectionProps) {
  const { theme } = useAppTheme();

  // Use the task files hook for file operations
  const {
    attachments,
    isLoading: taskFilesLoading,
    error: taskFilesError,
    uploading,
    committing,
    upload,
    delete: deleteAttachment,
    preview,
    isDeleting,
    isUploading: isAttachmentUploading,
    commitTempFiles,
    clearTempFiles,
  } = useTaskFiles(taskId || null);

  const loading = externalLoading || taskFilesLoading || uploading || committing;

  // Memoize the hooks object to prevent unnecessary re-renders
  const hooksObject = React.useMemo(() => ({
    commitTempFiles,
    clearTempFiles,
    uploading,
    committing,
  }), [commitTempFiles, clearTempFiles, uploading, committing]);

  // Notify parent component when hooks change
  React.useEffect(() => {
    onHooksChange?.(hooksObject);
  }, [hooksObject, onHooksChange]);

  const handleAddAttachment = async () => {
    console.log("Add attachment pressed");

    try {
      // Request permission to access media library
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant access to your photo library to add images.",
          [{ text: "OK" }]
        );
        return;
      }

      // Launch image picker with multiple selection
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 0.8,
        exif: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      // Validate and upload files to temp storage
      const validFiles = [];
      const invalidFiles = [];

      // Process and validate each file
      for (const asset of result.assets) {
        const { file, validation } = processAndValidatePickerFile(asset);
        if (validation.isValid) {
          validFiles.push(file);
        } else {
          invalidFiles.push({ fileName: asset.fileName || "unknown", error: validation.error });
        }
      }

      // Show validation errors if any
      if (invalidFiles.length > 0) {
        const errorMessage = `${invalidFiles.length} file(s) were skipped:\n${invalidFiles
          .map((f) => `• ${f.fileName}: ${f.error}`)
          .join("\n")}`;
        Alert.alert("File Validation Error", errorMessage, [{ text: "OK" }]);

        // If no valid files, return early
        if (validFiles.length === 0) {
          return;
        }
      }

      // Upload valid files
      await upload(validFiles);

      // Notify parent about file upload
      onFileUpload?.();

      const successMessage =
        validFiles.length === 1
          ? "1 photo added successfully"
          : `${validFiles.length} photos added successfully`;

      onSnackbar?.(successMessage);
    } catch (error) {
      console.error("Photo selection error:", error);
      Alert.alert("Upload Failed", "Failed to add photos. Please try again.", [{ text: "OK" }]);
    }
  };

  const handleDeleteAttachment = async (id: string | number) => {
    console.log("Delete attachment:", id);

    // Find the attachment to get its name for confirmation
    const attachment = attachments.find((att) => att.id === id);
    if (!attachment) {
      console.warn("Attachment not found:", id);
      onSnackbar?.("Attachment not found");
      return;
    }

    // Show confirmation dialog for permanent files
    const isPermanent = isPermanentAttachment(attachment);
    if (isPermanent) {
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

  const handlePreviewAttachment = async (id: string | number) => {
    console.log("Preview attachment:", id);

    try {
      // Find the attachment in attachments
      const attachment = attachments.find((att) => att.id === id);
      if (!attachment) {
        console.warn("Attachment not found:", id);
        onSnackbar?.("File not found");
        return;
      }

      // Get unified preview URL from hook (handles both temp and permanent files)
      const previewUrl = await preview(attachment);

      console.log("Opening file via URL:", previewUrl);

      // Attempt to open the URL
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
          onPress={handleAddAttachment}
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

      {taskFilesError ? (
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
          isAttachmentDeleting={isDeleting}
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
