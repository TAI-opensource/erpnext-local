import { initBackend, getBackend, type LocalBackend } from './backend'

let _localMode = false
let _backend: LocalBackend | null = null

export function isLocalMode(): boolean {
  return _localMode
}

export function getLocalBackend(): LocalBackend {
  if (!_backend) {
    throw new Error('Local backend not initialized. Call setupLocalMode() first.')
  }
  return _backend
}

export async function setupLocalMode(): Promise<void> {
  if (_localMode) return

  _backend = await initBackend()
  _localMode = true

  console.log('[Local Mode] Setup complete')
}
