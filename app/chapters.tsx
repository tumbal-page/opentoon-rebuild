import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import {
  listChapters,
  deleteChapter,
  ChapterData,
} from "../utils/chapterStorage";

export default function ChaptersScreen() {
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadChapters = useCallback(async () => {
    try {
      const data = await listChapters();
      setChapters(data);
    } catch (error) {
      console.error("Failed to load chapters:", error);
    }
  }, []);

  useEffect(() => {
    loadChapters();
  }, [loadChapters]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChapters();
    setRefreshing(false);
  };

  const handleDelete = (chapter: ChapterData) => {
    Alert.alert(
      "Delete Chapter",
      `Are you sure you want to delete "${chapter.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteChapter(chapter.id);
            loadChapters();
          },
        },
      ]
    );
  };

  const handleOpen = (chapter: ChapterData) => {
    router.push({
      pathname: "/viewer",
      params: {
        chapterId: chapter.id,
        images: JSON.stringify([]), // Will be loaded from chapter storage
        detectedBoxes: JSON.stringify([]),
      },
    });
  };

  const getStatusColor = (status: ChapterData["status"]) => {
    switch (status) {
      case "completed":
        return "#4CAF50";
      case "translating":
        return "#FFC107";
      case "scanning":
      default:
        return "#888";
    }
  };

  const getStatusText = (status: ChapterData["status"]) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "translating":
        return "Translating...";
      case "scanning":
      default:
        return "Scanning";
    }
  };

  const renderChapter = ({ item }: { item: ChapterData }) => (
    <TouchableOpacity
      style={styles.chapterItem}
      onPress={() => handleOpen(item)}
      onLongPress={() => handleDelete(item)}
    >
      <View style={styles.chapterIcon}>
        <Text style={styles.chapterIconText}>📚</Text>
      </View>
      <View style={styles.chapterInfo}>
        <Text style={styles.chapterTitle}>{item.title}</Text>
        <Text style={styles.chapterMeta}>
          {item.pageCount} pages • {item.comicTitle}
        </Text>
        <View style={styles.chapterDetails}>
          <Text style={styles.chapterDate}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {chapters.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📖</Text>
          <Text style={styles.emptyTitle}>No chapters yet</Text>
          <Text style={styles.emptyDesc}>
            Scan or import manga/manhwa pages to create your first chapter
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push("/capture")}
          >
            <Text style={styles.createButtonText}>Create Chapter</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={chapters}
          renderItem={renderChapter}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  list: {
    padding: 16,
  },
  chapterItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a2a4a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  chapterIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#3a3a6a",
    justifyContent: "center",
    alignItems: "center",
  },
  chapterIconText: {
    fontSize: 24,
  },
  chapterInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chapterTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  chapterMeta: {
    color: "#888",
    fontSize: 12,
    marginTop: 4,
  },
  chapterDetails: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  chapterDate: {
    color: "#666",
    fontSize: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptyDesc: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: "#5C67C2",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
