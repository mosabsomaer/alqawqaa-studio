import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  printForm: () => ipcRenderer.invoke('print-form'),
  saveFormData: (formData: any) => ipcRenderer.invoke('save-form-data', formData),
  loadFormData: (formId: string) => ipcRenderer.invoke('load-form-data', formId),
})
