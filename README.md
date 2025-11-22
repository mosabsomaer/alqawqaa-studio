# Alqawqaa Studio 🏥

Digital audiometry and tympanometry form application for Al-Qawqaa Clinic.

## Overview

This is an **offline-first desktop application** built with Electron + React + TypeScript that allows doctors to fill out hearing test forms digitally, draw audiometry curves with the mouse, and print the results on A4 paper.

## Features

✅ **Offline-first** - Works completely locally, no internet required
✅ **Interactive charts** - Draw audiometry and tympanometry curves with mouse
✅ **A4 print layout** - Exact replica of the paper form
✅ **Arabic support** - RTL text input for patient information
✅ **Easy printing** - One-click printing with native Windows print dialog
✅ **Fast performance** - Optimized for older Windows 10 computers

## Tech Stack

- **Electron** - Desktop application framework
- **React 19** - UI components
- **TypeScript** - Type safety
- **Vite** - Fast build tool
- **TailwindCSS** - Styling
- **Konva.js** - Canvas drawing for charts
- **Biome** - Linting and formatting
- **electron-builder** - Windows installer creation

---

## Installation

### Prerequisites

- Node.js 18+ installed
- npm or pnpm package manager

### Step 1: Fix npm permissions (if needed)

If you encounter permission errors:

```bash
sudo chown -R $(id -u):$(id -g) "$HOME/.npm"
```

### Step 2: Install dependencies

Run the installation script:

```bash
chmod +x INSTALL.sh
./INSTALL.sh
```

Or install manually:

```bash
npm install
```

---

## Development

### Run in development mode

```bash
npm run dev
```

This will:
1. Start the Vite dev server
2. Launch the Electron app with hot reload
3. Open DevTools automatically

### Build for production

```bash
npm run build
```

### Create Windows installer

```bash
npm run package:win
```

The installer will be created in the `release/` folder.

---

## Project Structure

```
alqawqaa-studio/
├── electron/              # Electron main process
│   ├── main.ts           # Main process entry
│   ├── preload.ts        # IPC bridge
│   └── database.ts       # SQLite (future)
│
├── src/                   # React renderer
│   ├── components/       # UI components
│   │   ├── Header.tsx
│   │   ├── AudiogramChart.tsx
│   │   ├── TympanometryChart.tsx
│   │   ├── SpeechAudiometryTable.tsx
│   │   ├── SymptomsTable.tsx
│   │   ├── NotesSection.tsx
│   │   └── Footer.tsx
│   ├── App.tsx           # Main form layout
│   ├── main.tsx          # React entry
│   └── index.css         # Global styles + print CSS
│
├── resources/            # App assets
│   ├── icon.png
│   └── clinic-logo.png
│
└── dist-electron/        # Build output (generated)
```

---

## Usage

### For Doctors

1. **Fill patient information** - Name, age, date, ID, doctor name
2. **Draw audiometry curves** - Click on charts to plot points
3. **Draw tympanometry curves** - Click to draw compliance curves
4. **Fill tables** - Speech audiometry and symptoms checklist
5. **Add notes** - Tympanometry and audiometry observations
6. **Print** - Click the print button for A4 output

### Drawing Charts

- **Audiometry**: Click on the chart at the desired frequency and dB level
- Points will connect automatically with lines
- Red for Right ear, Blue for Left ear
- Click "Clear" to start over

- **Tympanometry**: Click to draw the compliance curve
- Points are sorted automatically by pressure (X-axis)

---

## Printing

The form is designed to print exactly on **A4 paper (210mm × 297mm)** with:

- 10mm margins
- Print-optimized CSS that removes input borders
- Proper canvas rendering for charts
- Hidden toolbar buttons

### Print Settings

When printing, use these settings:
- **Paper size**: A4
- **Orientation**: Portrait
- **Margins**: Default (handled by CSS)
- **Background graphics**: Enabled (to print charts)

---

## Development Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run package:win` | Create Windows installer |
| `npm run lint` | Lint code with Biome |
| `npm run format` | Format code with Biome |
| `npm run check` | Lint + format |
| `npm run typecheck` | Check TypeScript types |

---

## Future Enhancements

- [ ] SQLite database for saving patient records
- [ ] Search and load previous forms
- [ ] Export to PDF
- [ ] Multiple form templates
- [ ] Statistics and reporting
- [ ] Backup and restore functionality

---

## License

MIT License - Al-Qawqaa Clinic

---

## Support

For issues or questions, contact the development team.
