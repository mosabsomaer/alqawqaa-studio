# Maico MA 42 → Studio Integration Brief

## What the user wants

The clinic uses a **Maico MA 42** audiometer (serial `MA9086412`) for hearing tests. Today the technician:

1. Runs the test on the Maico — the device displays the full audiogram with all threshold symbols.
2. Plugs a USB flash drive into the device, presses **Print PDF** → the device saves a PDF of the report onto the drive.
3. Opens the studio app (this Electron + React project) and **manually re-enters the same audiogram from scratch** to render and print the clinic's branded report.

Goal: **eliminate the double-entry**. Add an integration so the technician can transfer the audiogram data from the Maico into the studio app once, then review and print — no re-typing.

### Confirmed constraints

- The Maico's only USB export option is "Print PDF". No XML, CSV, NOAH, or GDT export available from the device menu.
- Preferred UX: a manual **"Import from Maico"** button in the studio app where the technician picks the PDF from the USB drive.
- A sample PDF was provided (`/Users/mosabomaer/Desktop/2026-04-23-20-22-52.pdf`, MA 42, 1 page).
- Tympanometry is **not** produced by this Maico — the studio's tympanometry chart will remain manual.

### What the sample PDF contains

- **Text layer (extractable as plain text):** patient ID/last name/first name/DOB/sex/examiner fields, session date+time, clinic header, axis labels, masking-level table headers/cells (if filled), `PTA BC` value, symbol legend, calibration date, serial number.
- **Vector graphics layer (NOT text):** the actual threshold symbols (O, X, <, >, □, Δ, [, ], S/M/U/A, NR arrows) plotted on the two audiogram grids, plus the dashed lines connecting them. Recovering these requires parsing the PDF's drawing operators, not just text.

## Studio project context

- **Stack:** Electron + React 19 + TypeScript + Vite, Konva for chart canvas, Tailwind 4, better-sqlite3 (DB partially wired).
- **Existing audiogram data shape** (already used by the renderer — the integration should produce exactly this so no chart code changes):
  ```ts
  PlacedSymbol { id, x, y, freq, db, symbolType }
  // symbolType ∈ ac-right-unmasked, ac-left-unmasked, ac-right-masked,
  //              ac-left-masked, bc-right-unmasked, bc-left-unmasked,
  //              bc-right-masked, bc-left-masked, nr-right, nr-left,
  //              aided, sound-field
  ```
- **Form state** (`src/renderer/App.tsx` `FormData`): `patientName`, `age`, `date`, `doctor`, `referredFrom`, `rightAudiogramData` / `leftAudiogramData` (JSON strings of `PlacedSymbol[]`), tympanometry, speech audiometry, notes.
- **IPC surface:** `electronAPI.printForm`, `saveFormData` (stub), `loadFormData` (stub) in `src/main/index.ts` + `src/preload/index.ts`. No existing import/upload code.

## Suggested solutions (short list)

### 1. PDF vector parsing — Recommended
Use `pdfjs-dist` in the Electron main process. Two passes on the PDF:
- **Text pass:** extract patient/session metadata, PTA, masking-table values.
- **Vector pass:** walk `getOperatorList()` inside the two known chart bounding boxes; cluster drawing ops into glyphs; classify each by **stroke color** (red = Right, blue = Left per Maico legend) and **shape signature** (segment count + geometry); map glyph centroid `(px, py)` → `(frequency, dB)` via hard-coded MA 42 chart calibration.
- Produce `PlacedSymbol[]` and feed straight into existing form state.
- Always show a **"Imported N symbols — review before printing"** banner so the technician verifies before the final print.

Pros: deterministic, no extra heavy deps, fast, fits the existing data shape exactly.
Cons: depends on Maico's fixed PDF template; would need re-calibration if firmware changes layout.

### 2. OCR / image-based detection — Fallback only
Render PDF to a high-res raster, then use color/shape detection on the pixels.
Pros: more tolerant of layout drift.
Cons: heavier dependency (e.g., OpenCV.js or Tesseract), slower, no clear accuracy win over option 1 for a fixed template.

### 3. NOAH / direct device link — Out of scope
The MA 42 supports NOAH via USB cable, but the clinic only uses the flash-drive PDF workflow. Could be revisited later if PDF parsing proves too brittle.

### 4. Status quo + skip re-typing the chart only — Not recommended
E.g., embed the Maico PDF as an image in the studio printout. Solves the double-entry but loses the clinic's branded chart layout and any ability to edit thresholds.

## v1 scope (recommended)

- **In:** AC unmasked (O / X), AC masked (Δ / □), BC unmasked (< / >), BC masked ([ / ]), NR arrows, patient name, session date, examiner → doctor, PTA into notes.
- **Out (later):** SF / MCL / UCL / Aided symbols, masking-level tables, automatic USB-drive detection.

## Files likely to change

- `src/main/index.ts` — register `maico:importPdf` IPC handler.
- `src/preload/index.ts` — expose `electronAPI.importMaicoPdf`.
- `src/main/maico/` (new) — `parsePdf.ts`, `extractText.ts`, `extractSymbols.ts`, `chartCalibration.ts`.
- `src/renderer/App.tsx` — "Import from Maico" button, file picker, merge into form state, review banner.
- `src/renderer/components/ImportReviewBanner.tsx` (new).
- `package.json` — add `pdfjs-dist`.

## Verification

1. Import the sample PDF; expect the right-ear AC unmasked thresholds (~35 dB @ 250 Hz, ~15 dB @ 500/1k/2k Hz, ~35 dB @ 4k Hz) to populate; left ear empty.
2. Collect 2–3 more PDFs covering both ears, masked, NR, BC; re-verify.
3. Round-trip: import → manually tweak one symbol → print; confirm output matches.
4. Error path: import a non-Maico PDF → clear error, form untouched.
