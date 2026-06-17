import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  Dimensions,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { sliceImage, DetectedBox } from "../utils/imageSlicer";
import { detectTextBlocks } from "../utils/textDetector";
import {
  createChapter,
  savePageImage,
  saveDetectionResults,
} from "../utils/chapterStorage";
import * as SecureStore from "expo-secure-store";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface CapturedImage {
  uri: string;
  width: number;
  height: number;
}

export default function CaptureScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [currentPreview, setCurrentPreview] = useState<string | null>(null);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });

      if (photo?.uri) {
        setCapturedImages((prev) => [
          ...prev,
          {
            uri: photo.uri,
            width: photo.width,
            height: photo.height,
          },
        ]);
        setCurrentPreview(photo.uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take picture");
    }
  };

  const removeImage = (index: number) => {
    setCapturedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const processAndTranslate = async () => {
    if (capturedImages.length === 0) {
      Alert.alert("Error", "No images captured yet");
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Get language settings
      setProcessingStep("Loading settings...");
      const sourceLanguage = (await SecureStore.getItemAsync("source_language")) || "ja";
      const targetLanguage = (await SecureStore.getItemAsync("target_language")) || "en";

      // Step 2: Create chapter
      setProcessingStep("Creating chapter...");
      const chapterId = await createChapter(
        `Chapter ${new Date().toLocaleDateString()}`,
        "My Manga",
        sourceLanguage,
        targetLanguage
      );

      // Step 3: Process each image
      const allDetectedBoxes: { imageIndex: number; boxes: DetectedBox[] }[] = [];

      for (let i = 0; i < capturedImages.length; i++) {
        const image = capturedImages[i];
        setProcessingStep(`Processing page ${i + 1}/${capturedImages.length}...`);

        // Save page image to chapter
        await savePageImage(chapterId, i, image.uri);

        // Slice image into manageable pieces
        const slices = await sliceImage(image.uri, {
          sliceHeight: 640,
          overlap: 50,
        });

        // Detect text blocks in each slice using TFLite
        const detectedBoxes = await detectTextBlocks(slices);

        // Save detection results
        await saveDetectionResults(chapterId, i, detectedBoxes);

        allDetectedBoxes.push({
          imageIndex: i,
          boxes: detectedBoxes,
        });
      }

      // Step 4: Navigate to viewer with detected boxes
      setProcessingStep("Opening viewer...");
      router.push({
        pathname: "/viewer",
        params: {
          chapterId,
          images: JSON.stringify(capturedImages.map((img) => img.uri)),
          detectedBoxes: JSON.stringify(allDetectedBoxes),
        },
      });
    } catch (error) {
      Alert.alert("Error", `Processing failed: ${error}`);
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Camera permission is required to scan manga pages
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera Preview */}
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back">
          {/* Scan Guide Overlay */}
          <View style={styles.scanOverlay}>
            <View style={styles.scanBorder} />
            <Text style={styles.scanHint}>
              Position manga page within the frame
            </Text>
          </View>
        </CameraView>
      </View>

      {/* Processing Status */}
      {isProcessing && (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color="#5C67C2" />
          <Text style={styles.processingText}>{processingStep}</Text>
        </View>
      )}

      {/* Captured Images Preview */}
      {capturedImages.length > 0 && (
        <View style={styles.previewContainer}>
          <Text style={styles.previewTitle}>
            Captured: {capturedImages.length} pages
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {capturedImages.map((img, index) => (
              <TouchableOpacity
                key={index}
                style={styles.previewItem}
                onPress={() => setCurrentPreview(img.uri)}
                onLongPress={() => removeImage(index)}
              >
                <Image source={{ uri: img.uri }} style={styles.previewImage} />
                <Text style={styles.previewIndex}>{index + 1}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Current Preview */}
      {currentPreview && !isProcessing && (
        <View style={styles.currentPreview}>
          <Image
            source={{ uri: currentPreview }}
            style={styles.currentPreviewImage}
            resizeMode="contain"
          />
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]}
          onPress={takePicture}
          disabled={isProcessing}
        >
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>

        {capturedImages.length > 0 && (
          <TouchableOpacity
            style={[styles.translateButton, isProcessing && styles.translateButtonDisabled]}
            onPress={processAndTranslate}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.translateButtonText}>
                Process & Translate ({capturedImages.length} pages)
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
    padding: 20,
  },
  permissionText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: "#5C67C2",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scanBorder: {
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_WIDTH * 0.85 * 1.4,
    borderWidth: 2,
    borderColor: "rgba(92, 103, 194, 0.7)",
    borderRadius: 8,
    borderStyle: "dashed",
  },
  scanHint: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 12,
    textAlign: "center",
  },
  processingContainer: {
    backgroundColor: "rgba(26, 26, 46, 0.95)",
    padding: 16,
    alignItems: "center",
  },
  processingText: {
    color: "#fff",
    fontSize: 14,
    marginTop: 8,
  },
  previewContainer: {
    backgroundColor: "#1a1a2e",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  previewTitle: {
    color: "#888",
    fontSize: 12,
    marginBottom: 8,
  },
  previewItem: {
    width: 60,
    height: 80,
    marginRight: 8,
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#5C67C2",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewIndex: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "rgba(0,0,0,0.7)",
    color: "#fff",
    fontSize: 10,
    paddingHorizontal: 4,
    borderRadius: 2,
  },
  currentPreview: {
    height: 120,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  currentPreviewImage: {
    width: SCREEN_WIDTH,
    height: 120,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "#1a1a2e",
    gap: 20,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#fff",
  },
  translateButton: {
    backgroundColor: "#5C67C2",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    flex: 1,
    maxWidth: 250,
  },
  translateButtonDisabled: {
    opacity: 0.6,
  },
  translateButtonText: {
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
  },
});
