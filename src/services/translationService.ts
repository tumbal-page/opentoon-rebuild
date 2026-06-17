import * as SecureStore from "expo-secure-store";
import { DetectedBox } from "../utils/imageSlicer";

/**
 * Translation Service - LibreTranslate Integration
 *
 * Uses LibreTranslate (self-hosted, free, unlimited) for translation.
 * LibreTranslate runs on local network (e.g., http://192.168.1.100:5000)
 *
 * Flow:
 * 1. Client sends text to LibreTranslate
 * 2. LibreTranslate translates text
 * 3. Client receives translated text
 * 4. Client renders overlay on image
 *
 * LibreTranslate supports:
 * - Japanese (ja)
 * - Korean (ko)
 * - Chinese (zh)
 * - English (en)
 * - Indonesian (id)
 * - Malay (ms)
 * - And 50+ other languages
 */

// ============================================================
// CONFIGURATION - Set via Settings screen or hardcoded default
// ============================================================

const DEFAULT_LIBRETRANSLATE_URL = "http://192.168.1.100:5000";

// Language code mapping (LibreTranslate uses specific codes)
const LANG_MAP: Record<string, string> = {
  ja: "ja",
  ko: "ko",
  zh: "zh",
  en: "en",
  id: "id",
  ms: "ms",
  es: "es",
  fr: "fr",
  de: "de",
  pt: "pt",
  ru: "ru",
  ar: "ar",
};

// ============================================================

export interface TranslatedBlock {
  x: number;
  y: number;
  width: number;
  height: number;
  rawText: string;
  translatedText: string;
  fontColor: string;
  rotationDeg: number;
  displayMode: string;
  // Text sizing info from detection
  fontSize: number;
  fontFamily: string;
  textAlign: string;
}

/**
 * Get LibreTranslate server URL from settings
 */
async function getServerUrl(): Promise<string> {
  const saved = await SecureStore.getItemAsync("libretranslate_url");
  return saved || DEFAULT_LIBRETRANSLATE_URL;
}

/**
 * Translate a single text string
 */
export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  if (!text || text.trim().length === 0) return text;

  const serverUrl = await getServerUrl();
  const source = LANG_MAP[sourceLang] || sourceLang;
  const target = LANG_MAP[targetLang] || targetLang;

  try {
    const response = await fetch(`${serverUrl}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source: source,
        target: target,
        format: "text",
      }),
    });

    if (!response.ok) {
      throw new Error(`LibreTranslate error: ${response.status}`);
    }

    const data = await response.json();
    return data.translatedText || text;
  } catch (error) {
    console.error("Translation failed:", error);
    throw error;
  }
}

/**
 * Translate multiple texts in batch (more efficient)
 */
export async function translateBatch(
  texts: string[],
  sourceLang: string,
  targetLang: string
): Promise<string[]> {
  if (texts.length === 0) return [];

  const serverUrl = await getServerUrl();
  const source = LANG_MAP[sourceLang] || sourceLang;
  const target = LANG_MAP[targetLang] || targetLang;

  try {
    // LibreTranslate supports batch translation
    const response = await fetch(`${serverUrl}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: texts,
        source: source,
        target: target,
        format: "text",
      }),
    });

    if (!response.ok) {
      throw new Error(`LibreTranslate batch error: ${response.status}`);
    }

    const data = await response.json();

    // Handle both array and single response
    if (Array.isArray(data)) {
      return data.map((item: any) => item.translatedText || "");
    }
    return [data.translatedText || ""];
  } catch (error) {
    console.error("Batch translation failed:", error);
    // Fallback: translate one by one
    const results: string[] = [];
    for (const text of texts) {
      try {
        const translated = await translateText(text, sourceLang, targetLang);
        results.push(translated);
      } catch {
        results.push(text); // Keep original on failure
      }
    }
    return results;
  }
}

/**
 * Translate detected text blocks for an image
 *
 * @param boxes - Detected text blocks with positions
 * @param sourceLanguage - Source language code
 * @param targetLanguage - Target language code
 * @returns Translated blocks with positions and text
 */
export async function translateDetectedBlocks(
  boxes: DetectedBox[],
  sourceLanguage: string,
  targetLanguage: string
): Promise<TranslatedBlock[]> {
  if (boxes.length === 0) return [];

  // Extract raw texts from boxes (these would come from OCR in production)
  // For now, use mock text since OCR is not implemented yet
  const rawTexts = boxes.map((box) => `[Text at ${Math.round(box.originalX1)},${Math.round(box.originalY1)}]`);

  // Batch translate all texts
  const translatedTexts = await translateBatch(rawTexts, sourceLanguage, targetLanguage);

  // Combine with position data
  return boxes.map((box, index) => ({
    x: box.originalX1,
    y: box.originalY1,
    width: box.originalX2 - box.originalX1,
    height: box.originalY2 - box.originalY1,
    rawText: rawTexts[index],
    translatedText: translatedTexts[index] || rawTexts[index],
    fontColor: "#000000",
    rotationDeg: 0,
    displayMode: "overlay",
    fontSize: estimateFontSize(box.originalY2 - box.originalY1),
    fontFamily: "sans-serif",
    textAlign: "center",
  }));
}

/**
 * Estimate font size based on bounding box height
 */
function estimateFontSize(boxHeight: number): number {
  // Approximate: font size is about 70-80% of box height
  return Math.round(boxHeight * 0.75);
}

/**
 * Check if LibreTranslate server is reachable
 */
export async function checkServerHealth(): Promise<boolean> {
  try {
    const serverUrl = await getServerUrl();
    const response = await fetch(`${serverUrl}/languages`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get available languages from LibreTranslate
 */
export async function getAvailableLanguages(): Promise<
  { code: string; name: string }[]
> {
  try {
    const serverUrl = await getServerUrl();
    const response = await fetch(`${serverUrl}/languages`);
    const data = await response.json();
    return data.map((lang: any) => ({
      code: lang.code,
      name: lang.name,
    }));
  } catch {
    return [];
  }
}
