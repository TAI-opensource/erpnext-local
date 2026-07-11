import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'

type SqlValue = number | string | Uint8Array | null

interface SQLiteEngineConfig {
  wasmPath?: string
  autoSave?: boolean
  autoSaveInterval?: number
  indexedDBName?: string
  indexedDBStoreName?: string
}

interface QueryResult {
  columns: string[]
  values: SqlValue[][]
}

interface TableSchema {
  [columnName: string]: string
}

type SqlParams = Record<string, SqlValue> | SqlValue[]

const DEFAULT_CONFIG: Required<SQLiteEngineConfig> = {
  wasmPath: '/wasm/',
  autoSave: true,
  autoSaveInterval: 30000,
  indexedDBName: 'erpnext_banking_db',
  indexedDBStoreName: 'sqlite_store',
}

class QueryCache {
  private cache = new Map<string, { result: any; timestamp: number }>()
  private maxSize = 1000

  get(key: string): any | null {
    const entry = this.cache.get(key)
    if (entry && Date.now() - entry.timestamp < 30000) {
      return entry.result
    }
    this.cache.delete(key)
    return null
  }

  set(key: string, result: any, ttl = 30000): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) this.cache.delete(firstKey)
    }
    this.cache.set(key, { result, timestamp: Date.now() })
  }

  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }

  clear(): void {
    this.cache.clear()
  }
}

export class SQLiteEngine {
  private db: Database | null = null
  private sql: SqlJsStatic | null = null
  private config: Required<SQLiteEngineConfig>
  private isInitialized = false
  private saveTimer: ReturnType<typeof setInterval> | null = null
  private savePending = false
  private statements = new Map<string, any>()
  private queryCache = new QueryCache()

  constructor(config: SQLiteEngineConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  async init(): Promise<void> {
    if (this.isInitialized) return

    this.sql = await initSqlJs({
      locateFile: (file: string) => `${this.config.wasmPath}${file}`,
    })

    await this.load()

    if (this.db === null) {
      this.db = new this.sql.Database()
    }

    await this.configurePragmas()

    this.isInitialized = true

    if (this.config.autoSave) {
      this.startAutoSave()
    }
  }

  private async configurePragmas(): Promise<void> {
    if (!this.db) return

    this.db.run('PRAGMA journal_mode = WAL')
    this.db.run('PRAGMA synchronous = NORMAL')
    this.db.run('PRAGMA cache_size = -64000')
    this.db.run('PRAGMA temp_store = MEMORY')
    this.db.run('PRAGMA mmap_size = 268435456')
    this.db.run('PRAGMA foreign_keys = ON')
    this.db.run('PRAGMA wal_autocheckpoint = 1000')
    this.db.run('PRAGMA busy_timeout = 5000')
  }

  private ensureInitialized(): void {
    if (!this.isInitialized || !this.db) {
      throw new Error('SQLiteEngine not initialized. Call init() first.')
    }
  }

  exec(sql: string, params?: SqlParams): QueryResult {
    this.ensureInitialized()

    const bindings = this.normalizeParams(params)
    const results = this.db!.exec(sql, bindings)

    if (results.length === 0) {
      return { columns: [], values: [] }
    }

    return {
      columns: results[0].columns,
      values: results[0].values,
    }
  }

  query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: SqlParams,
  ): T[] {
    this.ensureInitialized()

    const bindings = this.normalizeParams(params)
    const stmt = this.db!.prepare(sql)

    try {
      if (bindings.length > 0) {
        stmt.bind(bindings)
      }

      const results: T[] = []
      const columns = stmt.getColumnNames()

      while (stmt.step()) {
        const values = stmt.get()
        const row = {} as T
        for (let i = 0; i < columns.length; i++) {
          (row as Record<string, unknown>)[columns[i]] = values[i]
        }
        results.push(row)
      }

      return results
    } finally {
      stmt.free()
    }
  }

  async queryWithCache<T = Record<string, any>>(
    sql: string,
    params?: SqlParams,
    cacheKey?: string,
    ttl = 30000
  ): Promise<T[]> {
    if (cacheKey) {
      const cached = this.queryCache.get(cacheKey)
      if (cached) return cached as T[]
    }

    const result = this.query<T>(sql, params)

    if (cacheKey) {
      this.queryCache.set(cacheKey, result, ttl)
    }

    return result
  }

  execute(sql: string, params?: SqlParams): void {
    this.ensureInitialized()

    const bindings = this.normalizeParams(params)
    this.db!.run(sql, bindings)
    this.scheduleSave()
  }

  async transaction<T>(fn: () => T | Promise<T>): Promise<T> {
    this.ensureInitialized()

    this.db!.run('BEGIN TRANSACTION')

    try {
      const result = await fn()
      this.db!.run('COMMIT')
      this.scheduleSave()
      return result
    } catch (error) {
      this.db!.run('ROLLBACK')
      throw error
    }
  }

  async batchInsert(
    table: string,
    columns: string[],
    rows: SqlValue[][]
  ): Promise<void> {
    this.ensureInitialized()
    const placeholders = columns.map(() => '?').join(', ')
    const sql = `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`

    this.db!.run('BEGIN TRANSACTION')
    try {
      const stmt = this.db!.prepare(sql)
      for (const row of rows) {
        stmt.run(row)
      }
      stmt.free()
      this.db!.run('COMMIT')
      this.scheduleSave()
    } catch (error) {
      this.db!.run('ROLLBACK')
      throw error
    }
  }

  async batchUpdate(
    table: string,
    columns: string[],
    rows: SqlValue[][],
    keyColumn: string
  ): Promise<void> {
    this.ensureInitialized()
    const setClause = columns.map(col => `${col} = ?`).join(', ')
    const sql = `UPDATE ${table} SET ${setClause} WHERE ${keyColumn} = ?`

    this.db!.run('BEGIN TRANSACTION')
    try {
      const stmt = this.db!.prepare(sql)
      for (const row of rows) {
        const key = row[columns.length]
        const values = [...row.slice(0, columns.length), key]
        stmt.run(values)
      }
      stmt.free()
      this.db!.run('COMMIT')
      this.scheduleSave()
    } catch (error) {
      this.db!.run('ROLLBACK')
      throw error
    }
  }

  async batchDelete(
    table: string,
    keyColumn: string,
    keys: SqlValue[]
  ): Promise<void> {
    this.ensureInitialized()
    const placeholders = keys.map(() => '?').join(', ')
    const sql = `DELETE FROM ${table} WHERE ${keyColumn} IN (${placeholders})`

    this.db!.run('BEGIN TRANSACTION')
    try {
      this.db!.run(sql, keys)
      this.db!.run('COMMIT')
      this.scheduleSave()
    } catch (error) {
      this.db!.run('ROLLBACK')
      throw error
    }
  }

  async createFTSTable(
    tableName: string,
    contentTable: string,
    columns: string[]
  ): Promise<void> {
    this.ensureInitialized()
    const ftsColumns = columns.join(', ')
    this.db!.run(`
      CREATE VIRTUAL TABLE IF NOT EXISTS ${tableName}
      USING fts5(${ftsColumns}, content='${contentTable}')
    `)
  }

  async searchFTS(
    tableName: string,
    query: string,
    columns?: string[]
  ): Promise<any[]> {
    this.ensureInitialized()
    const selectColumns = columns ? columns.join(', ') : '*'
    return this.query(`
      SELECT ${selectColumns} FROM ${tableName}
      WHERE ${tableName} MATCH ?
      ORDER BY rank
    `, [query])
  }

  async vacuum(): Promise<void> {
    this.ensureInitialized()
    this.db!.run('VACUUM')
    this.scheduleSave()
  }

  async save(): Promise<void> {
    this.ensureInitialized()

    const data = this.db!.export()
    const buffer = new Uint8Array(data)

    await this.saveToIndexedDB(buffer)
  }

  async load(): Promise<void> {
    const buffer = await this.loadFromIndexedDB()

    if (buffer && this.sql) {
      this.db = new this.sql.Database(new Uint8Array(buffer))
    }
  }

  createTable(name: string, schema: TableSchema): void {
    this.ensureInitialized()

    const columns = Object.entries(schema)
      .map(([col, type]) => `"${col}" ${type}`)
      .join(', ')

    this.db!.run(`CREATE TABLE IF NOT EXISTS "${name}" (${columns})`)
    this.scheduleSave()
  }

  dropTable(name: string): void {
    this.ensureInitialized()
    this.db!.run(`DROP TABLE IF EXISTS "${name}"`)
    this.scheduleSave()
  }

  tableExists(name: string): boolean {
    this.ensureInitialized()

    const result = this.db!.exec(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='${name}'`,
    )

    return result.length > 0 && result[0].values.length > 0
  }

  getDatabase(): Database {
    this.ensureInitialized()
    return this.db!
  }

  private normalizeParams(params?: SqlParams): SqlValue[] {
    if (!params) return []

    if (Array.isArray(params)) {
      return params
    }

    return Object.values(params)
  }

  private startAutoSave(): void {
    if (this.saveTimer) return

    this.saveTimer = setInterval(async () => {
      if (this.savePending) {
        await this.save()
        this.savePending = false
      }
    }, this.config.autoSaveInterval)
  }

  private scheduleSave(): void {
    if (this.config.autoSave) {
      this.savePending = true
    }
  }

  private async saveToIndexedDB(data: Uint8Array): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.indexedDBName, 1)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.config.indexedDBStoreName)) {
          db.createObjectStore(this.config.indexedDBStoreName)
        }
      }

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const tx = db.transaction(this.config.indexedDBStoreName, 'readwrite')
        const store = tx.objectStore(this.config.indexedDBStoreName)
        store.put(data, 'database')

        tx.oncomplete = () => {
          db.close()
          resolve()
        }

        tx.onerror = () => {
          db.close()
          reject(new Error('Failed to save to IndexedDB'))
        }
      }

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'))
      }
    })
  }

  private async loadFromIndexedDB(): Promise<Uint8Array | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.indexedDBName, 1)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.config.indexedDBStoreName)) {
          db.createObjectStore(this.config.indexedDBStoreName)
        }
      }

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const tx = db.transaction(this.config.indexedDBStoreName, 'readonly')
        const store = tx.objectStore(this.config.indexedDBStoreName)
        const getRequest = store.get('database')

        getRequest.onsuccess = () => {
          db.close()
          resolve(getRequest.result || null)
        }

        getRequest.onerror = () => {
          db.close()
          reject(new Error('Failed to load from IndexedDB'))
        }
      }

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'))
      }
    })
  }

  async destroy(): Promise<void> {
    for (const stmt of this.statements.values()) {
      stmt.free()
    }
    this.statements.clear()

    if (this.saveTimer) {
      clearInterval(this.saveTimer)
      this.saveTimer = null
    }

    if (this.db) {
      await this.save()
      this.db.close()
      this.db = null
    }

    this.isInitialized = false
  }
}

export type {
  SQLiteEngineConfig,
  QueryResult,
  TableSchema,
  SqlParams,
}
