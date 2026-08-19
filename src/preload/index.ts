import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  printForm: (options?: { mode?: 'plain' | 'preprinted'; deviceName?: string; showDialog?: boolean }) =>
    ipcRenderer.invoke('print-form', options),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  listTests: (query?: string) => ipcRenderer.invoke('tests:list', query),
  getTest: (id: string) => ipcRenderer.invoke('tests:get', id),
  saveTest: (payload: { id?: string | null; record: unknown }) => ipcRenderer.invoke('tests:save', payload),
  deleteTest: (id: string) => ipcRenderer.invoke('tests:delete', id),
  importMaicoPdf: () => ipcRenderer.invoke('maico:importPdf'),
  onMaicoAutoImport: (callback: (payload: any) => void) => {
    const listener = (_event: IpcRendererEvent, payload: any) => callback(payload)
    ipcRenderer.on('maico:autoImport', listener)
    return () => ipcRenderer.removeListener('maico:autoImport', listener)
  },
})
