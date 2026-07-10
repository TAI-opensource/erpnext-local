import { lazy, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { SWRConfig } from 'swr'
import { Toaster } from '@/components/ui/sonner'
import BankReconciliation from '@/pages/BankReconciliation'
import BankStatementImporterContainer from '@/pages/BankStatementImporterContainer'
import { TooltipProvider } from './components/ui/tooltip'
import { LucideProvider } from 'lucide-react'
import { ThemeProvider } from './components/ui/theme-provider'
import { FrappeContext } from './frappe-react-sdk-local'
import type { FrappeConfig } from './frappe-react-sdk-local'

const BankStatementImporter = lazy(() => import('@/pages/BankStatementImporter'))
const ViewBankStatementImportLog = lazy(() => import('@/pages/ViewBankStatementImportLog'))

// ---------------------------------------------------------------------------
// LocalFrappeProvider — wraps FrappeContext with the local backend
// ---------------------------------------------------------------------------
function LocalFrappeProvider({ children }: { children: React.ReactNode }) {
  const config: FrappeConfig = {
    url: '',
    app: {},
    auth: {},
    db: {},
    call: async (method: string, args?: Record<string, unknown>) => {
      const { getBackend } = await import('./backend')
      const backend = getBackend()
      return backend.call(method, args as Record<string, unknown>)
    },
    file: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      upload: async (file: File, _options?: Record<string, unknown>) => {
        return { file_url: `local://${file.name}`, name: Date.now().toString() }
      },
      get_url: (url: string) => url,
    },
    socket: undefined,
  }

  return (
    <FrappeContext.Provider value={config}>
      {children}
    </FrappeContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// AppLocal
// ---------------------------------------------------------------------------
function AppLocal() {
  useEffect(() => {
    const userId = window.frappe?.boot?.user?.name
    const isLoggedIn = userId && userId !== 'Guest'

    if (!isLoggedIn) {
      console.log('[Local Mode] No user logged in, using default session')
    }
  }, [])

  return (
    <LocalFrappeProvider>
      <SWRConfig
        value={{
          errorRetryCount: 2,
          shouldRetryOnError: false,
        }}
      >
        <LucideProvider strokeWidth={1.5}>
          <TooltipProvider>
            <ThemeProvider defaultTheme="Automatic" storageKey="erpnext-ui-theme">
              <BrowserRouter basename="/banking">
                <Routes>
                  <Route path="/" element={<BankReconciliation />} />
                  <Route path="/statement-importer" element={<BankStatementImporterContainer />}>
                    <Route index element={<BankStatementImporter />} />
                    <Route path=":id" element={<ViewBankStatementImportLog />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
              <Toaster richColors />
            </ThemeProvider>
          </TooltipProvider>
        </LucideProvider>
      </SWRConfig>
    </LocalFrappeProvider>
  )
}

export default AppLocal
