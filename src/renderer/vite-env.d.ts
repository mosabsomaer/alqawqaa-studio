/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    printForm: () => Promise<{ success: boolean; error?: string }>
    saveFormData: (formData: any) => Promise<{ success: boolean }>
    loadFormData: (formId: string) => Promise<{ success: boolean; data: any }>
  }
}
