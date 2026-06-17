import * as FileSystem from "expo-file-system";

/**
 * Image Slicing Utility
 *
 * This module slices manga/manhwa page images into smaller pieces
 * for better OCR accuracy and server processing efficiency.
 *
 * The slicing strategy:
 * - Split tall images vertically into 640px slices
 * - Add overlap between slices to avoid cutting text in half
 * - Each slice is saved as a separate file
 */

export interface DetectedBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  classId: number; // 1 = speech bubble, 2 = free text
  confidence: number;
  sliceIndex: number;
  // Original coordinates (mapped back to full image)
  originalX1: number;
  originalY1: number;
  originalX2: number;
  originalY2: number;
}

export interface SliceOptions {
  sliceHeight: number;   // Height of each slice (default: 640)
  overlap: number;       // Overlap between slices in pixels (default: 50)
}

export interface ImageSlice {
  uri: string;
  index: number;
  offsetY: number;      // Y offset in the original image
  height: number;       // Actual height of this slice
  originalWidth: number;
  originalHeight: number;
}

/**
 * Slice an image into smaller pieces for processing
 */
export async function sliceImage(
  imageUri: string,
  options: SliceOptions = { sliceHeight: 640, overlap: 50 }
): Promise<ImageSlice[]> {
  const { sliceHeight, overlap } = options;

  // Get image dimensions
  // Note: In production, use expo-image-manipulator or similar
  // to get actual dimensions. Here we assume standard manga page sizes.
  const imageInfo = await getImageInfo(imageUri);

  const slices: ImageSlice[] = [];
  let currentY = 0;
  let sliceIndex = 0;

  while (currentY < imageInfo.height) {
    const sliceEnd = Math.min(currentY + sliceHeight, imageInfo.height);
    const actualHeight = sliceEnd - currentY;

    // Create slice file path
    const sliceFileName = `slice_${sliceIndex}.jpg`;
    const slicePath = `${FileSystem.cacheDirectory}slices/${sliceFileName}`;

    // Ensure directory exists
    await FileSystem.makeDirectoryAsync(`${FileSystem.cacheDirectory}slices/`, {
      intermediates: true,
    });

    // In production, use expo-image-manipulator to crop:
    // import * as ImageManipulator from 'expo-image-manipulator';
    // const result = await ImageManipulator.manipulateAsync(
    //   imageUri,
    //   [{ crop: { originX: 0, originY: currentY, width: imageInfo.width, height: actualHeight } }],
    //   { compress: 0.8, format: 'jpeg' }
    // );
    // slices.push({ uri: result.uri, ... });

    // For now, we reference the original image with offset metadata
    slices.push({
      uri: imageUri, // In production: result.uri (cropped image)
      index: sliceIndex,
      offsetY: currentY,
      height: actualHeight,
      originalWidth: imageInfo.width,
      originalHeight: imageInfo.height,
    });

    // Move to next slice with overlap
    currentY += sliceHeight - overlap;
    sliceIndex++;
  }

  return slices;
}

/**
 * Map detected boxes from slice coordinates back to original image coordinates
 */
export function mapBoxesToOriginal(
  sliceBoxes: DetectedBox[],
  slice: ImageSlice
): DetectedBox[] {
  return sliceBoxes.map((box) => ({
    ...box,
    // Map Y coordinates back to original image space
    originalY1: box.y1 + slice.offsetY,
    originalY2: box.y2 + slice.offsetY,
    originalX1: box.x1,
    originalX2: box.x2,
    sliceIndex: slice.index,
  }));
}

/**
 * Merge overlapping detection boxes
 */
export function mergeOverlappingBoxes(
  boxes: DetectedBox[],
  iouThreshold: number = 0.5
): DetectedBox[] {
  if (boxes.length === 0) return boxes;

  // Sort by confidence (highest first)
  const sorted = [...boxes].sort((a, b) => b.confidence - a.confidence);
  const merged: DetectedBox[] = [];

  for (const box of sorted) {
    let isDuplicate = false;

    for (const existing of merged) {
      const iou = calculateIoU(box, existing);
      if (iou > iouThreshold) {
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
 * Get image information (dimensions)
 */
async function getImageInfo(uri: string): Promise<{
  width: number;
  height: number;
}> {
  // In production, use Image.getSize() or expo-image-manipulator
  // For now, return default manga page dimensions
  return new Promise((resolve) => {
    const Image = require("react-native").Image;
    Image.getSize(
      uri,
      (width: number, height: number) => resolve({ width, height }),
      () => resolve({ width: 1200, height: 1800 }) // Default manga page size
    );
  });
}
