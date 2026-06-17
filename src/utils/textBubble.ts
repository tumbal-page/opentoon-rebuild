/**
 * Text Bubble Handling Module
 *
 * Handles detection, fitting, and rendering of speech bubbles
 * in manga/manhwa images.
 *
 * Features:
 * - Bubble shape detection (rounded, rectangle, oval)
 * - Text fitting within bubble boundaries
 * - Bubble background preservation
 * - Multi-bubble handling per page
 */

import { TextBlock } from "./textPlacement";

export interface BubbleShape {
  type: "rounded" | "rectangle" | "oval" | "thought" | "shout";
  cornerRadius: number;
  borderWidth: number;
  borderColor: string;
  backgroundColor: string;
}

export interface BubbleStyle {
  shape: BubbleShape;
  textStyle: {
    textAlign: "center";
    verticalAlign: "middle";
    padding: number;
    color: string;
  };
}

// Bubble type detection thresholds
const BUBBLE_THRESHOLDS = {
  // Aspect ratio for oval detection
  OVAL_RATIO_MIN: 0.6,
  OVAL_RATIO_MAX: 1.4,

  // Corner radius ratio for rounded detection
  ROUNDED_RADIUS_RATIO: 0.2,

  // Size threshold for thought bubbles
  THOUGHT_SIZE_RATIO: 0.3,
};

/**
 * Detect bubble type from text block properties
 *
 * @param block - Text block with bounding box
 * @returns Detected bubble shape
 */
export function detectBubbleShape(block: TextBlock): BubbleShape {
  const { width, height, classId } = block;

  // Free text is not a bubble
  if (classId === 2) {
    return {
      type: "rectangle",
      cornerRadius: 0,
      borderWidth: 0,
      borderColor: "transparent",
      backgroundColor: "transparent",
    };
  }

  // Calculate aspect ratio
  const aspectRatio = width / height;

  // Detect oval bubbles (roughly circular)
  if (
    aspectRatio >= BUBBLE_THRESHOLDS.OVAL_RATIO_MIN &&
    aspectRatio <= BUBBLE_THRESHOLDS.OVAL_RATIO_MAX
  ) {
    return {
      type: "oval",
      cornerRadius: Math.min(width, height) / 2,
      borderWidth: 2,
      borderColor: "#000000",
      backgroundColor: "#FFFFFF",
    };
  }

  // Detect thought bubbles (small, round)
  if (height < width * BUBBLE_THRESHOLDS.THOUGHT_SIZE_RATIO) {
    return {
      type: "thought",
      cornerRadius: height * 0.4,
      borderWidth: 2,
      borderColor: "#000000",
      backgroundColor: "#FFFFFF",
    };
  }

  // Default: rounded rectangle
  return {
    type: "rounded",
    cornerRadius: Math.min(width, height) * BUBBLE_THRESHOLDS.ROUNDED_RADIUS_RATIO,
    borderWidth: 2,
    borderColor: "#000000",
    backgroundColor: "#FFFFFF",
  };
}

/**
 * Calculate bubble style for rendering
 *
 * @param block - Text block
 * @param targetLanguage - Target language code
 * @returns Bubble style configuration
 */
export function calculateBubbleStyle(
  block: TextBlock,
  targetLanguage: string
): BubbleStyle {
  const shape = detectBubbleShape(block);

  // Determine text color based on background
  const isLightBackground = isLightColor(shape.backgroundColor);
  const textColor = isLightBackground ? "#000000" : "#FFFFFF";

  // Calculate padding based on bubble type
  let padding: number;
  switch (shape.type) {
    case "oval":
      padding = Math.min(block.width, block.height) * 0.15;
      break;
    case "thought":
      padding = block.height * 0.2;
      break;
    case "shout":
      padding = 4;
      break;
    default:
      padding = 8;
  }

  return {
    shape,
    textStyle: {
      textAlign: "center",
      verticalAlign: "middle",
      padding,
      color: textColor,
    },
  };
}

/**
 * Check if a color is light
 */
function isLightColor(color: string): boolean {
  if (!color) return true;

  const hex = color.replace("#", "");
  if (hex.length === 6) {
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  }

  return true;
}

/**
 * Fit text within bubble boundaries
 *
 * @param text - Text to fit
 * @param bubbleWidth - Bubble width
 * @param bubbleHeight - Bubble height
 * @param fontSize - Desired font size
 * @returns Fitted text configuration
 */
export function fitTextInBubble(
  text: string,
  bubbleWidth: number,
  bubbleHeight: number,
  fontSize: number
): {
  text: string;
  fontSize: number;
  lines: number;
  truncated: boolean;
} {
  if (!text) {
    return { text: "", fontSize, lines: 0, truncated: false };
  }

  // Calculate available space
  const padding = 8;
  const availableWidth = bubbleWidth - padding * 2;
  const availableHeight = bubbleHeight - padding * 2;

  // Estimate characters per line
  const avgCharWidth = fontSize * 0.6;
  const maxCharsPerLine = Math.floor(availableWidth / avgCharWidth);

  // Split into words
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

  // Check if text fits
  const lineHeight = fontSize * 1.3;
  const totalHeight = lines.length * lineHeight;

  let truncated = false;
  let finalText = text;

  if (totalHeight > availableHeight) {
    // Reduce lines to fit
    const maxLines = Math.floor(availableHeight / lineHeight);
    if (maxLines > 0) {
      finalText = lines.slice(0, maxLines).join(" ");
      if (lines.length > maxLines) {
        finalText += "...";
        truncated = true;
      }
    } else {
      // Text doesn't fit at all - truncate
      const maxChars = Math.floor(availableWidth / avgCharWidth) * Math.max(1, Math.floor(availableHeight / lineHeight));
      finalText = text.substring(0, maxChars - 3) + "...";
      truncated = true;
    }
  }

  return {
    text: finalText,
    fontSize,
    lines: Math.min(lines.length, Math.floor(availableHeight / lineHeight)),
    truncated,
  };
}

/**
 * Generate bubble CSS styles
 *
 * @param style - Bubble style configuration
 * @param width - Bubble width
 * @param height - Bubble height
 * @returns CSS style object
 */
export function generateBubbleStyles(
  style: BubbleStyle,
  width: number,
  height: number
): Record<string, any> {
  const { shape, textStyle } = style;

  return {
    container: {
      width,
      height,
      justifyContent: "center" as const,
      alignItems: "center" as const,
      backgroundColor: shape.backgroundColor,
      borderRadius: shape.cornerRadius,
      borderWidth: shape.borderWidth,
      borderColor: shape.borderColor,
      overflow: "hidden" as const,
    },
    text: {
      color: textStyle.color,
      textAlign: textStyle.textAlign as any,
      padding: textStyle.padding,
      fontSize: 14, // Will be overridden
      lineHeight: 18,
    },
  };
}

/**
 * Check if a text block is likely a speech bubble
 *
 * @param block - Text block to check
 * @returns Whether block is likely a bubble
 */
export function isLikelyBubble(block: TextBlock): boolean {
  const { width, height, classId } = block;

  // Class 1 is explicitly speech bubbles
  if (classId === 1) return true;

  // Heuristics for bubble detection
  const aspectRatio = width / height;

  // Roughly square or wider than tall = likely bubble
  if (aspectRatio >= 0.5 && aspectRatio <= 2.0) {
    // Reasonable size for a bubble
    if (width >= 50 && width <= 300 && height >= 30 && height <= 200) {
      return true;
    }
  }

  return false;
}

/**
 * Group text blocks by proximity (for multi-bubble handling)
 *
 * @param blocks - Array of text blocks
 * @param maxDistance - Maximum distance to group (pixels)
 * @returns Grouped text blocks
 */
export function groupBlocksByProximity(
  blocks: TextBlock[],
  maxDistance: number = 50
): TextBlock[][] {
  if (blocks.length === 0) return [];

  const sorted = [...blocks].sort((a, b) => a.y - b.y || a.x - b.x);
  const groups: TextBlock[][] = [];
  let currentGroup: TextBlock[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = currentGroup[currentGroup.length - 1];
    const curr = sorted[i];

    const distance = Math.sqrt(
      Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
    );

    if (distance <= maxDistance) {
      currentGroup.push(curr);
    } else {
      groups.push(currentGroup);
      currentGroup = [curr];
    }
  }

  groups.push(currentGroup);
  return groups;
}

/**
 * Calculate merged bounding box for a group of text blocks
 *
 * @param blocks - Group of text blocks
 * @returns Merged bounding box
 */
export function mergeBoundingBoxes(
  blocks: TextBlock[]
): { x: number; y: number; width: number; height: number } {
  if (blocks.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const block of blocks) {
    minX = Math.min(minX, block.x);
    minY = Math.min(minY, block.y);
    maxX = Math.max(maxX, block.x + block.width);
    maxY = Math.max(maxY, block.y + block.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
