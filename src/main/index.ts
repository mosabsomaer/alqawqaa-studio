import electron, { BrowserWindow } from 'electron'
import { join } from 'node:path'
import { parseMaicoPdf } from './maico/parsePdf'
import { type DetectedVolume, findLatestPdf, startVolumeWatcher } from './maico/volumeWatcher'

const { app, ipcMain, dialog } = electron

let mainWindow: InstanceType<typeof BrowserWindow> | null = null
let stopVolumeWatcher: (() => void) | null = null

function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: join(__dirname, '../../resources/icon.png'),
  })

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../../out/renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// App lifecycle
app.whenReady().then(() => {
  createWindow()
  stopVolumeWatcher = startVolumeWatcher(volume => {
    void handleVolumeAdded(volume)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('before-quit', () => {
  stopVolumeWatcher?.()
  stopVolumeWatcher = null
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

const VOLUME_SCAN_RETRIES = 3
const VOLUME_SCAN_DELAY_MS = 1500

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function handleVolumeAdded({ path: volumePath, label }: DetectedVolume) {
  for (let attempt = 0; attempt < VOLUME_SCAN_RETRIES; attempt++) {
    await delay(VOLUME_SCAN_DELAY_MS)

    const pdfPath = findLatestPdf(volumePath)
    if (!pdfPath) continue

    try {
      const data = await parseMaicoPdf(pdfPath)
      const count = data.rightSymbols.length + data.leftSymbols.length
      if (count === 0) {
        console.log('Auto import: no Maico symbols found in', pdfPath)
        return
      }
      mainWindow?.webContents.send('maico:autoImport', {
        volumeName: label,
        filePath: pdfPath,
        data,
      })
    } catch (err) {
      console.log('Auto import: skipping', pdfPath, String(err))
    }
    return
  }

  console.log('Auto import: no PDF found on', label)
}

// IPC Handlers
ipcMain.handle('print-form', async (_event, options?: { mode?: 'plain' | 'preprinted' }) => {
  if (!mainWindow) return { success: false, error: 'No window available' }

  // On pre-printed stock the sheet's own background would lay a full page of
  // ink over a template that is already there.
  const preprinted = options?.mode === 'preprinted'

  try {
    await mainWindow.webContents.print({
      silent: false,
      printBackground: !preprinted,
      margins: {
        marginType: 'custom',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      },
      pageRanges: [{ from: 0, to: 0 }], // Print only the first page
    })
    return { success: true }
  } catch (error) {
    console.error('Print error:', error)
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('save-form-data', async (_event, formData) => {
  // Future: save to SQLite database
  console.log('Saving form data:', formData)
  return { success: true }
})

ipcMain.handle('load-form-data', async (_event, formId) => {
  // Future: load from SQLite database
  console.log('Loading form data:', formId)
  return { success: true, data: null }
})

ipcMain.handle('maico:importPdf', async () => {
  if (!mainWindow) return { success: false, error: 'No window' }

  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Maico PDF',
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    properties: ['openFile'],
  })

  if (canceled || filePaths.length === 0) return { success: false, canceled: true }

  try {
    const data = await parseMaicoPdf(filePaths[0])
    return { success: true, data }
  } catch (err) {
    console.error('Maico import error:', err)
    return { success: false, error: String(err) }
  }
})
