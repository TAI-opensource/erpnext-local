// =============================================================================
// frappe-react-sdk Local Shim — Drop-in replacement using local backend
// =============================================================================
// Re-exports hooks from ./hooks-local and provides FrappeProvider, FrappeContext,
// FrappeError, and other exports so that components importing from
// 'frappe-react-sdk' work unchanged when aliased to this file.
// =============================================================================

import {
  createContext,
  createElement,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import {
  useFrappeGetCall as _useFrappeGetCall,
  useFrappePostCall as _useFrappePostCall,
  useFrappeGetDoc as _useFrappeGetDoc,
  useFrappeGetDocList as _useFrappeGetDocList,
  useFrappeGetDocCount as _useFrappeGetDocCount,
  useFrappeCreateDoc as _useFrappeCreateDoc,
  useFrappeUpdateDoc as _useFrappeUpdateDoc,
  useFrappeEventListener as _useFrappeEventListener,
  useFrappeDocumentEventListener as _useFrappeDocumentEventListener,
  useFrappeFileUpload as _useFrappeFileUpload,
  useSWRConfig as _useSWRConfig,
} from './hooks-local'

// =============================================================================
// Types
// =============================================================================

export type SWRConfiguration = any
export type Filter = any

export interface FrappeConfig {
  url?: string
  call: (method: string, args?: any) => Promise<any>
  file: {
    upload: (file: File, options?: any) => Promise<any>
    get_url: (url: string) => string
  }
  socketPort?: string
  [key: string]: any
}

export interface FrappeProviderProps {
  children: ReactNode
  siteName?: string
  url?: string
  socketPort?: string
  swrConfig?: Record<string, any>
}

// =============================================================================
// FrappeError Class
// =============================================================================

export class FrappeError extends Error {
  exc: string
  _server_messages: string[]
  _error_message?: string
  exception?: string
  httpStatus?: number

  constructor(message: string, exc?: string, _server_messages?: string[]) {
    super(message)
    this.name = 'FrappeError'
    this.exc = exc || ''
    this._server_messages = _server_messages || []
  }
}

// =============================================================================
// FrappeContext & FrappeProvider
// =============================================================================

export const FrappeContext = createContext<FrappeConfig | null>(null)

export function FrappeProvider({ children, url, socketPort }: FrappeProviderProps) {
  const config: FrappeConfig = {
    url: url || '',
    call: async (method, args) => {
      const response = await fetch(`/api/method/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args || {}),
      })
      return response.json()
    },
    file: {
      upload: async (file, options) => {
        const formData = new FormData()
        formData.append('file', file)
        if (options?.isPrivate) formData.append('is_private', '1')
        if (options?.folder) formData.append('folder', options.folder)
        if (options?.file_name) formData.append('file_name', options.file_name)
        const response = await fetch('/api/method/upload_file', {
          method: 'POST',
          body: formData,
        })
        return response.json()
      },
      get_url: (u) => u,
    },
    socketPort,
  }

  return createElement(FrappeContext.Provider, { value: config }, children)
}

function useFrappeContext(): FrappeConfig {
  const ctx = useContext(FrappeContext)
  if (!ctx) throw new Error('useFrappeContext must be used within a FrappeProvider')
  return ctx
}

// =============================================================================
// Hook Wrappers — adapt hooks-local return types to match frappe-react-sdk
// =============================================================================

export function useFrappeGetCall<T = any>(
  method: string,
  args?: Record<string, any>,
  optionsOrKey?: string | Record<string, any>,
  options?: Record<string, any>,
): {
  data: T | undefined
  error: any
  isLoading: boolean
  isValidating: boolean
  mutate: () => void
} {
  const result = _useFrappeGetCall<T>(method, args, optionsOrKey as any, options as any)
  return {
    data: result.data,
    error: result.error,
    isLoading: result.isLoading,
    isValidating: result.isLoading,
    mutate: result.mutate,
  }
}

export function useFrappePostCall<T = any>(
  method: string,
  args?: Record<string, any>,
): {
  call: (overrideArgs?: Record<string, any>) => Promise<any>
  data: T | undefined
  error: any
  loading: boolean
  isCompleted: boolean
} {
  const result = _useFrappePostCall<T>(method)
  const [isCompleted, setIsCompleted] = useState(false)

  const wrappedCall = useCallback(
    async (overrideArgs?: Record<string, any>) => {
      setIsCompleted(false)
      try {
        const response = await result.call(overrideArgs ?? args)
        setIsCompleted(true)
        return response
      } catch (err) {
        throw err
      }
    },
    [result.call, args],
  )

  return {
    call: wrappedCall,
    data: result.data,
    error: result.error,
    loading: result.loading,
    isCompleted,
  }
}

export function useFrappeGetDoc<T = any>(
  doctype: string,
  name: string | null,
  _optionsOrArgs?: any,
  _swrOptions?: any,
): {
  data: T | undefined
  error: any
  isValidating: boolean
  mutate: () => void
} {
  const result = _useFrappeGetDoc<T>(doctype, name)
  return {
    data: result.data,
    error: result.error,
    isValidating: result.isLoading,
    mutate: result.mutate,
  }
}

export function useFrappeGetDocList<T = any>(
  doctype: string,
  options?: Record<string, any>,
): {
  data: T[] | undefined
  error: any
  isLoading: boolean
  isValidating: boolean
  mutate: () => void
} {
  const result = _useFrappeGetDocList<T>(doctype, options as any)
  return {
    data: result.data,
    error: result.error,
    isLoading: result.isLoading,
    isValidating: result.isLoading,
    mutate: result.mutate,
  }
}

export function useFrappeGetDocCount(
  doctype: string,
  filters?: any,
  _args?: any,
  _options?: any,
): {
  data: number | undefined
  error: any
  isLoading: boolean
  isValidating: boolean
  mutate: () => void
} {
  const result = _useFrappeGetDocCount(doctype, filters)
  return {
    data: result.data,
    error: result.error,
    isLoading: result.isLoading,
    isValidating: result.isLoading,
    mutate: () => {},
  }
}

export function useFrappeCreateDoc<T = any>(): {
  createDoc: (doctype: string, data: Record<string, any>) => Promise<T>
  data: T | undefined
  error: any
  loading: boolean
} {
  const result = _useFrappeCreateDoc<T>()
  return {
    createDoc: result.create as any,
    data: result.data,
    error: result.error,
    loading: result.loading,
  }
}

export function useFrappeUpdateDoc<T = any>(): {
  updateDoc: (doctype: string, name: string, doc: Record<string, any>) => Promise<T>
  data: T | undefined
  error: any
  loading: boolean
} {
  const result = _useFrappeUpdateDoc<T>()
  return {
    updateDoc: result.update as any,
    data: result.data,
    error: result.error,
    loading: result.loading,
  }
}

export function useFrappeEventListener(eventName: string, callback: (data: any) => void): void {
  _useFrappeEventListener(eventName, callback)
}

export function useFrappeDocumentEventListener(
  doctype: string,
  name: string,
  callback: (data: any) => void,
): void {
  useEffect(() => {
    const eventName = `frappe:doc:${doctype}:${name}`
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent
      callback(customEvent.detail)
    }
    window.addEventListener(eventName, handler)
    return () => window.removeEventListener(eventName, handler)
  }, [doctype, name, callback])
}

export function useFrappeFileUpload(): {
  upload: (file: File, options?: any) => Promise<{ file_url: string; name: string }>
  progress: number
  error: any
  loading: boolean
} {
  const result = _useFrappeFileUpload()
  return {
    upload: result.upload,
    progress: result.progress,
    error: result.error,
    loading: result.loading,
  }
}

// =============================================================================
// SWR Compatibility
// =============================================================================

export function useSWRConfig(): {
  mutate: (
    key: string | string[] | null,
    data?: any,
    opts?: { revalidate?: boolean; populateCache?: boolean },
  ) => Promise<any>
  cache: Map<any, any>
  fallbackData: any
} {
  const base = _useSWRConfig()

  const mutate = useCallback(
    async (
      key: string | string[] | null,
      data?: any,
      _opts?: { revalidate?: boolean; populateCache?: boolean },
    ) => {
      const cacheKey = Array.isArray(key) ? key.join('') : key || ''
      if (data !== undefined) {
        base.cache.set(cacheKey, data)
      }
      return data
    },
    [base.cache],
  )

  return {
    mutate,
    cache: base.cache,
    fallbackData: undefined,
  }
}

export function useSWR<T = any>(
  key: string | null,
  fetcher?: () => Promise<T>,
  options?: Record<string, any>,
): {
  data: T | undefined
  error: any
  isLoading: boolean
  isValidating: boolean
  mutate: () => void
} {
  const [data, setData] = useState<T | undefined>(options?.fallbackData)
  const [error, setError] = useState<any>(undefined)
  const [isLoading, setIsLoading] = useState(!!key)
  const mountedRef = useRef(true)

  const mutate = useCallback(() => {
    if (!key || !fetcher) return
    setIsLoading(true)
    fetcher()
      .then((result) => {
        if (mountedRef.current) {
          setData(result)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (mountedRef.current) {
          setError(err)
          setIsLoading(false)
        }
      })
  }, [key])

  useEffect(() => {
    if (!key || !fetcher) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(undefined)
    fetcher()
      .then((result) => {
        if (mountedRef.current) {
          setData(result)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (mountedRef.current) {
          setError(err)
          setIsLoading(false)
        }
      })
    return () => { mountedRef.current = false }
  }, [key])

  return { data, error, isLoading, isValidating: isLoading, mutate }
}

// =============================================================================
// useFrappeAuth — local stub
// =============================================================================

export function useFrappeAuth(_options?: SWRConfiguration) {
  const user = typeof window !== 'undefined' ? (window as any).frappe?.boot?.user : null
  return {
    currentUser: user?.name ?? null,
    isLoading: false,
    isValidating: false,
    error: null,
    login: async (_credentials: any) => ({
      message: { user: user?.name ?? 'Guest', full_name: user?.full_name ?? 'Guest' },
    }),
    logout: async () => {},
    updateCurrentUser: () => {},
    getUserCookie: () => {},
  }
}

// =============================================================================
// Additional re-exports for full compatibility
// =============================================================================

export type { SWROptions } from './hooks-local'
export type { HookResult } from './hooks-local'
