import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppLocal from './App-local.tsx'
import { DirectionProvider } from './components/ui/direction.tsx'
import { setupPolyfills } from './backend/polyfills'
import { initBackend } from './backend'

async function bootstrap() {
  setupPolyfills()

  await initBackend()

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
