/**
 * Chapter Storage Module
 *
 * Handles saving and loading chapters with their images and translations.
 * Uses local file system for storage.
 */

import * as FileSystem from "expo-file-system";

const CHAPTERS_DIR = `${FileSystem.documentDirectory}chapters/`;

export interface ChapterData {
  id: string;
  title: string;
  comicTitle: string;
  pageCount: number;
  createdAt: string;
  updatedAt: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: "scanning" | "translating" | "completed";
}

export interface PageData {
  index: number;
  imageUri: string;
  detectedBoxes: any[];
  translatedBlocks: any[];
}

/**
 * Generate unique chapter ID
 */
function generateChapterId(): string {
  return `chapter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new chapter
 */
export async function createChapter(
  title: string,
  comicTitle: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string> {
  const chapterId = generateChapterId();
  const chapterDir = `${CHAPTERS_DIR}${chapterId}/`;

  // Create directory
  await FileSystem.makeDirectoryAsync(chapterDir, { intermediates: true });

  // Create chapter metadata
  const chapterData: ChapterData = {
    id: chapterId,
    title,
    comicTitle,
    pageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sourceLanguage,
    targetLanguage,
    status: "scanning",
  };

  // Save metadata
  await FileSystem.writeAsStringAsync(
    `${chapterDir}metadata.json`,
    JSON.stringify(chapterData, null, 2)
  );

  // Create images directory
  await FileSystem.makeDirectoryAsync(`${chapterDir}images/`, {
    intermediates: true,
  });

  return chapterId;
}

/**
 * Save a page image to chapter
 */
export async function savePageImage(
  chapterId: string,
  pageIndex: number,
  imageUri: string
): Promise<string> {
  const chapterDir = `${CHAPTERS_DIR}${chapterId}/`;
  const imagesDir = `${chapterDir}images/`;

  // Copy image to chapter directory
  const fileName = `page_${String(pageIndex).padStart(3, "0")}.jpg`;
  const destUri = `${imagesDir}${fileName}`;

  await FileSystem.copyAsync({ from: imageUri, to: destUri });

  // Update page count in metadata
  const metadata = await loadChapterMetadata(chapterId);
  if (metadata) {
    metadata.pageCount = Math.max(metadata.pageCount, pageIndex + 1);
    metadata.updatedAt = new Date().toISOString();
    await saveChapterMetadata(chapterId, metadata);
  }

  return destUri;
}

/**
 * Save detection results for a page
 */
export async function saveDetectionResults(
  chapterId: string,
  pageIndex: number,
  detectedBoxes: any[]
): Promise<void> {
  const chapterDir = `${CHAPTERS_DIR}${chapterId}/`;
  const fileName = `detection_${String(pageIndex).padStart(3, "0")}.json`;

  await FileSystem.writeAsStringAsync(
    `${chapterDir}${fileName}`,
    JSON.stringify(detectedBoxes, null, 2)
  );
}

/**
 * Save translation results for a page
 */
export async function saveTranslationResults(
  chapterId: string,
  pageIndex: number,
  translatedBlocks: any[]
): Promise<void> {
  const chapterDir = `${CHAPTERS_DIR}${chapterId}/`;
  const fileName = `translation_${String(pageIndex).padStart(3, "0")}.json`;

  await FileSystem.writeAsStringAsync(
    `${chapterDir}${fileName}`,
    JSON.stringify(translatedBlocks, null, 2)
  );

  // Update status
  const metadata = await loadChapterMetadata(chapterId);
  if (metadata) {
    metadata.status = "completed";
    metadata.updatedAt = new Date().toISOString();
    await saveChapterMetadata(chapterId, metadata);
  }
}

/**
 * Load chapter metadata
 */
export async function loadChapterMetadata(
  chapterId: string
): Promise<ChapterData | null> {
  try {
    const metadataPath = `${CHAPTERS_DIR}${chapterId}/metadata.json`;
    const info = await FileSystem.getInfoAsync(metadataPath);

    if (!info.exists) return null;

    const content = await FileSystem.readAsStringAsync(metadataPath);
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Save chapter metadata
 */
async function saveChapterMetadata(
  chapterId: string,
  metadata: ChapterData
): Promise<void> {
  const metadataPath = `${CHAPTERS_DIR}${chapterId}/metadata.json`;
  await FileSystem.writeAsStringAsync(
    metadataPath,
    JSON.stringify(metadata, null, 2)
  );
}

/**
 * Load all pages for a chapter
 */
export async function loadChapterPages(chapterId: string): Promise<PageData[]> {
  const chapterDir = `${CHAPTERS_DIR}${chapterId}/`;
  const metadata = await loadChapterMetadata(chapterId);

  if (!metadata) return [];

  const pages: PageData[] = [];

  for (let i = 0; i < metadata.pageCount; i++) {
    const pageNum = String(i).padStart(3, "0");

    // Load image
    const imageUri = `${chapterDir}images/page_${pageNum}.jpg`;

    // Load detection results
    let detectedBoxes: any[] = [];
    try {
      const detectionPath = `${chapterDir}detection_${pageNum}.json`;
      const detectionInfo = await FileSystem.getInfoAsync(detectionPath);
      if (detectionInfo.exists) {
        const content = await FileSystem.readAsStringAsync(detectionPath);
        detectedBoxes = JSON.parse(content);
      }
    } catch {}

    // Load translation results
    let translatedBlocks: any[] = [];
    try {
      const translationPath = `${chapterDir}translation_${pageNum}.json`;
      const translationInfo = await FileSystem.getInfoAsync(translationPath);
      if (translationInfo.exists) {
        const content = await FileSystem.readAsStringAsync(translationPath);
        translatedBlocks = JSON.parse(content);
      }
    } catch {}

    pages.push({
      index: i,
      imageUri,
      detectedBoxes,
      translatedBlocks,
    });
  }

  return pages;
}

/**
 * List all chapters
 */
export async function listChapters(): Promise<ChapterData[]> {
  try {
    // Ensure chapters directory exists
    const dirInfo = await FileSystem.getInfoAsync(CHAPTERS_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(CHAPTERS_DIR, { intermediates: true });
      return [];
    }

    const entries = await FileSystem.readDirectoryAsync(CHAPTERS_DIR);
    const chapters: ChapterData[] = [];

    for (const entry of entries) {
      const metadata = await loadChapterMetadata(entry);
      if (metadata) {
        chapters.push(metadata);
      }
    }

    // Sort by creation date (newest first)
    return chapters.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return [];
  }
}

/**
 * Delete a chapter
 */
export async function deleteChapter(chapterId: string): Promise<void> {
  const chapterDir = `${CHAPTERS_DIR}${chapterId}/`;
  await FileSystem.deleteAsync(chapterDir, { idempotent: true });
}

/**
 * Update chapter status
 */
export async function updateChapterStatus(
  chapterId: string,
  status: ChapterData["status"]
): Promise<void> {
  const metadata = await loadChapterMetadata(chapterId);
  if (metadata) {
    metadata.status = status;
    metadata.updatedAt = new Date().toISOString();
    await saveChapterMetadata(chapterId, metadata);
  }
}

/**
 * Get chapter statistics
 */
export async function getChapterStats(chapterId: string): Promise<{
  totalPages: number;
  translatedPages: number;
  totalTextBlocks: number;
  translatedTextBlocks: number;
} | null> {
  const metadata = await loadChapterMetadata(chapterId);
  if (!metadata) return null;

  let translatedPages = 0;
  let totalTextBlocks = 0;
  let translatedTextBlocks = 0;

  for (let i = 0; i < metadata.pageCount; i++) {
    const pageNum = String(i).padStart(3, "0");

    // Count detection results
    try {
      const detectionPath = `${CHAPTERS_DIR}${chapterId}/detection_${pageNum}.json`;
      const detectionInfo = await FileSystem.getInfoAsync(detectionPath);
      if (detectionInfo.exists) {
        const content = await FileSystem.readAsStringAsync(detectionPath);
        const boxes = JSON.parse(content);
        totalTextBlocks += boxes.length;
      }
    } catch {}

    // Count translation results
    try {
      const translationPath = `${CHAPTERS_DIR}${chapterId}/translation_${pageNum}.json`;
      const translationInfo = await FileSystem.getInfoAsync(translationPath);
      if (translationInfo.exists) {
        const content = await FileSystem.readAsStringAsync(translationPath);
        const blocks = JSON.parse(content);
        translatedTextBlocks += blocks.length;
        if (blocks.length > 0) translatedPages++;
      }
    } catch {}
  }

  return {
    totalPages: metadata.pageCount,
    translatedPages,
    totalTextBlocks,
    translatedTextBlocks,
  };
}
