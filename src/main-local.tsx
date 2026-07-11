import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppLocal from './App-local.tsx'
import { DirectionProvider } from './components/ui/direction.tsx'
import { initBackend } from './backend'

declare global {
  var locals: Record<string, Record<string, unknown>>
}

if (!(window as any).locals) {
  ;(window as any).locals = {}
}

async function bootstrap() {
  try {
    await initBackend()
  } catch (error) {
    console.error('[ERPNext Local] Backend init failed:', error)
    const root = document.getElementById('root')
    if (root) {
      root.innerHTML = `
        <div style="padding:2rem;font-family:monospace;background:#1a1a2e;color:#e0e0e0;min-height:100vh;">
          <h1 style="color:#ff6b6b;">⚠️ ERPNext Local — Init Error</h1>
          <pre style="background:#16213e;padding:1rem;border-radius:8px;overflow:auto;white-space:pre-wrap;">${
            error instanceof Error ? error.message + '\n\n' + error.stack : String(error)
          }</pre>
          <p style="margin-top:1rem;color:#a0a0a0;">Try clearing IndexedDB and refreshing.</p>
        </div>
      `
    }
    return
  }

  const user = window.frappe?.boot?.user
  const dir = user?.name ? 'ltr' : 'ltr'

  createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
      <DirectionProvider dir={dir}>
        <AppLocal />
      </DirectionProvider>
    </StrictMode>,
  )
}

bootstrap()
