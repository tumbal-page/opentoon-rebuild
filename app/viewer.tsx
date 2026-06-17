import { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { DetectedBox } from "../utils/imageSlicer";
import { translateDetectedBlocks, TranslatedBlock } from "../services/translationService";
import { calculateTextStyle, TextStyle, shouldUseVerticalText } from "../utils/textPlacement";
import { calculateFontConfig, createFontString } from "../utils/fontMatcher";
import { detectBubbleShape, calculateBubbleStyle, fitTextInBubble } from "../utils/textBubble";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Image dimensions (assumed from detection)
const DETECTION_WIDTH = 1200;
const DETECTION_HEIGHT = 1800;

export default function ViewerScreen() {
  const params = useLocalSearchParams<{
    images: string;
    detectedBoxes: string;
  }>();

  const [images] = useState<string[]>(JSON.parse(params.images || "[]"));
  const [detectedBoxes] = useState<{ imageIndex: number; boxes: DetectedBox[] }[]>(
    JSON.parse(params.detectedBoxes || "[]")
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [translatedBlocks, setTranslatedBlocks] = useState<TranslatedBlock[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState("ja");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [displayMode, setDisplayMode] = useState<"overlay" | "bubble" | "hidden">("overlay");

  const currentImage = images[currentIndex];
  const currentBoxes = detectedBoxes.find((d) => d.imageIndex === currentIndex)?.boxes || [];

  // Calculate scale ratio for rendering
  const imageContainerHeight = SCREEN_HEIGHT * 0.6;
  const scaleRatio = Math.min(
    SCREEN_WIDTH / DETECTION_WIDTH,
    imageContainerHeight / DETECTION_HEIGHT
  );

  // Calculate text styles for all translated blocks
  const textStyles = useMemo(() => {
    return translatedBlocks.map((block) => {
      const config = {
        maxWidth: SCREEN_WIDTH,
        maxHeight: imageContainerHeight,
        imageWidth: DETECTION_WIDTH,
        imageHeight: DETECTION_HEIGHT,
        scaleRatio,
      };

      const textStyle = calculateTextStyle(
        { ...block, id: "", classId: 1, displayMode: displayMode as any },
        config
      );

      const fontConfig = calculateFontConfig(
        { ...block, id: "", classId: 1, displayMode: displayMode as any },
        targetLanguage,
        block.height * scaleRatio
      );

      const bubbleShape = detectBubbleShape(
        { ...block, id: "", classId: 1, rotationDeg: 0, displayMode: "overlay" }
      );

      return {
        textStyle,
        fontConfig,
        bubbleShape,
        useVertical: shouldUseVerticalText(
          { ...block, id: "", classId: 1, rotationDeg: 0, displayMode: "overlay", rawText: "" }
        ),
      };
    });
  }, [translatedBlocks, scaleRatio, displayMode, targetLanguage]);

  const startTranslation = async () => {
    setIsTranslating(true);
    try {
      const results = await translateDetectedBlocks(
        currentBoxes,
        sourceLanguage,
        targetLanguage
      );
      setTranslatedBlocks(results);
    } catch (error) {
      Alert.alert("Translation Error", "Failed to translate. Check your server settings.");
    } finally {
      setIsTranslating(false);
    }
  };

  const nextImage = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setTranslatedBlocks([]);
    }
  };

  const prevImage = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setTranslatedBlocks([]);
    }
  };

  const cycleDisplayMode = () => {
    const modes: ("overlay" | "bubble" | "hidden")[] = ["overlay", "bubble", "hidden"];
    const idx = modes.indexOf(displayMode);
    setDisplayMode(modes[(idx + 1) % modes.length]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageInfo}>
          Page {currentIndex + 1} / {images.length}
        </Text>
        <Text style={styles.boxInfo}>
          {currentBoxes.length} text blocks detected
        </Text>
      </View>

      {/* Image Viewer */}
      <View style={styles.viewerContainer}>
        <Image
          source={{ uri: currentImage }}
          style={styles.image}
          resizeMode="contain"
        />

        {/* Text Blocks Overlay */}
        {displayMode !== "hidden" && translatedBlocks.map((block, index) => {
          const styles_data = textStyles[index];
          if (!styles_data) return null;

          const { textStyle, fontConfig, bubbleShape } = styles_data;
          const scaledWidth = block.width * scaleRatio;
          const scaledHeight = block.height * scaleRatio;

          return (
            <View
              key={index}
              style={[
                styles.textBlockContainer,
                {
                  left: block.x * scaleRatio,
                  top: block.y * scaleRatio,
                  width: scaledWidth,
                  height: scaledHeight,
                  backgroundColor:
                    displayMode === "bubble"
                      ? bubbleShape.backgroundColor
                      : "rgba(0,0,0,0.6)",
                  borderRadius:
                    displayMode === "bubble"
                      ? bubbleShape.cornerRadius
                      : 4,
                  borderWidth:
                    displayMode === "bubble" ? bubbleShape.borderWidth : 0,
                  borderColor:
                    displayMode === "bubble" ? bubbleShape.borderColor : "transparent",
                  justifyContent: "center",
                  alignItems: "center",
                },
              ]}
            >
              <Text
                style={[
                  styles.translatedTextBlock,
                  {
                    fontSize: fontConfig.fontSize,
                    fontFamily: fontConfig.fontFamily,
                    fontWeight: fontConfig.fontWeight,
                    color:
                      displayMode === "bubble"
                        ? "#000000"
                        : block.fontColor || "#FFFFFF",
                    textAlign: "center",
                    lineHeight: fontConfig.fontSize * 1.3,
                    padding: displayMode === "bubble" ? 6 : 2,
                  },
                ]}
                numberOfLines={4}
              >
                {block.translatedText}
              </Text>
            </View>
          );
        })}

        {/* Debug: Show bounding boxes when no translation */}
        {translatedBlocks.length === 0 && currentBoxes.map((box, index) => (
          <View
            key={`debug-${index}`}
            style={[
              styles.debugBox,
              {
                left: (box.originalX1 / DETECTION_WIDTH) * SCREEN_WIDTH,
                top: (box.originalY1 / DETECTION_HEIGHT) * imageContainerHeight,
                width: ((box.originalX2 - box.originalX1) / DETECTION_WIDTH) * SCREEN_WIDTH,
                height: ((box.originalY2 - box.originalY1) / DETECTION_HEIGHT) * imageContainerHeight,
                borderColor: box.classId === 1 ? "#5C67C2" : "#4CAF50",
              },
            ]}
          >
            <Text style={styles.debugText}>
              {box.classId === 1 ? "Bubble" : "Text"} {Math.round(box.confidence * 100)}%
            </Text>
          </View>
        ))}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
          onPress={prevImage}
          disabled={currentIndex === 0}
        >
          <Text style={styles.navButtonText}>◀ Prev</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.translateButton}
          onPress={startTranslation}
          disabled={isTranslating}
        >
          {isTranslating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.translateButtonText}>🔄 Translate</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeButton, displayMode === "bubble" && styles.modeButtonActive]}
          onPress={cycleDisplayMode}
        >
          <Text style={styles.modeButtonText}>
            {displayMode === "overlay"
              ? "📝 Overlay"
              : displayMode === "bubble"
              ? "💬 Bubble"
              : "👁️ Hidden"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            currentIndex === images.length - 1 && styles.navButtonDisabled,
          ]}
          onPress={nextImage}
          disabled={currentIndex === images.length - 1}
        >
          <Text style={styles.navButtonText}>Next ▶</Text>
        </TouchableOpacity>
      </View>

      {/* Language Settings */}
      <View style={styles.languageBar}>
        <Text style={styles.languageLabel}>From:</Text>
        <TouchableOpacity
          style={styles.languageChip}
          onPress={() => setSourceLanguage(sourceLanguage === "ja" ? "ko" : "ja")}
        >
          <Text style={styles.languageChipText}>
            {sourceLanguage === "ja" ? "🇯🇵 Japanese" : "🇰🇷 Korean"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.languageLabel}>To:</Text>
        <TouchableOpacity
          style={styles.languageChip}
          onPress={() => {
            const langs = ["en", "id", "ms", "zh"];
            const idx = langs.indexOf(targetLanguage);
            setTargetLanguage(langs[(idx + 1) % langs.length]);
          }}
        >
          <Text style={styles.languageChipText}>
            {targetLanguage === "en"
              ? "🇬🇧 English"
              : targetLanguage === "id"
              ? "🇮🇩 Indonesian"
              : targetLanguage === "ms"
              ? "🇲🇾 Malay"
              : "🇨🇳 Chinese"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#2a2a4a",
  },
  pageInfo: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  boxInfo: {
    color: "#888",
    fontSize: 12,
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.6,
  },
  textBlockContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  translatedTextBlock: {
    textAlign: "center",
  },
  debugBox: {
    position: "absolute",
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 2,
    backgroundColor: "rgba(92, 103, 194, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  debugText: {
    color: "#fff",
    fontSize: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 3,
    borderRadius: 2,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#2a2a4a",
    gap: 6,
  },
  navButton: {
    backgroundColor: "#3a3a5a",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    color: "#fff",
    fontSize: 13,
  },
  translateButton: {
    backgroundColor: "#5C67C2",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  translateButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  modeButton: {
    backgroundColor: "#4a4a6a",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modeButtonActive: {
    backgroundColor: "#2d7a3a",
  },
  modeButtonText: {
    color: "#fff",
    fontSize: 11,
  },
  languageBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#1a1a2e",
    gap: 8,
  },
  languageLabel: {
    color: "#888",
    fontSize: 12,
  },
  languageChip: {
    backgroundColor: "#2a2a4a",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#5C67C2",
  },
  languageChipText: {
    color: "#fff",
    fontSize: 12,
  },
});
