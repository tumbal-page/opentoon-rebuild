/**
 * Text Placement Module
 *
 * Handles positioning, sizing, and rendering of translated text
 * over manga/manhwa images.
 *
 * Features:
 * - Auto-sizing font to fit bounding box
 * - Text wrapping for long translations
 * - Rotation support
 * - Vertical text support (for Japanese)
 * - Multiple display modes (overlay, bubble, hidden)
 */

export interface TextBlock {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDeg: number;
  rawText: string;
  translatedText: string;
  fontColor: string;
  displayMode: "overlay" | "bubble" | "hidden" | "original";
  classId: number; // 1 = speech bubble, 2 = free text
}

export interface TextStyle {
  left: number;
  top: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  color: string;
  textAlign: "left" | "center" | "right";
  lineHeight: number;
  transform: string[];
  padding: number;
  backgroundColor?: string;
  borderRadius?: number;
}

export interface PlacementConfig {
  maxWidth: number;
  maxHeight: number;
  imageWidth: number;
  imageHeight: number;
  scaleRatio: number;
}

/**
 * Calculate text style for a text block
 *
 * @param block - Text block with position and content
 * @param config - Placement configuration
 * @returns Calculated text style for rendering
 */
export function calculateTextStyle(
  block: TextBlock,
  config: PlacementConfig
): TextStyle {
  const { x, y, width, height, rotationDeg, fontColor, displayMode, classId } = block;
  const { scaleRatio } = config;

  // Scale coordinates to actual image size
  const scaledX = x * scaleRatio;
  const scaledY = y * scaleRatio;
  const scaledWidth = width * scaleRatio;
  const scaledHeight = height * scaleRatio;

  // Calculate optimal font size
  const fontSize = calculateFontSize(
    block.translatedText,
    scaledWidth,
    scaledHeight,
    classId
  );

  // Determine text alignment based on class
  const textAlign = classId === 1 ? "center" : "left";

  // Build transform for rotation
  const transform: string[] = [];
  if (rotationDeg !== 0) {
    transform.push(`rotate(${rotationDeg}deg)`);
  }

  // Calculate padding based on display mode
  const padding = displayMode === "bubble" ? 6 : 2;

  // Background for better readability
  let backgroundColor: string | undefined;
  let borderRadius: number | undefined;

  if (displayMode === "overlay") {
    backgroundColor = "rgba(0,0,0,0.5)";
    borderRadius = 4;
  } else if (displayMode === "bubble") {
    backgroundColor = "rgba(255,255,255,0.9)";
    borderRadius = scaledHeight * 0.3;
  }

  return {
    left: scaledX,
    top: scaledY,
    width: scaledWidth,
    height: scaledHeight,
    fontSize,
    fontFamily: "sans-serif",
    fontWeight: "normal",
    fontStyle: "normal",
    color: displayMode === "bubble" ? "#000000" : fontColor || "#FFFFFF",
    textAlign,
    lineHeight: fontSize * 1.2,
    transform,
    padding,
    backgroundColor,
    borderRadius,
  };
}

/**
 * Calculate optimal font size to fit text within bounds
 *
 * @param text - Text to fit
 * @param maxWidth - Maximum width available
 * @param maxHeight - Maximum height available
 * @param classId - Text class (bubble or free text)
 * @returns Optimal font size
 */
function calculateFontSize(
  text: string,
  maxWidth: number,
  maxHeight: number,
  classId: number
): number {
  if (!text || text.length === 0) return 12;

  // Estimate lines needed
  const avgCharPerLine = Math.max(1, Math.floor(maxWidth / 10)); // rough estimate
  const linesNeeded = Math.ceil(text.length / avgCharPerLine);

  // Calculate font size based on available height
  const maxFontSizeByHeight = maxHeight / (linesNeeded * 1.2);

  // Clamp to reasonable range
  const minFontSize = 8;
  const maxFontSize = classId === 1 ? 18 : 14; // Bubbles get larger text

  return Math.max(minFontSize, Math.min(maxFontSize, maxFontSizeByHeight));
}

/**
 * Wrap text to fit within width constraints
 *
 * @param text - Text to wrap
 * @param fontSize - Font size in pixels
 * @param maxWidth - Maximum width in pixels
 * @returns Array of wrapped lines
 */
export function wrapText(text: string, fontSize: number, maxWidth: number): string[] {
  if (!text) return [];

  // Approximate characters per line based on font size
  const avgCharWidth = fontSize * 0.6;
  const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);

  if (maxCharsPerLine <= 0) return [text];

  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);

  return lines.length > 0 ? lines : [text];
}

/**
 * Calculate text position for vertical text (Japanese/Chinese)
 *
 * @param block - Text block
 * @param config - Placement configuration
 * @returns TextStyle with vertical orientation
 */
export function calculateVerticalTextStyle(
  block: TextBlock,
  config: PlacementConfig
): TextStyle {
  const baseStyle = calculateTextStyle(block, config);

  // For vertical text, swap width/height and rotate
  return {
    ...baseStyle,
    width: baseStyle.height,
    height: baseStyle.width,
    transform: ["rotate(90deg)", ...baseStyle.transform],
    textAlign: "center",
  };
}

/**
 * Check if text should be displayed vertically
 * (Japanese/Chinese text in narrow tall boxes)
 */
export function shouldUseVerticalText(block: TextBlock): boolean {
  const { width, height, classId } = block;

  // Free text in tall narrow boxes is likely vertical
  if (classId === 2 && height > width * 2) {
    return true;
  }

  // Check if text contains CJK characters
  const cjkRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;
  if (cjkRegex.test(block.translatedText) && height > width * 1.5) {
    return true;
  }

  return false;
}

/**
 * Merge adjacent text blocks into a single rendering unit
 *
 * @param blocks - Array of text blocks
 * @param maxGap - Maximum gap (pixels) to merge
 * @returns Merged text blocks
 */
export function mergeAdjacentBlocks(
  blocks: TextBlock[],
  maxGap: number = 10
): TextBlock[] {
  if (blocks.length <= 1) return blocks;

  const sorted = [...blocks].sort((a, b) => a.y - b.y || a.x - b.x);
  const merged: TextBlock[] = [];
  let current = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];

    // Check if blocks are vertically adjacent
    const verticalGap = next.y - (current.y + current.height);
    const horizontalOverlap =
      Math.abs(current.x - next.x) < current.width * 0.5;

    if (verticalGap >= 0 && verticalGap <= maxGap && horizontalOverlap) {
      // Merge blocks
      current = {
        ...current,
        height: next.y + next.height - current.y,
        translatedText: current.translatedText + " " + next.translatedText,
        rawText: current.rawText + " " + next.rawText,
      };
    } else {
      merged.push(current);
      current = next;
    }
  }

  merged.push(current);
  return merged;
}

/**
 * Calculate scale ratio between detection coordinates and actual image
 *
 * @param detectionWidth - Width from detection (e.g., 1200)
 * @param detectionHeight - Height from detection (e.g., 1800)
 * @param renderWidth - Actual render width on screen
 * @param renderHeight - Actual render height on screen
 * @returns Scale ratio
 */
export function calculateScaleRatio(
  detectionWidth: number,
  detectionHeight: number,
  renderWidth: number,
  renderHeight: number
): number {
  const scaleX = renderWidth / detectionWidth;
  const scaleY = renderHeight / detectionHeight;
  return Math.min(scaleX, scaleY);
}
