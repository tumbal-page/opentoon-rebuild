import { useState } from "react";
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
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { router } from "expo-router";
import { sliceImage, DetectedBox } from "../utils/imageSlicer";
import { detectTextBlocks } from "../utils/textDetector";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface SelectedImage {
  uri: string;
  width: number;
  height: number;
}

export default function GalleryScreen() {
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 50,
      quality: 0.8,
    });

    if (!result.canceled) {
      const images = result.assets.map((asset) => ({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
      }));
      setSelectedImages((prev) => [...prev, ...images]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const processAndTranslate = async () => {
    if (selectedImages.length === 0) {
      Alert.alert("Error", "No images selected");
      return;
    }

    setIsProcessing(true);

    try {
      const allDetectedBoxes: { imageIndex: number; boxes: DetectedBox[] }[] = [];

      for (let i = 0; i < selectedImages.length; i++) {
        const image = selectedImages[i];

        const slices = await sliceImage(image.uri, {
          sliceHeight: 640,
          overlap: 50,
        });

        const detectedBoxes = await detectTextBlocks(slices);

        allDetectedBoxes.push({
          imageIndex: i,
          boxes: detectedBoxes,
        });
      }

      router.push({
        pathname: "/viewer",
        params: {
          images: JSON.stringify(selectedImages.map((img) => img.uri)),
          detectedBoxes: JSON.stringify(allDetectedBoxes),
        },
      });
    } catch (error) {
      Alert.alert("Error", `Processing failed: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Manga/Manhwa Pages</Text>
        <Text style={styles.subtitle}>
          Choose images from your gallery to translate
        </Text>
      </View>

      <TouchableOpacity style={styles.pickButton} onPress={pickImages}>
        <Text style={styles.pickButtonText}>📁 Pick Images</Text>
      </TouchableOpacity>

      {selectedImages.length > 0 && (
        <ScrollView style={styles.imageList}>
          {selectedImages.map((img, index) => (
            <View key={index} style={styles.imageItem}>
              <Image source={{ uri: img.uri }} style={styles.imagePreview} />
              <View style={styles.imageInfo}>
                <Text style={styles.imageIndex}>Page {index + 1}</Text>
                <Text style={styles.imageSize}>
                  {img.width} x {img.height}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeImage(index)}
              >
                <Text style={styles.removeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {selectedImages.length > 0 && (
        <TouchableOpacity
          style={styles.translateButton}
          onPress={processAndTranslate}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.translateButtonText}>
              Process & Translate ({selectedImages.length} pages)
            </Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    marginTop: 4,
  },
  pickButton: {
    backgroundColor: "#2a2a4a",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  pickButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  imageList: {
    flex: 1,
    marginTop: 16,
  },
  imageItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a2a4a",
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  imagePreview: {
    width: 60,
    height: 80,
    borderRadius: 4,
  },
  imageInfo: {
    flex: 1,
    marginLeft: 12,
  },
  imageIndex: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  imageSize: {
    color: "#888",
    fontSize: 12,
    marginTop: 2,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ff4444",
    justifyContent: "center",
    alignItems: "center",
  },
  removeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  translateButton: {
    backgroundColor: "#5C67C2",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  translateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
