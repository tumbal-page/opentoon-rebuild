/**
 * Font Matching Module
 *
 * Handles font detection and selection for translated text.
 *
 * Features:
 * - Detect font style from bounding box properties
 * - Select appropriate font for target language
 * - Handle CJK fonts (Chinese, Japanese, Korean)
 * - Font fallback chain
 */

import { TextBlock } from "./textPlacement";

export interface FontConfig {
  fontFamily: string;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  fontSize: number;
  letterSpacing?: number;
  lineHeight: number;
}

// Available fonts in the app
const AVAILABLE_FONTS = {
  // Latin fonts
  sansSerif: "sans-serif",
  serif: "serif",
  monospace: "monospace",

  // CJK fonts (system fonts)
  cjkSans: "sans-serif",
  cjkSerif: "serif",

  // Custom fonts (if loaded)
  figtree: "Figtree",
  instrumentSans: "Instrument Sans",
};

// Font mapping by language
const LANGUAGE_FONT_MAP: Record<string, string> = {
  ja: AVAILABLE_FONTS.cjkSans,
  ko: AVAILABLE_FONTS.cjkSans,
  zh: AVAILABLE_FONTS.cjkSans,
  en: AVAILABLE_FONTS.sansSerif,
  id: AVAILABLE_FONTS.sansSerif,
  ms: AVAILABLE_FONTS.sansSerif,
  es: AVAILABLE_FONTS.sansSerif,
  fr: AVAILABLE_FONTS.sansSerif,
  de: AVAILABLE_FONTS.sansSerif,
  pt: AVAILABLE_FONTS.sansSerif,
};

/**
 * Calculate font configuration for a text block
 *
 * @param block - Text block with properties
 * @param targetLanguage - Target language code
 * @param boxHeight - Height of the bounding box
 * @returns Font configuration
 */
export function calculateFontConfig(
  block: TextBlock,
  targetLanguage: string,
  boxHeight: number
): FontConfig {
  const { fontColor, classId, width, height } = block;

  // Determine base font family
  const fontFamily = getFontFamily(targetLanguage);

  // Determine font weight based on box properties
  const fontWeight = detectFontWeight(block);

  // Calculate font size
  const fontSize = calculateFontSize(block.translatedText, width, height, classId);

  // Line height ratio
  const lineHeight = fontSize * 1.3;

  // Letter spacing (tighter for CJK)
  const letterSpacing = isCJKLanguage(targetLanguage) ? 0 : 0.5;

  return {
    fontFamily,
    fontWeight,
    fontStyle: "normal",
    fontSize,
    letterSpacing,
    lineHeight,
  };
}

/**
 * Get appropriate font family for target language
 */
function getFontFamily(language: string): string {
  return LANGUAGE_FONT_MAP[language] || AVAILABLE_FONTS.sansSerif;
}

/**
 * Detect font weight from text block properties
 *
 * Heuristics:
 * - Speech bubbles often use bold text
 * - Larger boxes may indicate bold/emphasized text
 * - Dark font color may indicate bold
 */
function detectFontWeight(block: TextBlock): "normal" | "bold" {
  const { classId, fontColor, width, height } = block;

  // Speech bubbles often use bold text
  if (classId === 1) {
    return "bold";
  }

  // Check font color darkness (darker = bolder appearance)
  if (fontColor && isDarkColor(fontColor)) {
    // Large boxes with dark text are likely bold
    if (width > 150 && height > 50) {
      return "bold";
    }
  }

  return "normal";
}

/**
 * Check if a color is dark
 */
function isDarkColor(color: string): boolean {
  if (!color) return false;

  // Parse hex color
  const hex = color.replace("#", "");
  if (hex.length === 6) {
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  }

  return false;
}

/**
 * Calculate optimal font size
 */
function calculateFontSize(
  text: string,
  boxWidth: number,
  boxHeight: number,
  classId: number
): number {
  if (!text || text.length === 0) return 12;

  // Estimate characters per line
  const avgCharWidth = 8; // Approximate for sans-serif
  const maxCharsPerLine = Math.floor(boxWidth / avgCharWidth);

  // Estimate lines needed
  const linesNeeded = Math.ceil(text.length / Math.max(1, maxCharsPerLine));

  // Calculate font size based on available height
  const lineHeightRatio = 1.3;
  let fontSize = boxHeight / (linesNeeded * lineHeightRatio);

  // Clamp to reasonable range based on class
  const minSize = 8;
  const maxSize = classId === 1 ? 20 : 14; // Bubbles get larger text

  fontSize = Math.max(minSize, Math.min(maxSize, fontSize));

  return Math.round(fontSize);
}

/**
 * Check if language uses CJK characters
 */
function isCJKLanguage(language: string): boolean {
  return ["ja", "ko", "zh"].includes(language);
}

/**
 * Get font fallback chain for a language
 *
 * @param language - Target language code
 * @returns Array of fonts to try in order
 */
export function getFontFallbackChain(language: string): string[] {
  const primary = getFontFamily(language);

  // Fallback chain
  const fallbacks = [primary];

  if (isCJKLanguage(language)) {
    fallbacks.push(AVAILABLE_FONTS.cjkSans);
    fallbacks.push(AVAILABLE_FONTS.cjkSerif);
  }

  fallbacks.push(AVAILABLE_FONTS.sansSerif);
  fallbacks.push(AVAILABLE_FONTS.serif);

  return [...new Set(fallbacks)]; // Remove duplicates
}

/**
 * Create CSS font string
 *
 * @param config - Font configuration
 * @returns CSS font string
 */
export function createFontString(config: FontConfig): string {
  const parts = [];

  if (config.fontStyle !== "normal") {
    parts.push(config.fontStyle);
  }

  if (config.fontWeight !== "normal") {
    parts.push(config.fontWeight);
  }

  parts.push(`${config.fontSize}px`);
  parts.push(config.fontFamily);

  return parts.join(" ");
}

/**
 * Estimate text width for a given font and text
 *
 * @param text - Text to measure
 * @param fontSize - Font size in pixels
 * @param fontFamily - Font family name
 * @returns Estimated width in pixels
 */
export function estimateTextWidth(
  text: string,
  fontSize: number,
  fontFamily: string = "sans-serif"
): number {
  // Rough estimation based on average character widths
  // This is approximate - real measurement would need canvas
  const avgCharWidth = fontSize * 0.6;
  return text.length * avgCharWidth;
}

/**
 * Check if text needs to be truncated to fit
 *
 * @param text - Text to check
 * @param fontSize - Font size
 * @param maxWidth - Maximum width available
 * @returns Whether text needs truncation
 */
export function needsTruncation(
  text: string,
  fontSize: number,
  maxWidth: number
): boolean {
  const estimatedWidth = estimateTextWidth(text, fontSize);
  return estimatedWidth > maxWidth;
}

/**
 * Truncate text with ellipsis
 *
 * @param text - Text to truncate
 * @param fontSize - Font size
 * @param maxWidth - Maximum width
 * @returns Truncated text with ellipsis
 */
export function truncateText(
  text: string,
  fontSize: number,
  maxWidth: number
): string {
  if (!needsTruncation(text, fontSize, maxWidth)) {
    return text;
  }

  const avgCharWidth = fontSize * 0.6;
  const maxChars = Math.floor(maxWidth / avgCharWidth);

  if (maxChars <= 3) return "...";

  return text.substring(0, maxChars - 3) + "...";
}
