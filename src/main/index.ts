import electron, { BrowserWindow } from 'electron'
import { join } from 'node:path'
import { closeDb, deleteTest, getTest, listTests, saveTest } from './db'
import type { DbResult } from '../shared/tests'
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
  closeDb()
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
ipcMain.handle('get-printers', async () => {
  if (!mainWindow) return []
  return mainWindow.webContents.getPrintersAsync()
})

ipcMain.handle(
  'print-form',
  async (
    _event,
    options?: { mode?: 'plain' | 'preprinted'; deviceName?: string; showDialog?: boolean },
  ) => {
    const win = mainWindow
    if (!win) return { success: false, error: 'No window available' }

    // On pre-printed stock the sheet's own background would lay a full page of
    // ink over a template that is already there.
    const preprinted = options?.mode === 'preprinted'

    // Default is silent (no OS dialog); showDialog opens it for one-off
    // customization (different printer, paper size, copies, etc). An empty
    // deviceName falls back to the system default printer.
    return new Promise<{ success: boolean; error?: string }>(resolve => {
      win.webContents.print(
        {
          silent: !options?.showDialog,
          deviceName: options?.deviceName || undefined,
          printBackground: !preprinted,
          margins: {
            marginType: 'custom',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
          },
          pageRanges: [{ from: 0, to: 0 }], // Print only the first page
        },
        (success, failureReason) => {
          if (success) resolve({ success: true })
          else resolve({ success: false, error: failureReason })
        },
      )
    })
  },
)

function dbResult<T>(run: () => T): DbResult<T> {
  try {
    return { success: true, data: run() }
  } catch (err) {
    console.error('Database error:', err)
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

ipcMain.handle('tests:list', async (_event, query?: string) => dbResult(() => listTests(query ?? '')))

ipcMain.handle('tests:get', async (_event, id: string) => dbResult(() => getTest(id)))

ipcMain.handle('tests:save', async (_event, payload: { id?: string | null; record: unknown }) =>
  dbResult(() => saveTest(payload?.id ?? null, payload?.record)),
)

ipcMain.handle('tests:delete', async (_event, id: string) => dbResult(() => deleteTest(id)))

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
