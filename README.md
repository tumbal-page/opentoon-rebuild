# OpenToon Rebuild

Manga/Manhwa Translation App - rebuilt with Expo React Native.

## Features

- Camera capture manga/manhwa pages
- Import from gallery
- On-device text detection (TFLite)
- Local translation server (LibreTranslate)
- PowerSync local-first database

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    MOBILE APP                            │
│               React Native (Expo SDK 54)                │
├──────────────┬──────────────┬───────────────────────────┤
│  Camera      │  TFLite      │   LibreTranslate          │
│  Capture     │  Detection   │   (Local Server)          │
└──────────────┴──────────────┴───────────────────────────┘
```

## Translation Flow

1. **Camera/Gallery** → Capture manga pages
2. **Image Slicing** → Split tall images into 640px slices
3. **TFLite Detection** → Find text blocks (speech bubbles, free text)
4. **Send to Local Server** → Send detected text to LibreTranslate
5. **Translation** → LibreTranslate translates text
6. **Display** → Render translated text as overlay on image

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Local Translation Server

**Option A: Run Python Script (Recommended)**

```bash
# Install argostranslate
pip install argostranslate

# Run the translation server
python translate_server.py
```

The server will:
- Auto-install required language packages (en, ja, ko, zh, id, ms)
- Start on port 5000
- Show your local IP address

**Option B: Run LibreTranslate (Advanced)**

```bash
# Install LibreTranslate
pip install libretranslate

# Start server
libretranslate --host 0.0.0.0 --port 5000
```

### 3. Configure App

1. Open the app → Settings
2. Enter your server URL: `http://YOUR_IP:5000`
3. Tap "Test Connection"
4. Select source/target languages
5. Save settings

### 4. Build APK

**GitHub Actions (Recommended):**

1. Fork this repository
2. Go to Settings → Secrets → Actions
3. Add `EXPO_TOKEN` (get from https://expo.dev/settings/access-tokens)
4. Push to `main` branch to trigger build

**Local Build:**

```bash
npx eas build --platform android --profile preview
```

## Translation Server Details

### Available Endpoints

```
GET  /health       - Health check
GET  /languages    - List available languages
POST /translate    - Translate text
```

### Example API Calls

**Health Check:**
```bash
curl http://192.168.1.100:5000/health
# Response: {"status": "ok", "engine": "argos-translate"}
```

**Get Languages:**
```bash
curl http://192.168.1.100:5000/languages
# Response: [{"code":"en","name":"ENGLISH","targets":["id","ja",...]}]
```

**Translate Text:**
```bash
curl -X POST http://192.168.1.100:5000/translate \
  -H "Content-Type: application/json" \
  -d '{"q": "こんにちは世界", "source": "ja", "target": "en"}'
# Response: {"translatedText": "Hello World"}
```

**Batch Translate:**
```bash
curl -X POST http://192.168.1.100:5000/translate \
  -H "Content-Type: application/json" \
  -d '{"q": ["Hello", "World"], "source": "en", "target": "id"}'
# Response: [{"translatedText": "Halo"}, {"translatedText": "Dunia"}]
```

## TFLite Text Detection

The app uses the original TFLite model from OpenToon APK:
- **Model file:** `src/assets/detector_dywi8.tflite` (47MB)
- **Input size:** 640x640 pixels
- **Classes:** Speech bubbles (1), Free text (2)
- **Confidence threshold:** 0.3

Detection runs entirely on-device. No server needed.

## Project Structure

```
opentoon-rebuild/
├── app/                        # Expo Router screens
│   ├── index.tsx              # Home screen
│   ├── capture.tsx            # Camera capture
│   ├── gallery.tsx            # Gallery import
│   ├── viewer.tsx             # Chapter viewer + translate
│   ├── chapters.tsx           # Saved chapters
│   └── settings.tsx           # LibreTranslate URL config
├── src/
│   ├── utils/
│   │   ├── imageSlicer.ts     # Image slicing utility
│   │   └── textDetector.ts    # TFLite text detection
│   ├── services/
│   │   └── translationService.ts  # LibreTranslate API client
│   ├── database/
│   │   └── schema.ts          # PowerSync schema
│   ├── assets/
│   │   └── detector_dywi8.tflite  # TFLite model
│   ├── hooks/
│   ├── constants/
│   └── ...
├── translate_server.py        # Local translation server
├── TODO_TEXT_PLACEMENT.md     # Text placement implementation guide
├── .github/workflows/
│   └── build.yml              # GitHub Actions build
├── eas.json                   # Expo Build config
└── package.json
```

## Supported Languages

| Language | Code | Status |
|----------|------|--------|
| Japanese | ja | ✅ Supported |
| Korean | ko | ✅ Supported |
| Chinese | zh | ✅ Supported |
| English | en | ✅ Supported |
| Indonesian | id | ✅ Supported |
| Malay | ms | ✅ Supported |
| Spanish | es | ✅ Supported |
| French | fr | ✅ Supported |
| German | de | ✅ Supported |
| Portuguese | pt | ✅ Supported |

## What's Different from Original

| Feature | Original | This Rebuild |
|---------|----------|--------------|
| Login/Auth | Supabase Auth | Removed |
| Coins/Payment | RevenueCat | Removed |
| Translation | Modal.com server | LibreTranslate (local, free) |
| Text Detection | TFLite (local) | TFLite (local) |
| Database | PowerSync + Supabase | PowerSync (local) |
| Analytics | PostHog, Sentry | Removed |
| OCR | Server-side | Not implemented (TODO) |
| Inpainting | Server-side | Not implemented (optional) |

## TODO

See `TODO_TEXT_PLACEMENT.md` for:
- Text placement & positioning
- Font matching
- Text bubble handling
- Image inpainting (optional)

## License

MIT
