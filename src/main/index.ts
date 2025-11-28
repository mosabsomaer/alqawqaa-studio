import electron from 'electron'
import { join } from 'node:path'

const { app, BrowserWindow, ipcMain } = electron

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC Handlers
ipcMain.handle('print-form', async () => {
  if (!mainWindow) return { success: false, error: 'No window available' }

  try {
    await mainWindow.webContents.print({
      silent: false,
      printBackground: true,
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
