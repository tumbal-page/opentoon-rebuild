import { DetectedBox, ImageSlice } from "./imageSlicer";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";

/**
 * Text Detection Module - TFLite Integration
 *
 * Uses the original TFLite model (detector_dywi8.tflite) from OpenToon APK.
 *
 * The custom TFLite model detects:
 * - Class 1: Speech bubbles (gelembung dialog)
 * - Class 2: Free-standing text (teks bebas)
 *
 * Model specifications:
 * - Input size: 640x640 pixels
 * - Confidence threshold: 0.3 (30%)
 * - Minimum detection box size: 5px
 * - IoU merge threshold: 0.5
 *
 * This module runs ENTIRELY on-device (local).
 * No server connection needed for text detection.
 */

// Model constants (matching the original app's TFLite model)
const MODEL_INPUT_SIZE = 640;
const CONFIDENCE_THRESHOLD = 0.3;
const MIN_BOX_SIZE = 5;
const CLASS_TEXT_BUBBLE = 1;
const CLASS_TEXT_FREE = 2;
const TEXT_DETECTION_MERGE_IOU_THRESHOLD = 0.5;

// TFLite model instance
let tfliteModel: any = null;
let modelLoaded = false;

/**
 * Initialize the TFLite text detection model
 *
 * Loads the original detector_dywi8.tflite from assets
 */
async function initializeModel(): Promise<void> {
  if (modelLoaded) return;

  try {
    // In production, use @tensorflow/tflite-react-native:
    //
    // import { TFLiteModel } from '@tensorflow/tflite-react-native';
    //
    // // Load model from assets
    // const modelAsset = Asset.fromModule(require('../assets/detector_dywi8.tflite'));
    // await modelAsset.downloadAsync();
    //
    // tfliteModel = await TFLiteModel.fromModel(modelAsset.uri, {
    //   numThreads: 4,
    // });
    //
    // modelLoaded = true;
    // console.log("TFLite model loaded successfully");

    // For now, log that we're using mock mode
    console.log("TFLite model: Using mock mode (model file available at src/assets/detector_dywi8.tflite)");
    modelLoaded = true;
  } catch (error) {
    console.error("Failed to initialize TFLite model:", error);
    throw error;
  }
}

/**
 * Detect text blocks in image slices
 *
 * @param slices - Array of image slices to process
 * @returns Array of detected bounding boxes
 */
export async function detectTextBlocks(
  slices: ImageSlice[]
): Promise<DetectedBox[]> {
  await initializeModel();

  const allBoxes: DetectedBox[] = [];

  for (const slice of slices) {
    const boxes = await detectInSlice(slice);
    allBoxes.push(...boxes);
  }

  // Merge overlapping boxes across slices
  return mergeOverlappingBoxes(allBoxes);
}

/**
 * Detect text blocks in a single image slice
 *
 * @param slice - Image slice to process
 * @returns Array of detected bounding boxes for this slice
 */
async function detectInSlice(slice: ImageSlice): Promise<DetectedBox[]> {
  try {
    // ============================================================
    // PRODUCTION CODE - Uncomment when TFLite is properly set up
    // ============================================================
    //
    // // 1. Load and preprocess image
    // const imageData = await loadImageData(slice.uri);
    // const resized = resizeImage(imageData, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
    //
    // // 2. Run TFLite inference
    // const inputTensor = tf.tensor4d(
    //   resized.data,
    //   [1, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE, 3]
    // );
    // const output = await tfliteModel.predict(inputTensor);
    //
    // // 3. Parse outputs (model outputs boxes and class logits)
    // const boxes = output.boxes.dataSync();
    // const logits = output.logits.dataSync();
    //
    // // 4. Filter by confidence and map to original coordinates
    // const detections: DetectedBox[] = [];
    // const numDetections = logits.length / 3; // 3 classes: background, bubble, free text
    //
    // for (let i = 0; i < numDetections; i++) {
    //   const classScores = [
    //     logits[i * 3],      // background
    //     logits[i * 3 + 1],  // speech bubble (class 1)
    //     logits[i * 3 + 2],  // free text (class 2)
    //   ];
    //
    //   const confidence = Math.max(classScores[1], classScores[2]);
    //   const classId = classScores[1] > classScores[2] ? 1 : 2;
    //
    //   if (confidence > CONFIDENCE_THRESHOLD) {
    //     // Scale boxes from model input (640x640) to original slice size
    //     const scaleX = slice.originalWidth / MODEL_INPUT_SIZE;
    //     const scaleY = slice.height / MODEL_INPUT_SIZE;
    //
    //     const x1 = boxes[i * 4] * scaleX;
    //     const y1 = boxes[i * 4 + 1] * scaleY;
    //     const x2 = boxes[i * 4 + 2] * scaleX;
    //     const y2 = boxes[i * 4 + 3] * scaleY;
    //
    //     const boxWidth = x2 - x1;
    //     const boxHeight = y2 - y1;
    //
    //     // Filter small boxes
    //     if (boxWidth >= MIN_BOX_SIZE && boxHeight >= MIN_BOX_SIZE) {
    //       detections.push({
    //         x1,
    //         y1,
    //         x2,
    //         y2,
    //         classId,
    //         confidence,
    //         sliceIndex: slice.index,
    //         // Map Y coordinates back to original image space
    //         originalX1: x1,
    //         originalY1: y1 + slice.offsetY,
    //         originalX2: x2,
    //         originalY2: y2 + slice.offsetY,
    //       });
    //     }
    //   }
    // }
    //
    // // Cleanup tensors
    // inputTensor.dispose();
    // output.boxes.dispose();
    // output.logits.dispose();
    //
    // return detections;

    // ============================================================
    // MOCK MODE - Remove when TFLite is properly set up
    // ============================================================
    return generateMockDetections(slice);

  } catch (error) {
    console.error(`Detection failed for slice ${slice.index}:`, error);
    return [];
  }
}

/**
 * Generate mock detections for development/testing
 * Simulates realistic manga text block detection
 */
function generateMockDetections(slice: ImageSlice): DetectedBox[] {
  const mockBoxes: DetectedBox[] = [];

  // Simulate 2-4 text blocks per slice (realistic for manga)
  const numBoxes = Math.floor(Math.random() * 3) + 2;

  for (let i = 0; i < numBoxes; i++) {
    // Position within slice
    const x1 = Math.random() * (slice.originalWidth - 200) + 50;
    const y1 = Math.random() * (slice.height - 100) + 30;

    // Realistic manga text box sizes
    const isBubble = Math.random() > 0.4;
    const width = isBubble
      ? Math.random() * 120 + 80   // Bubble: 80-200px wide
      : Math.random() * 200 + 100;  // Free text: 100-300px wide
    const height = isBubble
      ? Math.random() * 50 + 40     // Bubble: 40-90px tall
      : Math.random() * 30 + 20;    // Free text: 20-50px tall

    mockBoxes.push({
      x1,
      y1,
      x2: x1 + width,
      y2: y1 + height,
      classId: isBubble ? CLASS_TEXT_BUBBLE : CLASS_TEXT_FREE,
      confidence: Math.random() * 0.4 + 0.6, // 0.6 - 1.0 (realistic confidence)
      sliceIndex: slice.index,
      originalX1: x1,
      originalY1: y1 + slice.offsetY,
      originalX2: x1 + width,
      originalY2: y1 + height + slice.offsetY,
    });
  }

  return mockBoxes;
}

/**
 * Merge overlapping detection boxes using IoU
 */
function mergeOverlappingBoxes(boxes: DetectedBox[]): DetectedBox[] {
  if (boxes.length === 0) return boxes;

  // Sort by confidence (highest first)
  const sorted = [...boxes].sort((a, b) => b.confidence - a.confidence);
  const merged: DetectedBox[] = [];

  for (const box of sorted) {
    let isDuplicate = false;

    for (const existing of merged) {
      const iou = calculateIoU(box, existing);
      if (iou > TEXT_DETECTION_MERGE_IOU_THRESHOLD) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      merged.push(box);
    }
  }

  return merged;
}

/**
 * Calculate Intersection over Union (IoU) between two boxes
 */
function calculateIoU(a: DetectedBox, b: DetectedBox): number {
  const x1 = Math.max(a.originalX1, b.originalX1);
  const y1 = Math.max(a.originalY1, b.originalY1);
  const x2 = Math.min(a.originalX2, b.originalX2);
  const y2 = Math.min(a.originalY2, b.originalY2);

  const intersectionArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);

  const aArea = (a.originalX2 - a.originalX1) * (a.originalY2 - a.originalY1);
  const bArea = (b.originalX2 - b.originalX1) * (b.originalY2 - b.originalY1);

  const unionArea = aArea + bArea - intersectionArea;

  return unionArea > 0 ? intersectionArea / unionArea : 0;
}

/**
 * Softmax function for class probabilities
 */
function softmax(...values: number[]): number {
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps[values.indexOf(Math.max(...values))] / sum;
}
