/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    printForm: (options?: {
      mode?: 'plain' | 'preprinted'
      deviceName?: string
      showDialog?: boolean
    }) => Promise<{
      success: boolean
      error?: string
    }>
    getPrinters: () => Promise<{ name: string; displayName: string; isDefault: boolean }[]>
    saveFormData: (formData: any) => Promise<{ success: boolean }>
    loadFormData: (formId: string) => Promise<{ success: boolean; data: any }>
    importMaicoPdf: () => Promise<{
      success: boolean
      canceled?: boolean
      error?: string
      data?: {
        rightSymbols: { freq: number; db: number; symbolType: string }[]
        leftSymbols: { freq: number; db: number; symbolType: string }[]
      }
    }>
    onMaicoAutoImport: (
      callback: (payload: {
        volumeName: string
        filePath: string
        data: {
          rightSymbols: { freq: number; db: number; symbolType: string }[]
          leftSymbols: { freq: number; db: number; symbolType: string }[]
        }
      }) => void,
    ) => () => void
  }
}
