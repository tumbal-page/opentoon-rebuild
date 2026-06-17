import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#1a1a2e" },
        headerTintColor: "#fff",
        contentStyle: { backgroundColor: "#1a1a2e" },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="capture" options={{ title: "Scan Chapter" }} />
      <Stack.Screen name="gallery" options={{ title: "From Gallery" }} />
      <Stack.Screen name="viewer" options={{ title: "Chapter Viewer" }} />
      <Stack.Screen name="chapters" options={{ title: "My Chapters" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
    </Stack>
  );
}
