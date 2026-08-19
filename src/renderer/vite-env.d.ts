/// <reference types="vite/client" />

import type { DbResult, TestRecord, TestSummary } from '../shared/tests'

declare global {
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
      listTests: (query?: string) => Promise<DbResult<TestSummary[]>>
      getTest: (id: string) => Promise<DbResult<TestRecord | null>>
      saveTest: (payload: { id?: string | null; record: unknown }) => Promise<DbResult<TestRecord>>
      deleteTest: (id: string) => Promise<DbResult<boolean>>
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
}
