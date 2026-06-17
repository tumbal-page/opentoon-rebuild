/**
 * React Hooks for OpenToon
 */

import { useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";

/**
 * Hook for managing translation settings
 */
export function useTranslationSettings() {
  const [sourceLanguage, setSourceLanguage] = useState("ja");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [serverUrl, setServerUrl] = useState("");
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const src = await SecureStore.getItemAsync("source_language");
      const tgt = await SecureStore.getItemAsync("target_language");
      const url = await SecureStore.getItemAsync("translation_server_url");
      const key = await SecureStore.getItemAsync("translation_api_key");

      if (src) setSourceLanguage(src);
      if (tgt) setTargetLanguage(tgt);
      if (url) setServerUrl(url);
      if (key) setApiKey(key);
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const saveSettings = async () => {
    try {
      await SecureStore.setItemAsync("source_language", sourceLanguage);
      await SecureStore.setItemAsync("target_language", targetLanguage);
      await SecureStore.setItemAsync("translation_server_url", serverUrl);
      await SecureStore.setItemAsync("translation_api_key", apiKey);
      return true;
    } catch (error) {
      console.error("Failed to save settings:", error);
      return false;
    }
  };

  return {
    sourceLanguage,
    setSourceLanguage,
    targetLanguage,
    setTargetLanguage,
    serverUrl,
    setServerUrl,
    apiKey,
    setApiKey,
    saveSettings,
    loadSettings,
  };
}

/**
 * Hook for managing translation progress
 */
export function useTranslationProgress() {
  const [isTranslating, setIsTranslating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const startTranslation = (total: number) => {
    setIsTranslating(true);
    setProgress(0);
    setCurrentPage(0);
    setTotalPages(total);
  };

  const updateProgress = (current: number) => {
    setCurrentPage(current);
    setProgress(totalPages > 0 ? (current / totalPages) * 100 : 0);
  };

  const finishTranslation = () => {
    setIsTranslating(false);
    setProgress(100);
  };

  return {
    isTranslating,
    progress,
    currentPage,
    totalPages,
    startTranslation,
    updateProgress,
    finishTranslation,
  };
}
