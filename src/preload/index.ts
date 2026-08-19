import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  printForm: (options?: { mode?: 'plain' | 'preprinted'; deviceName?: string; showDialog?: boolean }) =>
    ipcRenderer.invoke('print-form', options),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  saveFormData: (formData: any) => ipcRenderer.invoke('save-form-data', formData),
  loadFormData: (formId: string) => ipcRenderer.invoke('load-form-data', formId),
  importMaicoPdf: () => ipcRenderer.invoke('maico:importPdf'),
  onMaicoAutoImport: (callback: (payload: any) => void) => {
    const listener = (_event: IpcRendererEvent, payload: any) => callback(payload)
    ipcRenderer.on('maico:autoImport', listener)
    return () => ipcRenderer.removeListener('maico:autoImport', listener)
  },
})
