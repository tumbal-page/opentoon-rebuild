/**
 * Text Detection Constants
 *
 * These constants match the original OpenToon app's TFLite model configuration.
 */

// Model configuration
export const DETECTOR_CONFIG = {
  MODEL_FILE: "detector_dywi8.tflite",
  INPUT_SIZE: 640,
  CONFIDENCE_THRESHOLD: 0.3,
  MIN_BOX_SIZE: 5,
  IOU_THRESHOLD: 0.5,
  CONTAINMENT_THRESHOLD: 0.3,
};

// Text block classes
export const TEXT_CLASSES = {
  BUBBLE: 1,    // Speech bubble (gelembung dialog)
  FREE_TEXT: 2,  // Free-standing text (teks bebas)
};

// Display modes
export const DISPLAY_MODES = {
  OVERLAY: "overlay",      // Text overlay on original image
  BUBBLE: "bubble",        // Text inside bubble
  HIDDEN: "hidden",        // Hide translated text
  ORIGINAL: "original",    // Show original text
};

// Default languages
export const DEFAULT_LANGUAGES = {
  SOURCE: "ja",  // Japanese (most manga)
  TARGET: "en",  // English (default translation)
};

// Supported languages
export const SUPPORTED_LANGUAGES = {
  SOURCE: [
    { code: "ja", name: "Japanese", flag: "🇯🇵" },
    { code: "ko", name: "Korean", flag: "🇰🇷" },
    { code: "zh", name: "Chinese", flag: "🇨🇳" },
  ],
  TARGET: [
    { code: "en", name: "English", flag: "🇬🇧" },
    { code: "id", name: "Indonesian", flag: "🇮🇩" },
    { code: "ms", name: "Malay", flag: "🇲🇾" },
    { code: "zh", name: "Chinese", flag: "🇨🇳" },
    { code: "es", name: "Spanish", flag: "🇪🇸" },
    { code: "pt", name: "Portuguese", flag: "🇧🇷" },
    { code: "fr", name: "French", flag: "🇫🇷" },
    { code: "de", name: "German", flag: "🇩🇪" },
  ],
};

// Image slicing defaults
export const SLICE_DEFAULTS = {
  HEIGHT: 640,
  OVERLAP: 50,
  MAX_SLICES: 10,
};

// App info
export const APP_INFO = {
  NAME: "OpenToon",
  VERSION: "1.0.0",
  BUILD: 1,
};
