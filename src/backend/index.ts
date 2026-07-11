// ============================================================================
// ERPNext Banking - Local Backend Entry Point
// ============================================================================

// ---------------------------------------------------------------------------
// Module Imports & Re-exports
// ---------------------------------------------------------------------------

import { SQLiteEngine } from './sqlite-engine'
import type { SQLiteEngineConfig, QueryResult, TableSchema as SQLiteTableSchema, SqlParams } from './sqlite-engine'

import { IndexedDBStore, getIndexedDBStore } from './indexeddb-store'
import type {
  MetadataRecord,
  SyncQueueRecord,
  UserRecord,
  SessionRecord,
  PermissionRecord,
  SchemaVersionRecord,
  BankTransactionRecord,
  BankAccountRecord,
  BankTransactionRuleRecord,
  BankStatementImportLogRecord,
  JournalEntryRecord,
  PaymentEntryRecord,
} from './indexeddb-store'

import { LocalAuth } from './auth'
import type { User, Role, Permission, Session } from './auth'

import { DatabaseManager } from './database-manager'
import type {
  DatabaseStatus,
  DatabaseStats,
  DatabaseBackup,
  DatabaseEvent,
  DatabaseEventHandler,
  TableSchema as DBTableSchema,
  ColumnSchema,
} from './database-manager'

import { apiHandler } from './api-handler'
import type {
  FrappeResponse,
  FrappeErrorResponse,
  CallOptions,
  DocFilter,
  DocListOptions,
  QueryReportFilters,
  QueryReportResponse,
  CachedResponse,
  InterceptorContext,
  PermissionCheck,
} from './api-handler'
import { realHandlers, hasRealHandler, getRealHandler } from './api-handlers-real'

import { SyncManager } from './sync/sync-manager'
import type {
  SyncOperation,
  SyncConflict,
  SyncStatus,
  SyncProgress,
  SyncConfig,
  SyncEvents,
  ExportData,
  SyncOperationType,
  SyncOperationStatus,
  ConflictResolution,
} from './sync/sync-manager'

import { createAllSchemas, getSchemaVersion, SCHEMA_VERSION } from './schemas'
import { createCoreSchemas } from './schemas/core-schemas'
import { createExtendedSchemas } from './schemas/extended-schemas'

import {
  BaseController,
  type BaseDocument,
  type DocumentWithItems,
  type TaxRow,
  type DocumentWithTaxes,
  type PaymentRow,
  type DocumentWithPayments,
  type FilterCondition,
  type ListOptions,
  type PermissionType,
} from './controllers/base-controller'

// ---------------------------------------------------------------------------
// Re-export all modules
// ---------------------------------------------------------------------------

export {
  SQLiteEngine,
  IndexedDBStore,
  getIndexedDBStore,
  LocalAuth,
  DatabaseManager,
  apiHandler,
  SyncManager,
  createAllSchemas,
  getSchemaVersion,
  SCHEMA_VERSION,
  createCoreSchemas,
  createExtendedSchemas,
  BaseController,
}

export type {
  SQLiteEngineConfig,
  QueryResult,
  SQLiteTableSchema,
  SqlParams,
  MetadataRecord,
  SyncQueueRecord,
  UserRecord,
  SessionRecord,
  PermissionRecord,
  SchemaVersionRecord,
  BankTransactionRecord,
  BankAccountRecord,
  BankTransactionRuleRecord,
  BankStatementImportLogRecord,
  JournalEntryRecord,
  PaymentEntryRecord,
  User,
  Role,
  Permission,
  Session,
  DatabaseStatus,
  DatabaseStats,
  DatabaseBackup,
  DatabaseEvent,
  DatabaseEventHandler,
  DBTableSchema,
  ColumnSchema,
  FrappeResponse,
  FrappeErrorResponse,
  CallOptions,
  DocFilter,
  DocListOptions,
  QueryReportFilters,
  QueryReportResponse,
  CachedResponse,
  InterceptorContext,
  PermissionCheck,
  SyncOperation,
  SyncConflict,
  SyncStatus,
  SyncProgress,
  SyncConfig,
  SyncEvents,
  ExportData,
  SyncOperationType,
  SyncOperationStatus,
  ConflictResolution,
  BaseDocument,
  DocumentWithItems,
  TaxRow,
  DocumentWithTaxes,
  PaymentRow,
  DocumentWithPayments,
  FilterCondition,
  ListOptions,
  PermissionType,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BackendConfig {
  sqlite?: SQLiteEngineConfig
  sync?: Partial<SyncConfig>
}

export interface FrappeBootUser {
  name: string
  email: string
  full_name: string
  roles: string[]
  can_read: string[]
  can_write: string[]
  can_create: string[]
  can_delete: string[]
  can_cancel: string[]
}

export interface FrappeBootDocs {
  [doctype: string]: Record<string, unknown>
}

export interface FrappeBootSysdefaults {
  currency: string
  country: string
  language: string
  time_zone: string
  date_format: string
  time_format: string
  number_format: string
  first_day_of_the_week: string
  backup_limit: number
}

export interface FrappeBootMessages {
  [key: string]: string
}

export interface FrappeBoot {
  user: FrappeBootUser | null
  docs: FrappeBootDocs
  sysdefaults: FrappeBootSysdefaults
  __messages: FrappeBootMessages
}

// ---------------------------------------------------------------------------
// Frappe Window Extension
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    frappe: {
      boot: FrappeBoot
      call: (method: string, args?: Record<string, unknown>, options?: CallOptions) => Promise<FrappeResponse>
      db: {
        get_value: (doctype: string, filters: Record<string, unknown> | string, fieldname?: string) => Promise<FrappeResponse>
        set_value: (doctype: string, name: string, fieldname: string, value: unknown) => Promise<FrappeResponse>
        get_single_value: (doctype: string, fieldname: string) => Promise<FrappeResponse>
        get_link_options: (doctype: string, filters?: Record<string, unknown>) => Promise<FrappeResponse>
      }
    }
  }
}

// ---------------------------------------------------------------------------
// LocalBackend Singleton
// ---------------------------------------------------------------------------

class LocalBackend {
  private _initialized = false
  private _db: DatabaseManager | null = null
  private _indexedDb: IndexedDBStore | null = null
  private _sqlite: SQLiteEngine | null = null
  private _auth: LocalAuth = new LocalAuth()
  private _api = apiHandler
  private _sync: SyncManager | null = null
  private _config: BackendConfig = {}

  get db(): DatabaseManager {
    if (!this._db) throw new Error('DatabaseManager not initialized. Call init() first.')
    return this._db
  }

  get indexedDb(): IndexedDBStore {
    if (!this._indexedDb) throw new Error('IndexedDBStore not initialized. Call init() first.')
    return this._indexedDb
  }

  get sqlite(): SQLiteEngine {
    if (!this._sqlite) throw new Error('SQLiteEngine not used. Use .db (DatabaseManager) instead.')
    return this._sqlite
  }

  get auth(): LocalAuth {
    return this._auth
  }

  get api() {
    return this._api
  }

  get sync(): SyncManager | null {
    return this._sync
  }

  get initialized(): boolean {
    return this._initialized
  }

  async init(config?: BackendConfig): Promise<void> {
    if (this._initialized) return

    this._config = config ?? {}

    // 1. DatabaseManager (wraps SQLite WASM + IndexedDB + schemas + seed data)
    this._db = DatabaseManager.getInstance()
    await this._db.init()

    // 2. IndexedDB store (for meta operations)
    this._indexedDb = await getIndexedDBStore()

    // 3. Auth (needs SQLite/IndexedDB for user tables)
    await this._auth.init()

    // 4. SyncManager (optional)
    if (this._config.sync) {
      this._sync = new SyncManager()
    }

    // 5. Setup Frappe polyfills
    this._setupFrappePolyfills()
    this._setupBootData()

    // 6. Refresh permissions after boot data is loaded
    // @ts-expect-error _api is private
    this._api?.permissions?.refresh()

    this._initialized = true
  }

  async destroy(): Promise<void> {
    this._sync = null
    if (this._indexedDb) {
      await this._indexedDb.close()
      this._indexedDb = null
    }
    if (this._db) {
      DatabaseManager.resetInstance()
      this._db = null
    }
    this._initialized = false
  }

  // -------------------------------------------------------------------------
  // Convenience Delegates — API
  // -------------------------------------------------------------------------

  async call(method: string, args?: Record<string, unknown>, options?: CallOptions): Promise<FrappeResponse> {
    return this._api.call(method, args, options)
  }

  async getDoc(doctype: string, name: string): Promise<FrappeResponse> {
    return this._api.getDoc(doctype, name)
  }

  async createDoc(doctype: string, data: Record<string, unknown>): Promise<FrappeResponse> {
    return this._api.createDoc(doctype, data)
  }

  async updateDoc(doctype: string, name: string, data: Record<string, unknown>): Promise<FrappeResponse> {
    return this._api.updateDoc(doctype, name, data)
  }

  async deleteDoc(doctype: string, name: string): Promise<FrappeResponse> {
    return this._api.deleteDoc(doctype, name)
  }

  async getDocList(doctype: string, options?: DocListOptions): Promise<FrappeResponse> {
    return this._api.getDocList(doctype, options)
  }

  async setValue(doctype: string, name: string, fieldname: string, value: unknown): Promise<FrappeResponse> {
    return this._api.setValue(doctype, name, fieldname, value)
  }

  async getSingleValue(doctype: string, fieldname: string): Promise<FrappeResponse> {
    return this._api.getSingleValue(doctype, fieldname)
  }

  // -------------------------------------------------------------------------
  // Convenience Delegates — Auth
  // -------------------------------------------------------------------------

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    return this._auth.login(email, password)
  }

  async logout(): Promise<void> {
    return this._auth.logout()
  }

  getCurrentUser(): User | null {
    return this._auth.getCurrentUser()
  }

  isAuthenticated(): boolean {
    return this._auth.isAuthenticated()
  }

  async hasPermission(doctype: string, action: keyof Omit<Permission, 'doctype'>): Promise<boolean> {
    return this._auth.hasPermission(doctype, action)
  }

  getUserRoles(): string[] {
    return this._auth.getUserRoles()
  }

  // -------------------------------------------------------------------------
  // Frappe Polyfills
  // -------------------------------------------------------------------------

  private _setupFrappePolyfills(): void {
    if (typeof window === 'undefined') return

    const backend = this

    if (!window.frappe) {
      window.frappe = {} as any
    }
    if (!(window as any).locals) {
      (window as any).locals = {}
    }
    if (!window.frappe.db) {
      window.frappe.db = {} as any
    }

    window.frappe.call = async (method: string, args?: Record<string, unknown>, options?: CallOptions): Promise<FrappeResponse> => {
      return backend.call(method, args, options)
    }

    window.frappe.db.get_value = async (doctype: string, filters: Record<string, unknown> | string, fieldname?: string): Promise<FrappeResponse> => {
      const filterObj = typeof filters === 'string' ? { name: filters } : filters
      const name = (filterObj.name ?? filterObj.name ?? Object.values(filterObj)[0]) as string
      return backend.getDoc(doctype, name)
    }

    window.frappe.db.set_value = async (doctype: string, name: string, fieldname: string, value: unknown): Promise<FrappeResponse> => {
      return backend.setValue(doctype, name, fieldname, value)
    }

    window.frappe.db.get_single_value = async (doctype: string, fieldname: string): Promise<FrappeResponse> => {
      return backend.getSingleValue(doctype, fieldname)
    }

    window.frappe.db.get_link_options = async (doctype: string, filters?: Record<string, unknown>): Promise<FrappeResponse> => {
      return backend.getDocList(doctype, { filters })
    }
  }

  // -------------------------------------------------------------------------
  // Boot Data
  // -------------------------------------------------------------------------

  private _setupBootData(): void {
    if (typeof window === 'undefined') return

    const user = this._auth.getCurrentUser()

    const bootUser: FrappeBootUser | null = user ? {
      name: user.name,
      email: user.email,
      full_name: user.full_name,
      roles: user.roles,
      can_read: ['*'],
      can_write: ['*'],
      can_create: ['*'],
      can_delete: ['*'],
      can_cancel: ['*'],
    } : null

    window.frappe.boot = {
      user: bootUser,
      docs: [
        { doctype: ':Company', name: '_Test Company', company_name: '_Test Company' },
      ] as unknown as FrappeBootDocs,
      sysdefaults: {
        currency: 'BRL',
        country: 'Brazil',
        language: 'pt-BR',
        time_zone: 'America/Sao_Paulo',
        date_format: 'dd-mm-yyyy',
        time_format: 'HH:mm:ss',
        number_format: '#,###.##',
        first_day_of_the_week: 'Monday',
        backup_limit: 3,
      },
      __messages: {},
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let backendInstance: LocalBackend | null = null

// ---------------------------------------------------------------------------
// Global Convenience Functions
// ---------------------------------------------------------------------------

export async function initBackend(config?: BackendConfig): Promise<LocalBackend> {
  if (backendInstance) return backendInstance

  backendInstance = new LocalBackend()
  await backendInstance.init(config)
  return backendInstance
}

export function getBackend(): LocalBackend {
  if (!backendInstance) {
    throw new Error('Backend not initialized. Call initBackend() first.')
  }
  return backendInstance
}

export function resetBackend(): void {
  if (backendInstance) {
    backendInstance.destroy()
    backendInstance = null
  }
}

// ---------------------------------------------------------------------------
// Default Export
// ---------------------------------------------------------------------------

const LocalBackendClass = LocalBackend
export default LocalBackendClass
