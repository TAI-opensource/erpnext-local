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

const Desk = lazy(() => import('@/pages/Desk'))
const BankStatementImporter = lazy(() => import('@/pages/BankStatementImporter'))
const ViewBankStatementImportLog = lazy(() => import('@/pages/ViewBankStatementImportLog'))

// Module pages - lazy loaded
const AccountsModule = lazy(() => import('@/pages/modules/Accounts'))
const SellingModule = lazy(() => import('@/pages/modules/Selling'))
const BuyingModule = lazy(() => import('@/pages/modules/Buying'))
const StockModule = lazy(() => import('@/pages/modules/Stock'))
const HRModule = lazy(() => import('@/pages/modules/HR'))
const PayrollModule = lazy(() => import('@/pages/modules/Payroll'))
const AssetsModule = lazy(() => import('@/pages/modules/Assets'))
const ProjectsModule = lazy(() => import('@/pages/modules/Projects'))
const CRMModule = lazy(() => import('@/pages/modules/CRM'))
const SetupModule = lazy(() => import('@/pages/modules/Setup'))
const ReportsModule = lazy(() => import('@/pages/modules/Reports'))

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
      upload: async (file: File) => {
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
      <SWRConfig value={{ errorRetryCount: 2, shouldRetryOnError: false }}>
        <LucideProvider strokeWidth={1.5}>
          <TooltipProvider>
            <ThemeProvider defaultTheme="Automatic" storageKey="erpnext-ui-theme">
              <BrowserRouter>
                <Routes>
                  {/* Desk / Home */}
                  <Route path="/desk" element={<Desk />} />

                  {/* Banking (original) */}
                  <Route path="/" element={<BankReconciliation />} />
                  <Route path="/statement-importer" element={<BankStatementImporterContainer />}>
                    <Route index element={<BankStatementImporter />} />
                    <Route path=":id" element={<ViewBankStatementImportLog />} />
                  </Route>

                  {/* Accounts Module */}
                  <Route path="/app/accounts/*" element={<AccountsModule />} />
                  <Route path="/app/accounts" element={<AccountsModule />} />

                  {/* Selling Module */}
                  <Route path="/app/selling/*" element={<SellingModule />} />
                  <Route path="/app/selling" element={<SellingModule />} />

                  {/* Buying Module */}
                  <Route path="/app/buying/*" element={<BuyingModule />} />
                  <Route path="/app/buying" element={<BuyingModule />} />

                  {/* Stock Module */}
                  <Route path="/app/stock/*" element={<StockModule />} />
                  <Route path="/app/stock" element={<StockModule />} />

                  {/* HR Module */}
                  <Route path="/app/hr/*" element={<HRModule />} />
                  <Route path="/app/hr" element={<HRModule />} />

                  {/* Payroll Module */}
                  <Route path="/app/payroll/*" element={<PayrollModule />} />
                  <Route path="/app/payroll" element={<PayrollModule />} />

                  {/* Assets Module */}
                  <Route path="/app/assets/*" element={<AssetsModule />} />
                  <Route path="/app/assets" element={<AssetsModule />} />

                  {/* Projects Module */}
                  <Route path="/app/projects/*" element={<ProjectsModule />} />
                  <Route path="/app/projects" element={<ProjectsModule />} />

                  {/* CRM Module */}
                  <Route path="/app/crm/*" element={<CRMModule />} />
                  <Route path="/app/crm" element={<CRMModule />} />

                  {/* Setup Module */}
                  <Route path="/app/setup/*" element={<SetupModule />} />
                  <Route path="/app/setup" element={<SetupModule />} />

                  {/* Reports Module */}
                  <Route path="/app/reports/*" element={<ReportsModule />} />
                  <Route path="/app/reports" element={<ReportsModule />} />

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
