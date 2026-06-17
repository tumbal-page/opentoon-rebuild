import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from "react-native";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>OpenToon</Text>
        <Text style={styles.subtitle}>Manga/Manhwa Translator</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/capture")}
        >
          <Text style={styles.buttonIcon}>📷</Text>
          <Text style={styles.buttonText}>Scan Chapter</Text>
          <Text style={styles.buttonDesc}>Capture manga/manhwa pages with camera</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/gallery")}
        >
          <Text style={styles.buttonIcon}>🖼️</Text>
          <Text style={styles.buttonText}>From Gallery</Text>
          <Text style={styles.buttonDesc}>Import images from device gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/chapters")}
        >
          <Text style={styles.buttonIcon}>📚</Text>
          <Text style={styles.buttonText}>My Chapters</Text>
          <Text style={styles.buttonDesc}>View saved and translated chapters</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.settingsButton]}
          onPress={() => router.push("/settings")}
        >
          <Text style={styles.buttonIcon}>⚙️</Text>
          <Text style={styles.buttonText}>Settings</Text>
          <Text style={styles.buttonDesc}>Configure translation service & preferences</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Backend: Configure your translation server in Settings
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  header: {
    alignItems: "center",
    paddingVertical: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 12,
  },
  button: {
    backgroundColor: "#2a2a4a",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  settingsButton: {
    backgroundColor: "#1e3a5f",
  },
  buttonIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    flex: 1,
  },
  buttonDesc: {
    width: "100%",
    fontSize: 12,
    color: "#888",
    marginTop: 4,
    marginLeft: 40,
  },
  footer: {
    padding: 20,
    alignItems: "center",
  },
  footerText: {
    fontSize: 11,
    color: "#666",
  },
});
