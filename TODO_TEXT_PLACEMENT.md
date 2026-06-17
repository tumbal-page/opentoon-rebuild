# TODO: Text Placement & Font Matching

## Status: Belum Diimplementasi

---

## 1. Text Placement (Penempatan Teks)

### Yang Perlu Diimplementasi:

#### a. Position Calculation
- [ ] Hitung posisi teks berdasarkan bounding box coordinates
- [ ] Handle rotasi teks (rotation_deg dari detection)
- [ ] Handle text alignment (left, center, right)
- [ ] Handle vertical text (untuk manga Jepang)

#### b. Text Sizing
- [ ] Auto-sizing: sesuaikan font size dengan box height
- [ ] Text wrapping: pecah teks panjang ke beberapa baris
- [ ] Min/max font size limits
- [ ] Handle text yang lebih panjang dari box width

#### c. Overlay Rendering
- [ ] Render teks sebagai overlay di atas gambar
- [ ] Semi-transparent background untuk readability
- [ ] Handle multiple text blocks per gambar
- [ ] Z-index management (text di atas gambar)

### Contoh Implementasi (nanti):

```typescript
// Position text within bounding box
function calculateTextPosition(
  box: { x: number; y: number; width: number; height: number },
  text: string,
  fontSize: number
) {
  return {
    left: box.x,
    top: box.y,
    width: box.width,
    height: box.height,
    fontSize: fontSize,
    textAlign: "center",
    lineHeight: fontSize * 1.2,
  };
}
```

---

## 2. Font Matching (Pencocokan Font)

### Yang Perlu Diimplementasi:

#### a. Font Detection
- [ ] Deteksi jenis font dari gambar (serif, sans-serif, bold, italic)
- [ ] Deteksi warna font (font_color dari detection)
- [ ] Deteksi ukuran font relatif

#### b. Font Selection
- [ ] Map detected font style ke available fonts
- [ ] Fallback font jika tidak ada match
- [ ] Custom font loading (untuk bahasa tertentu)

#### c. Font Rendering
- [ ] Apply font style ke translated text
- [ ] Maintain aspect ratio font
- [ ] Handle CJK fonts (Chinese, Japanese, Korean)

### Font Mapping (nanti):

```typescript
const FONT_MAP = {
  // Detected style → Available font
  "serif": "Noto Serif",
  "sans-serif": "Noto Sans",
  "bold": "Noto Sans Bold",
  "italic": "Noto Sans Italic",
  "cjk": "Noto Sans CJK",
};
```

---

## 3. Text Bubble Handling

### Yang Perlu Diimplementasi:

#### a. Bubble Detection
- [ ] Identifikasi speech bubble vs free text
- [ ] Detect bubble shape (rounded, rectangle, oval)
- [ ] Detect bubble background color

#### b. Text Fitting
- [ ] Fit text ke dalam bubble shape
- [ ] Maintain bubble aspect ratio
- [ ] Handle text overflow

#### c. Bubble Rendering
- [ ] Render teks dengan bubble background
- [ ] Preserve bubble style asli
- [ ] Handle multiple bubbles per page

---

## 4. Image Inpainting (Optional)

### Catatan:
Fitur ini TIDAK diimplementasi karena memerlukan:
- GPU server untuk menjalankan inpainting model
- Model LaMa atau Stable Diffusion
- Resource yang cukup besar

### Alternatif:
- Skip inpainting, hanya overlay teks
- Atau gunakan server terpisah untuk inpainting

---

## Priority Order:

1. **Text Placement** (Paling penting)
   - Position calculation
   - Text sizing
   - Overlay rendering

2. **Font Matching** (Penting)
   - Basic font detection
   - Font selection
   - CJK font support

3. **Text Bubble** (Nice to have)
   - Bubble detection
   - Text fitting

4. **Inpainting** (Optional)
   - Skip untuk sekarang

---

## References:

- Original app: `text_blocks` table has `x`, `y`, `width`, `height`, `rotation_deg`, `font_color`, `display_mode`
- Font rendering: React Native `<Text>` component with style props
- Image overlay: React Native `<ImageBackground>` or absolute positioned `<Text>`
