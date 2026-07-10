import Dexie, { type Entity, type Table } from 'dexie'

export interface MetadataRecord {
  key: string
  value: unknown
  updatedAt: string
}

export interface SyncQueueRecord {
  id?: number
  action: 'create' | 'update' | 'delete'
  doctype: string
  docname: string
  data: Record<string, unknown>
  status: 'pending' | 'syncing' | 'failed' | 'completed'
  createdAt: string
  updatedAt: string
  error?: string
}

export interface UserRecord {
  name: string
  email: string
  fullName: string
  roles: string[]
  enabled: boolean
  lastLogin?: string
  createdAt: string
  updatedAt: string
}

export interface SessionRecord {
  id: string
  userId: string
  token: string
  deviceInfo: string
  ip?: string
  expiresAt: string
  createdAt: string
  lastActiveAt: string
}

export interface PermissionRecord {
  id?: number
  role: string
  doctype: string
  permLevel: number
  read: boolean
  write: boolean
  create: boolean
  delete: boolean
  submit: boolean
  cancel: boolean
  amend: boolean
  report: boolean
  export: boolean
  import: boolean
  print: boolean
  email: boolean
}

export interface SchemaVersionRecord {
  version: number
  tableName: string
  description: string
  createdAt: string
}

export interface BankTransactionRecord {
  name: string
  creation: string
  modified: string
  owner: string
  modified_by: string
  docstatus: 0 | 1 | 2
  parent?: string
  parentfield?: string
  parenttype?: string
  idx?: number
  naming_series?: string
  date?: string
  is_rule_evaluated?: 0 | 1
  matched_transaction_rule?: string
  status?: string
  bank_account?: string
  company?: string
  amended_from?: string
  deposit?: number
  withdrawal?: number
  currency?: string
  description?: string
  reference_number?: string
  transaction_id?: string
  transaction_type?: string
  payment_entries?: Record<string, unknown>[]
  allocated_amount?: number
  unallocated_amount?: number
  party_type?: string
  party?: string
  bank_party_name?: string
  bank_party_account_number?: string
  bank_party_iban?: string
  included_fee?: number
  excluded_fee?: number
}

export interface BankAccountRecord {
  name: string
  creation: string
  modified: string
  owner: string
  modified_by: string
  docstatus: 0 | 1 | 2
  parent?: string
  parentfield?: string
  parenttype?: string
  idx?: number
  account_name: string
  account?: string
  bank: string
  account_type?: string
  account_subtype?: string
  disabled?: 0 | 1
  is_default?: 0 | 1
  is_company_account?: 0 | 1
  company?: string
  party_type?: string
  party?: string
  iban?: string
  branch_code?: string
  bank_account_no?: string
  statement_password?: string
  is_credit_card?: 0 | 1
  integration_id?: string
  last_integration_date?: string
  mask?: string
}

export interface BankTransactionRuleRecord {
  name: string
  creation: string
  modified: string
  owner: string
  modified_by: string
  docstatus: 0 | 1 | 2
  rule_name: string
  description?: string
  company?: string
  rule_type?: string
  conditions?: Record<string, unknown>[]
  accounts?: Record<string, unknown>[]
  is_active?: 0 | 1
}

export interface BankStatementImportLogRecord {
  name: string
  creation: string
  modified: string
  owner: string
  modified_by: string
  docstatus: 0 | 1 | 2
  bank_account?: string
  company?: string
  file_name?: string
  file_size?: number
  status?: string
  imported_count?: number
  skipped_count?: number
  error_count?: number
  column_mappings?: Record<string, unknown>[]
}

export interface JournalEntryRecord {
  name: string
  creation: string
  modified: string
  owner: string
  modified_by: string
  docstatus: 0 | 1 | 2
  voucher_type?: string
  company?: string
  posting_date?: string
  total_debit?: number
  total_credit?: number
  user_remark?: string
  accounts?: Record<string, unknown>[]
}

export interface PaymentEntryRecord {
  name: string
  creation: string
  modified: string
  owner: string
  modified_by: string
  docstatus: 0 | 1 | 2
  payment_type?: string
  company?: string
  posting_date?: string
  party_type?: string
  party?: string
  paid_amount?: number
  received_amount?: number
  source_exchange_rate?: number
  target_exchange_rate?: number
  reference_no?: string
  reference_date?: string
  bank_account?: string
  references?: Record<string, unknown>[]
  deductions?: Record<string, unknown>[]
}

interface BankingDatabase extends Dexie {
  _metadata: Table<MetadataRecord, string>
  _sync_queue: Table<SyncQueueRecord, number>
  _users: Table<UserRecord, string>
  _sessions: Table<SessionRecord, string>
  _permissions: Table<PermissionRecord, number>
  _schema_version: Table<SchemaVersionRecord, number>
  bank_transactions: Table<BankTransactionRecord, string>
  bank_accounts: Table<BankAccountRecord, string>
  bank_transaction_rules: Table<BankTransactionRuleRecord, string>
  bank_statement_import_logs: Table<BankStatementImportLogRecord, string>
  journal_entries: Table<JournalEntryRecord, string>
  payment_entries: Table<PaymentEntryRecord, string>
}

type TableName = keyof BankingDatabase & string

type FilterOperator = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'in' | 'like' | 'contains'

interface FilterCondition {
  field: string
  operator: FilterOperator
  value: unknown
}

interface QueryOptions {
  filters?: FilterCondition[]
  orderBy?: { field: string; direction?: 'asc' | 'desc' }
  limit?: number
  offset?: number
}

const DB_NAME = 'erpnext_banking'
const DB_VERSION = 1

const SCHEMA_VERSION = 1

const tableDefinitions: Record<string, string> = {
  _metadata: 'key',
  _sync_queue: '++id,action,doctype,docname,status,createdAt',
  _users: 'name,email',
  _sessions: 'id,userId,token,expiresAt',
  _permissions: '++id,role,doctype',
  _schema_version: '++version,tableName',
  bank_transactions: 'name,creation,modified,docstatus,company,bank_account,status,date',
  bank_accounts: 'name,creation,modified,docstatus,company,bank,account_name',
  bank_transaction_rules: 'name,creation,modified,docstatus,company,rule_name,is_active',
  bank_statement_import_logs: 'name,creation,modified,docstatus,company,bank_account,status',
  journal_entries: 'name,creation,modified,docstatus,company,voucher_type,posting_date',
  payment_entries: 'name,creation,modified,docstatus,company,party_type,party,posting_date',
}

class IndexedDBStore {
  private db: BankingDatabase | null = null
  private initialized = false

  async init(): Promise<void> {
    if (this.initialized && this.db) {
      return
    }

    this.db = new Dexie(DB_NAME) as BankingDatabase

    this.db.version(DB_VERSION).stores(tableDefinitions)

    await this.db.open()

    await this.ensureSchemaVersion()
    await this.updateMetadata('db_version', DB_VERSION)
    await this.updateMetadata('last_init', new Date().toISOString())

    this.initialized = true
  }

  private async ensureSchemaVersion(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const existing = await this.db._schema_version
      .where('tableName')
      .equals('main')
      .first()

    if (!existing) {
      await this.db._schema_version.add({
        version: SCHEMA_VERSION,
        tableName: 'main',
        description: 'Initial schema',
        createdAt: new Date().toISOString(),
      })
    }
  }

  private async updateMetadata(key: string, value: unknown): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    await this.db._metadata.put({
      key,
      value,
      updatedAt: new Date().toISOString(),
    })
  }

  getTable<T>(name: TableName): Table<T, unknown> {
    if (!this.db) throw new Error('Database not initialized')
    return this.db[name] as unknown as Table<T, unknown>
  }

  async put<T>(tableName: TableName, data: T): Promise<unknown> {
    if (!this.db) throw new Error('Database not initialized')

    const table = this.db[tableName] as Table<T & { name: string }, string>
    return await table.put(data as T & { name: string })
  }

  async get<T>(tableName: TableName, key: unknown): Promise<T | undefined> {
    if (!this.db) throw new Error('Database not initialized')

    const table = this.db[tableName] as Table<T, unknown>
    return await table.get(key)
  }

  async getAll<T>(tableName: TableName): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized')

    const table = this.db[tableName] as Table<T, unknown>
    return await table.toArray()
  }

  async query<T extends Record<string, unknown>>(
    tableName: TableName,
    options: QueryOptions = {},
  ): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized')

    const table = this.db[tableName] as Table<T, unknown>
    let collection = table.toCollection()

    if (options.filters && options.filters.length > 0) {
      collection = table.filter((item: T) => {
        return options.filters!.every((filter) => {
          const fieldValue = (item as Record<string, unknown>)[filter.field]
          return this.evaluateFilter(fieldValue, filter.operator, filter.value)
        })
      })
    }

    let results = await collection.toArray()

    if (options.orderBy) {
      const { field, direction = 'asc' } = options.orderBy
      results.sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[field] as string | number
        const bVal = (b as Record<string, unknown>)[field] as string | number
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        return direction === 'desc' ? -comparison : comparison
      })
    }

    if (options.offset) {
      results = results.slice(options.offset)
    }

    if (options.limit) {
      results = results.slice(0, options.limit)
    }

    return results
  }

  private evaluateFilter(
    fieldValue: unknown,
    operator: FilterOperator,
    filterValue: unknown,
  ): boolean {
    switch (operator) {
      case '=':
        return fieldValue === filterValue
      case '!=':
        return fieldValue !== filterValue
      case '>':
        return (fieldValue as number) > (filterValue as number)
      case '>=':
        return (fieldValue as number) >= (filterValue as number)
      case '<':
        return (fieldValue as number) < (filterValue as number)
      case '<=':
        return (fieldValue as number) <= (filterValue as number)
      case 'in':
        return Array.isArray(filterValue) && filterValue.includes(fieldValue)
      case 'like':
        return String(fieldValue).includes(String(filterValue))
      case 'contains':
        return String(fieldValue)
          .toLowerCase()
          .includes(String(filterValue).toLowerCase())
      default:
        return false
    }
  }

  async delete(tableName: TableName, key: unknown): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const table = this.db[tableName]
    await table.delete(key)
  }

  async clear(tableName: TableName): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const table = this.db[tableName]
    await table.clear()
  }

  async count(tableName: TableName): Promise<number> {
    if (!this.db) throw new Error('Database not initialized')

    const table = this.db[tableName]
    return await table.count()
  }

  async bulkPut<T>(tableName: TableName, items: T[]): Promise<unknown[]> {
    if (!this.db) throw new Error('Database not initialized')

    const table = this.db[tableName] as Table<T & { name: string }, string>
    return await table.bulkPut(items as (T & { name: string })[])
  }

  async bulkGet<T>(tableName: TableName, keys: unknown[]): Promise<(T | undefined)[]> {
    if (!this.db) throw new Error('Database not initialized')

    const table = this.db[tableName] as Table<T, unknown>
    return await table.bulkGet(keys)
  }

  async exportTable(tableName: TableName): Promise<{ table: string; data: unknown[] }> {
    const data = await this.getAll(tableName)
    return { table: tableName, data }
  }

  async importTable(
    tableName: TableName,
    data: unknown[],
    options?: { clearBefore?: boolean },
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    if (options?.clearBefore) {
      await this.clear(tableName)
    }

    const table = this.db[tableName]
    await table.bulkAdd(data as Entity<unknown, unknown>[])
  }

  async exportAll(): Promise<Record<string, { table: string; data: unknown[] }>> {
    if (!this.db) throw new Error('Database not initialized')

    const tables = Object.keys(tableDefinitions) as TableName[]
    const exportData: Record<string, { table: string; data: unknown[] }> = {}

    for (const tableName of tables) {
      exportData[tableName] = await this.exportTable(tableName)
    }

    return exportData
  }

  async importAll(
    data: Record<string, { table: string; data: unknown[] }>,
    options?: { clearBefore?: boolean },
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    await this.db.transaction(
      'rw',
      ...Object.keys(tableDefinitions).map(
        (name) => this.db![name as TableName] as Table<unknown, unknown>,
      ),
      async () => {
        for (const [tableName, tableData] of Object.entries(data)) {
          if (tableDefinitions[tableName]) {
            if (options?.clearBefore) {
              const table = this.db![tableName as TableName]
              await table.clear()
            }

            const table = this.db![tableName as TableName]
            await table.bulkAdd(tableData.data as Entity<unknown, unknown>[])
          }
        }
      },
    )
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close()
      this.db = null
      this.initialized = false
    }
  }

  async isReady(): Promise<boolean> {
    return this.initialized && this.db !== null
  }

  async getSchemaVersion(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized')

    const record = await this.db._schema_version
      .where('tableName')
      .equals('main')
      .first()

    return record?.version ?? 0
  }

  async addSyncItem(
    action: 'create' | 'update' | 'delete',
    doctype: string,
    docname: string,
    data: Record<string, unknown>,
  ): Promise<number> {
    if (!this.db) throw new Error('Database not initialized')

    return await this.db._sync_queue.add({
      action,
      doctype,
      docname,
      data,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }

  async getPendingSyncItems(): Promise<SyncQueueRecord[]> {
    if (!this.db) throw new Error('Database not initialized')

    return await this.db._sync_queue
      .where('status')
      .equals('pending')
      .toArray()
  }

  async updateSyncItemStatus(
    id: number,
    status: SyncQueueRecord['status'],
    error?: string,
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    await this.db._sync_queue.update(id, {
      status,
      updatedAt: new Date().toISOString(),
      error,
    })
  }
}

let storeInstance: IndexedDBStore | null = null

export async function getIndexedDBStore(): Promise<IndexedDBStore> {
  if (!storeInstance) {
    storeInstance = new IndexedDBStore()
    await storeInstance.init()
  }
  return storeInstance
}

export default IndexedDBStore
