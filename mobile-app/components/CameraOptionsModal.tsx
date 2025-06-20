import * as React from "react";
import { View, StyleSheet, Modal, TouchableOpacity } from "react-native";
import { List, Surface } from "react-native-paper";

interface CameraOptionsModalProps {
  visible: boolean;
  onDismiss: () => void;
  onPhotoLibrary: () => void;
  onTakePhoto: () => void;
  onChooseFile: () => void;
}

/**
 * CameraOptionsModal component
 *
 * A modal that provides camera and file selection options.
 */
export default function CameraOptionsModal({
  visible,
  onDismiss,
  onPhotoLibrary,
  onTakePhoto,
  onChooseFile,
}: CameraOptionsModalProps) {
  // Use console.log to debug visibility
  React.useEffect(() => {
    if (visible) {
      console.log("CameraOptionsModal is now visible");
    }
  }, [visible]);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onDismiss}
      statusBarTranslucent={true}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onDismiss}>
        <View style={styles.centeredView}>
          <Surface style={styles.modalView}>
            <List.Item
              title="Photo Library"
              left={(props) => <List.Icon {...props} icon="image" />}
              onPress={() => {
                onPhotoLibrary();
                onDismiss();
              }}
              style={styles.listItem}
            />
            <List.Item
              title="Take Photo"
              left={(props) => <List.Icon {...props} icon="camera" />}
              onPress={() => {
                onTakePhoto();
                onDismiss();
              }}
              style={styles.listItem}
            />
            <List.Item
              title="Choose File"
              left={(props) => <List.Icon {...props} icon="file" />}
              onPress={() => {
                onChooseFile();
                onDismiss();
              }}
              style={styles.listItem}
            />
          </Surface>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    bottom: 200,
    justifyContent: "flex-end",
    alignItems: "center",
    zIndex: 9999,
  },
  centeredView: {
    justifyContent: "center",
    alignItems: "center",
  },
  modalView: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
  },
  listItem: {
    paddingVertical: 8,
  },
});
