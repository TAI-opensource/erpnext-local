import { useState, useCallback, useEffect, useRef } from 'react'
import { getBackend } from './backend'
import type { FrappeResponse, DocListOptions } from './backend'

// --- Types for frappe-react-sdk compatibility ---

export interface FrappeConfig {
  baseUrl?: string
  token?: string
  [key: string]: any
}

export interface FrappeContext {
  urlConstructor?: (path: string) => string
  [key: string]: any
}

export type FrappeError = any

interface SWROptions {
  revalidateOnFocus?: boolean
  revalidateIfStale?: boolean
  revalidateOnMount?: boolean
  revalidateOnReconnect?: boolean
  dedupingInterval?: number
  focusThrottleInterval?: number
  refreshInterval?: number
  onErrorRetry?: (error: any, key: string, config: any, revalidate: () => void, options: any) => void
  shouldRetryOnError?: boolean
  [key: string]: any
}

interface MutateOptions<T> {
  optimisticData?: T
  revalidate?: boolean
  populateCache?: boolean
  rollbackOnError?: boolean
}

interface HookResult<T> {
  data: T | undefined
  error: any
  isLoading: boolean
  mutate: (data?: Promise<T> | T | undefined, opts?: MutateOptions<T>) => Promise<T | undefined>
}

function useSWRLike<T>(key: string | null, fetcher: () => Promise<T>): HookResult<T> {
  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState<any>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const mountedRef = useRef(true)

  const mutate = useCallback(async (dataOrPromise?: Promise<T> | T | undefined, opts?: MutateOptions<T>): Promise<T | undefined> => {
    // Apply optimistic data if provided
    if (opts?.optimisticData !== undefined) {
      setData(opts.optimisticData)
    }

    let newData: T
    try {
      if (dataOrPromise instanceof Promise) {
        newData = await dataOrPromise
      } else if (dataOrPromise !== undefined) {
        newData = dataOrPromise as T
      } else {
        // No data provided, just revalidate
        if (!key || !mountedRef.current) return data
        newData = await fetcher()
      }
      if (mountedRef.current) {
        setData(newData)
        setIsLoading(false)
      }
      return newData
    } catch (err) {
      if (mountedRef.current) {
        setError(err)
        setIsLoading(false)
      }
      throw err
    }
  }, [key])

  useEffect(() => {
    if (!key) {
      setIsLoading(false)
      return
    }

    mountedRef.current = true
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

  return { data, error, isLoading, mutate }
}

// ---------------------------------------------------------------------------
// 1. useFrappeGetCall — 4 args (method, args, keyOrOptions, options)
// ---------------------------------------------------------------------------
export function useFrappeGetCall<T = any>(
  method: string,
  args?: Record<string, any>,
  keyOrOptions?: string | SWROptions,
  options?: SWROptions
): { data?: T; error?: any; isLoading: boolean; mutate: () => void } {
  const backend = getBackend()

  let swrKey = method + JSON.stringify(args || {})
  let swrOptions: SWROptions | undefined

  if (typeof keyOrOptions === 'string') {
    swrKey = keyOrOptions
    swrOptions = options
  } else if (typeof keyOrOptions === 'object' && keyOrOptions !== null) {
    swrOptions = keyOrOptions as SWROptions
  }

  const fetcher = useCallback(async () => {
    const response = await backend.call(method, args)
    return response as T
  }, [method, JSON.stringify(args)])

  const result = useSWRLike<T>(swrKey, fetcher)

  // Fire onSuccess / onError callbacks when data or error changes
  useEffect(() => {
    if (result.data !== undefined && swrOptions?.onSuccess) {
      swrOptions.onSuccess(result.data)
    }
  }, [result.data])

  useEffect(() => {
    if (result.error && swrOptions?.onError) {
      swrOptions.onError(result.error)
    }
  }, [result.error])

  return result
}

// ---------------------------------------------------------------------------
// 2. useFrappePostCall — returns `loading` (not `isLoading`)
// ---------------------------------------------------------------------------
export function useFrappePostCall<T = any>(
  method: string
): {
  call: (args?: any) => Promise<{ message: T }>
  data?: T
  error?: any
  loading: boolean
} {
  const backend = getBackend()
  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState<any>(undefined)
  const [loading, setLoading] = useState(false)

  const call = useCallback(async (overrideArgs?: any): Promise<{ message: T }> => {
    setLoading(true)
    setError(undefined)
    try {
      const response = await backend.call(method, overrideArgs)
      setData(response.message)
      setLoading(false)
      return response as { message: T }
    } catch (err) {
      setError(err)
      setLoading(false)
      throw err
    }
  }, [method])

  return { call, data, error, loading }
}

// ---------------------------------------------------------------------------
// 3. useFrappeGetDoc — 4 args (doctype, name, options, swrOptions)
// ---------------------------------------------------------------------------
export function useFrappeGetDoc<T = any>(
  doctype: string,
  name: string | null,
  options?: any,
  swrOptions?: any
): { data?: T; error?: any; isLoading: boolean; mutate: () => void } {
  const backend = getBackend()
  const key = name ? `doc:${doctype}:${name}` : null

  const fetcher = useCallback(async () => {
    if (!name) throw new Error('useFrappeGetDoc: name is required')
    const response = await backend.getDoc(doctype, name)
    return response.message as T
  }, [doctype, name])

  return useSWRLike<T>(key, fetcher)
}

// ---------------------------------------------------------------------------
// 4. useFrappeGetDocCount — accepts filters, args, options
// ---------------------------------------------------------------------------
export function useFrappeGetDocCount(
  doctype: string,
  filters?: any,
  args?: any,
  options?: any
): { data?: number; error?: any; isLoading: boolean } {
  const backend = getBackend()
  const key = `doccount:${doctype}:${JSON.stringify(filters || {})}`

  const fetcher = useCallback(async () => {
    const response = await backend.getDocList(doctype, { filters, fields: ['name'] })
    const docs = response.message as any[]
    return docs.length
  }, [doctype, JSON.stringify(filters)])

  const result = useSWRLike<number>(key, fetcher)
  return { data: result.data, error: result.error, isLoading: result.isLoading }
}

// ---------------------------------------------------------------------------
// 5. useFrappeCreateDoc — returns `loading` (not `isLoading`)
// ---------------------------------------------------------------------------
export function useFrappeCreateDoc<T = any>(): {
  create: (doctype: string, data: any) => Promise<T>
  data?: T
  error?: any
  loading: boolean
} {
  const backend = getBackend()
  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState<any>(undefined)
  const [loading, setLoading] = useState(false)

  const create = useCallback(async (doctype: string, recordData: any): Promise<T> => {
    setLoading(true)
    setError(undefined)
    try {
      const response = await backend.createDoc(doctype, recordData)
      setData(response.message)
      setLoading(false)
      return response.message as T
    } catch (err) {
      setError(err)
      setLoading(false)
      throw err
    }
  }, [])

  return { create, data, error, loading }
}

// ---------------------------------------------------------------------------
// 6. useFrappeUpdateDoc — returns `loading` (not `isLoading`)
// ---------------------------------------------------------------------------
export function useFrappeUpdateDoc<T = any>(): {
  update: (doctype: string, name: string, data: any) => Promise<T>
  data?: T
  error?: any
  loading: boolean
} {
  const backend = getBackend()
  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState<any>(undefined)
  const [loading, setLoading] = useState(false)

  const update = useCallback(async (doctype: string, name: string, doc: any): Promise<T> => {
    setLoading(true)
    setError(undefined)
    try {
      const response = await backend.updateDoc(doctype, name, doc)
      setData(response.message)
      setLoading(false)
      return response.message as T
    } catch (err) {
      setError(err)
      setLoading(false)
      throw err
    }
  }, [])

  return { update, data, error, loading }
}

// ---------------------------------------------------------------------------
// 7. useFrappeFileUpload — returns `loading` (not `isLoading`)
// ---------------------------------------------------------------------------
export function useFrappeFileUpload(): {
  upload: (file: File, options?: any) => Promise<any>
  progress: number
  error?: any
  loading: boolean
} {
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<any>(undefined)
  const [loading, setLoading] = useState(false)
  const fileStoreRef = useRef<Map<string, { file: File; url: string }>>(new Map())

  const upload = useCallback(async (
    file: File,
    options?: { isPrivate?: boolean; folder?: string; file_name?: string }
  ): Promise<{ file_url: string; name: string }> => {
    setLoading(true)
    setProgress(0)
    setError(undefined)

    try {
      const simulatedProgress = () => {
        let p = 0
        const interval = setInterval(() => {
          p += 10
          setProgress(Math.min(p, 90))
          if (p >= 90) clearInterval(interval)
        }, 50)
        return () => clearInterval(interval)
      }

      const stopProgress = simulatedProgress()

      await new Promise(resolve => setTimeout(resolve, 500))

      const fileName = options?.file_name || file.name
      const fileUrl = `local://${fileName}`

      fileStoreRef.current.set(fileName, { file, url: fileUrl })

      stopProgress()
      setProgress(100)

      const result = { file_url: fileUrl, name: fileName }
      setLoading(false)
      return result
    } catch (err) {
      setError(err)
      setLoading(false)
      throw err
    }
  }, [])

  return { upload, progress, error, loading }
}

// ---------------------------------------------------------------------------
// 8. useFrappeEventListener (retained for backward compat)
// ---------------------------------------------------------------------------
export function useFrappeEventListener(
  eventName: string,
  callback: (data: any) => void
): void {
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent
      callback(customEvent.detail)
    }

    window.addEventListener(eventName, handler)
    return () => window.removeEventListener(eventName, handler)
  }, [eventName, callback])
}

// ---------------------------------------------------------------------------
// 9. useFrappeDocumentEventListener
// ---------------------------------------------------------------------------
export function useFrappeDocumentEventListener(
  eventName: string,
  callback: (data: any) => void
): void {
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent
      callback(customEvent.detail)
    }

    document.addEventListener(eventName, handler)
    return () => document.removeEventListener(eventName, handler)
  }, [eventName, callback])
}

// ---------------------------------------------------------------------------
// 10. useFrappeGetDocList (retained)
// ---------------------------------------------------------------------------
export function useFrappeGetDocList<T = any>(
  doctype: string,
  options?: DocListOptions
): HookResult<T[]> {
  const backend = getBackend()
  const key = `doclist:${doctype}:${JSON.stringify(options || {})}`

  const fetcher = useCallback(async () => {
    const response = await backend.getDocList(doctype, options)
    return (response.message || []) as T[]
  }, [doctype, JSON.stringify(options)])

  return useSWRLike<T[]>(key, fetcher)
}

// ---------------------------------------------------------------------------
// 11. useSWRConfig — simple re-export with mutate
// ---------------------------------------------------------------------------
export function useSWRConfig(): {
  mutate: (key?: any, data?: any, options?: any) => Promise<any>
  cache: Map<any, any>
  [key: string]: any
} {
  const cacheRef = useRef<Map<any, any>>(new Map())

  const mutate = useCallback(async (key?: any, data?: any, _options?: any) => {
    if (key && data !== undefined) {
      cacheRef.current.set(key, data)
    }
    return Promise.resolve()
  }, [])

  return {
    mutate,
    cache: cacheRef.current,
  }
}

// Re-export types that consumers may import from 'frappe-react-sdk'
export type { SWROptions, HookResult }
