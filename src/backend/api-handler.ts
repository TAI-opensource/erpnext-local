// ============================================================================
// API Handler - Replaces all frappe.call() calls with local TypeScript
// ============================================================================

import { getRealHandler } from './api-handlers-real'

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface FrappeResponse<T = unknown> {
    message: T
    exc: string | null
    _server_messages: string[] | null
}

export interface FrappeErrorResponse {
    message: string
    exc: string
    _server_messages: string[]
    _error_message?: string
    exception?: string
}

export interface CallOptions {
    freeze?: boolean
    freeze_message?: string
    async?: boolean
    headers?: Record<string, string>
    callback?: (response: FrappeResponse) => void
    error?: (error: FrappeErrorResponse) => void
    onestart?: () => void
    always?: () => void
}

export interface DocFilter {
    fieldname: string
    operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'like' | 'not like' | 'in' | 'not in' | 'between'
    value: unknown
}

export interface DocListOptions {
    filters?: DocFilter[] | Record<string, unknown>
    fields?: string[]
    limit?: number
    start?: number
    order_by?: string
    group_by?: string
}

export interface QueryReportFilters {
    [key: string]: unknown
}

export interface QueryReportResponse {
    message: {
        result: unknown[]
        columns: Array<{ label: string; fieldname: string; fieldtype: string; width?: number }>
        chart?: unknown
        report_summary?: unknown
    }
}

export interface CachedResponse {
    data: FrappeResponse
    timestamp: number
    ttl: number
}

export interface InterceptorContext {
    method: string
    args: Record<string, unknown>
    options?: CallOptions
    timestamp: number
}

export interface PermissionCheck {
    doctype: string
    permission: 'read' | 'write' | 'create' | 'delete' | 'cancel' | 'submit'
}

// ============================================================================
// Cache Manager (IndexedDB)
// ============================================================================

class CacheManager {
    private dbName = 'erpnext-api-cache'
    private storeName = 'responses'
    private db: IDBDatabase | null = null
    private memoryCache = new Map<string, CachedResponse>()
    private defaultTTL = 5 * 60 * 1000 // 5 minutes

    constructor() {
        this.initDB()
    }

    private initDB(): void {
        if (typeof indexedDB === 'undefined') return

        const request = indexedDB.open(this.dbName, 1)

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result
            if (!db.objectStoreNames.contains(this.storeName)) {
                db.createObjectStore(this.storeName, { keyPath: 'key' })
            }
        }

        request.onsuccess = (event) => {
            this.db = (event.target as IDBOpenDBRequest).result
            this.loadMemoryCache()
        }

        request.onerror = () => {
            console.warn('Failed to initialize IndexedDB cache, using memory-only cache')
        }
    }

    private async loadMemoryCache(): Promise<void> {
        if (!this.db) return

        return new Promise((resolve) => {
            const transaction = this.db!.transaction(this.storeName, 'readonly')
            const store = transaction.objectStore(this.storeName)
            const request = store.getAll()

            request.onsuccess = () => {
                const items = request.result as Array<{ key: string; data: CachedResponse }>
                const now = Date.now()
                items.forEach((item) => {
                    if (item.data.timestamp + item.data.ttl > now) {
                        this.memoryCache.set(item.key, item.data)
                    }
                })
                resolve()
            }

            request.onerror = () => resolve()
        })
    }

    generateKey(method: string, args: Record<string, unknown>): string {
        return `${method}:${JSON.stringify(args, Object.keys(args).sort())}`
    }

    get(method: string, args: Record<string, unknown>): FrappeResponse | null {
        const key = this.generateKey(method, args)

        const cached = this.memoryCache.get(key)
        if (cached && cached.timestamp + cached.ttl > Date.now()) {
            return cached.data
        }

        if (cached) {
            this.memoryCache.delete(key)
        }

        return null
    }

    set(method: string, args: Record<string, unknown>, data: FrappeResponse, ttl?: number): void {
        const key = this.generateKey(method, args)
        const response: CachedResponse = {
            data,
            timestamp: Date.now(),
            ttl: ttl ?? this.defaultTTL
        }

        this.memoryCache.set(key, response)
        this.persistToIDB(key, response)
    }

    private persistToIDB(key: string, data: CachedResponse): void {
        if (!this.db) return

        try {
            const transaction = this.db.transaction(this.storeName, 'readwrite')
            const store = transaction.objectStore(this.storeName)
            store.put({ key, data })
        } catch (e) {
            console.warn('Failed to persist cache to IndexedDB:', e)
        }
    }

    invalidate(doctype: string): void {
        const keysToDelete: string[] = []
        this.memoryCache.forEach((_, key) => {
            if (key.includes(doctype)) {
                keysToDelete.push(key)
            }
        })
        keysToDelete.forEach((key) => this.memoryCache.delete(key))
        this.clearIDBByDoctype(doctype)
    }

    invalidateAll(): void {
        this.memoryCache.clear()
        if (this.db) {
            const transaction = this.db.transaction(this.storeName, 'readwrite')
            const store = transaction.objectStore(this.storeName)
            store.clear()
        }
    }

    private clearIDBByDoctype(doctype: string): void {
        if (!this.db) return

        try {
            const transaction = this.db.transaction(this.storeName, 'readwrite')
            const store = transaction.objectStore(this.storeName)
            const request = store.getAllKeys()

            request.onsuccess = () => {
                const keys = request.result as string[]
                keys.forEach((key) => {
                    if (key.includes(doctype)) {
                        store.delete(key)
                    }
                })
            }
        } catch (e) {
            console.warn('Failed to clear IndexedDB cache:', e)
        }
    }

    setTTL(ttl: number): void {
        this.defaultTTL = ttl
    }
}

// ============================================================================
// Permission Checker
// ============================================================================

class PermissionChecker {
    private userPermissions: Record<string, string[]> = {}
    private userRoles: string[] = []

    constructor() {
        this.loadPermissions()
    }

    private loadPermissions(): void {
        const frappe = window as unknown as { frappe?: { boot?: { user?: { can_read?: string[]; can_write?: string[]; can_create?: string[]; can_delete?: string[]; can_cancel?: string[]; roles?: string[] } } } }
        const user = frappe?.frappe?.boot?.user
        if (user) {
            this.userPermissions = {
                read: user.can_read ?? [],
                write: user.can_write ?? [],
                create: user.can_create ?? [],
                delete: user.can_delete ?? [],
                cancel: user.can_cancel ?? []
            }
            this.userRoles = user.roles ?? []
        }
    }

    check(doctype: string, permission: string): boolean {
        const perms = this.userPermissions[permission]
        if (!perms) return false
        if (perms.includes('*')) return true
        return perms.includes(doctype)
    }

    hasRole(role: string): boolean {
        return this.userRoles.includes(role)
    }

    refresh(): void {
        this.loadPermissions()
    }
}

// ============================================================================
// Interceptor Manager
// ============================================================================

type InterceptorFn = (ctx: InterceptorContext) => InterceptorContext | Promise<InterceptorContext>
type ErrorInterceptorFn = (error: FrappeErrorResponse, ctx: InterceptorContext) => FrappeErrorResponse | Promise<FrappeErrorResponse>

class InterceptorManager {
    private beforeCall: InterceptorFn[] = []
    private afterCall: InterceptorFn[] = []
    private onError: ErrorInterceptorFn[] = []

    addBeforeCall(fn: InterceptorFn): () => void {
        this.beforeCall.push(fn)
        return () => {
            this.beforeCall = this.beforeCall.filter((f) => f !== fn)
        }
    }

    addAfterCall(fn: InterceptorFn): () => void {
        this.afterCall.push(fn)
        return () => {
            this.afterCall = this.afterCall.filter((f) => f !== fn)
        }
    }

    addOnError(fn: ErrorInterceptorFn): () => void {
        this.onError.push(fn)
        return () => {
            this.onError = this.onError.filter((f) => f !== fn)
        }
    }

    async runBeforeCall(ctx: InterceptorContext): Promise<InterceptorContext> {
        let currentCtx = ctx
        for (const fn of this.beforeCall) {
            currentCtx = await fn(currentCtx)
        }
        return currentCtx
    }

    async runAfterCall(ctx: InterceptorContext): Promise<InterceptorContext> {
        let currentCtx = ctx
        for (const fn of this.afterCall) {
            currentCtx = await fn(currentCtx)
        }
        return currentCtx
    }

    async runOnError(error: FrappeErrorResponse, ctx: InterceptorContext): Promise<FrappeErrorResponse> {
        let currentError = error
        for (const fn of this.onError) {
            currentError = await fn(currentError, ctx)
        }
        return currentError
    }
}

// ============================================================================
// ERPNext Method Handlers
// ============================================================================

const bankReconciliationHandlers: Record<string, (...args: Record<string, unknown>) => unknown> = {
    'get_bank_transactions': async (args) => {
        const { bank_account, from_date, to_date, all_transactions } = args
        // Placeholder: In production, query local DB
        return {
            message: [] // Would be populated from local SQLite
        }
    },

    'get_linked_payments': async (args) => {
        const { bank_transaction_name, document_types, from_date, to_date, filter_by_reference_date } = args
        return {
            message: [] // Would be populated from local SQLite
        }
    },

    'reconcile_vouchers': async (args) => {
        const { bank_transaction_name, vouchers } = args
        return {
            message: {} // Would handle reconciliation locally
        }
    },

    'get_account_balance': async (args) => {
        const { bank_account, company, till_date } = args
        return {
            message: 0
        }
    },

    'get_older_unreconciled_transactions': async (args) => {
        const { bank_account, from_date } = args
        return {
            message: { count: 0, oldest_date: '' }
        }
    },

    'get_list': async (args) => {
        const { company } = args
        return {
            message: [] // Would be populated from local SQLite
        }
    },

    'get_closing_balance_as_per_statement': async (args) => {
        const { bank_account, date } = args
        return {
            message: { balance: 0, date: '' }
        }
    }
}

const itemDetailHandlers: Record<string, (...args: Record<string, unknown>) => unknown> = {
    'get_item_details': async (args) => {
        const { item_code, warehouse, currency } = args
        return {
            message: {
                item_code,
                item_name: '',
                item_group: '',
                description: '',
                stock_uom: 'Nos',
                conversion_factor: 1,
                price_list_rate: 0,
                price_list_currency: currency || 'USD',
                currency: currency || 'USD',
                warehouse: warehouse || '',
                actual_qty: 0,
                projected_qty: 0,
                reserved_qty: 0,
                ordered_qty: 0
            }
        }
    },

    'get_price_list_rate': async (args) => {
        const { item_code, price_list, currency } = args
        return {
            message: {
                price_list_rate: 0,
                currency: currency || 'USD'
            }
        }
    },

    'get_uom_conversion_factor': async (args) => {
        const { from_uom, to_uom, item_code } = args
        return {
            message: {
                conversion_factor: 1
            }
        }
    }
}

const partyHandlers: Record<string, (...args: Record<string, unknown>) => unknown> = {
    'get_party_account': async (args) => {
        const { party_type, party, company } = args
        return {
            message: '' // Would return account from local DB
        }
    },

    'get_party_balance': async (args) => {
        const { party_type, party, company } = args
        return {
            message: {
                balance: 0,
                currency: 'USD'
            }
        }
    },

    'get_party_details': async (args) => {
        const { party_type, party, company } = args
        return {
            message: {
                party_name: '',
                party_type: party_type || '',
                territory: '',
                default_currency: 'USD',
                default_bank_account: '',
                default_income_account: '',
                default_expense_account: '',
                default_cost_center: '',
                primary_address: '',
                primary_contact: ''
            }
        }
    },

    'set_taxes': async (args) => {
        const { party_type, party, company, tax_category, posting_date } = args
        return {
            message: {
                taxes: [],
                tax_template: ''
            }
        }
    }
}

const controllerHandlers: Record<string, (...args: Record<string, unknown>) => unknown> = {
    'get_gl_entries': async (args) => {
        const { doctype, docname } = args
        return {
            message: []
        }
    },

    'make_return_doc': async (args) => {
        const { source_name, doctype } = args
        return {
            message: {}
        }
    },

    'get_stock_balance': async (args) => {
        const { item_code, warehouse, posting_date, with_valuation_rate } = args
        return {
            message: {
                qty: 0,
                valuation_rate: 0,
                stock_value: 0
            }
        }
    }
}

const frappeClientHandlers: Record<string, (...args: Record<string, unknown>) => unknown> = {
    'get': async (args) => {
        const { doctype, filters, fields, limit, start, order_by } = args
        return {
            message: [] // Would query local SQLite
        }
    },

    'get_count': async (args) => {
        const { doctype, filters } = args
        return {
            message: 0
        }
    },

    'get_value': async (args) => {
        const { doctype, filters, fieldname } = args
        return {
            message: null
        }
    },

    'insert': async (args) => {
        const { doc } = args
        return {
            message: doc
        }
    },

    'save': async (args) => {
        const { doctype, name, doc } = args
        return {
            message: { ...doc as object, name }
        }
    },

    'delete': async (args) => {
        const { doctype, name } = args
        return {
            message: 'ok'
        }
    },

    'submit': async (args) => {
        const { doc } = args
        return {
            message: { ...(doc as object), docstatus: 1 }
        }
    },

    'cancel': async (args) => {
        const { doctype, name } = args
        return {
            message: 'ok'
        }
    },

    'set_value': async (args) => {
        const { doctype, name, fieldname, value } = args
        return {
            message: { doctype, name, fieldname, value }
        }
    },

    'rename_doc': async (args) => {
        const { doctype, old_name, new_name } = args
        return {
            message: new_name
        }
    }
}

const reportHandlers: Record<string, (...args: Record<string, unknown>) => unknown> = {
    'run': async (args) => {
        const { report_name, filters } = args
        return {
            message: {
                result: [],
                columns: [],
                chart: null,
                report_summary: []
            }
        }
    },

    'get_script': async (args) => {
        const { report_name } = args
        return {
            message: {
                script: '',
                html: '',
                js: '',
                filters: []
            }
        }
    }
}

// ============================================================================
// Main API Handler Class
// ============================================================================

class APIHandlerClass {
    private cache: CacheManager
    private permissions: PermissionChecker
    private interceptors: InterceptorManager
    private methodHandlers: Map<string, (...args: Record<string, unknown>) => Promise<FrappeResponse>>

    constructor() {
        this.cache = new CacheManager()
        this.permissions = new PermissionChecker()
        this.interceptors = new InterceptorManager()
        this.methodHandlers = new Map()

        this.registerAllHandlers()
        this.setupDefaultInterceptors()
    }

    private registerAllHandlers(): void {
        // ERPNext Banking handlers
        Object.entries(bankReconciliationHandlers).forEach(([method, handler]) => {
            this.registerHandler(`erpnext.accounts.doctype.bank_reconciliation_tool.bank_reconciliation_tool.${method}`, handler)
        })

        // Item detail handlers
        Object.entries(itemDetailHandlers).forEach(([method, handler]) => {
            this.registerHandler(`erpnext.stock.get_item_details.${method}`, handler)
        })

        // Party handlers
        Object.entries(partyHandlers).forEach(([method, handler]) => {
            this.registerHandler(`erpnext.accounts.party.${method}`, handler)
        })

        // Controller handlers
        Object.entries(controllerHandlers).forEach(([method, handler]) => {
            this.registerHandler(`erpnext.controllers.${method}`, handler)
        })

        // Frappe client handlers
        Object.entries(frappeClientHandlers).forEach(([method, handler]) => {
            this.registerHandler(`frappe.client.${method}`, handler)
        })

        // Report handlers
        Object.entries(reportHandlers).forEach(([method, handler]) => {
            this.registerHandler(`frappe.desk.query_report.${method}`, handler)
        })
    }

    private setupDefaultInterceptors(): void {
        // Log all calls in development
        if (import.meta.env.DEV) {
            this.interceptors.addBeforeCall(async (ctx) => {
                console.log(`[API] ${ctx.method}`, ctx.args)
                return ctx
            })

            this.interceptors.addAfterCall(async (ctx) => {
                console.log(`[API] ${ctx.method} completed`, ctx.timestamp)
                return ctx
            })
        }
    }

    registerHandler(method: string, handler: (args: Record<string, unknown>) => Promise<FrappeResponse>): void {
        this.methodHandlers.set(method, handler)
    }

    unregisterHandler(method: string): void {
        this.methodHandlers.delete(method)
    }

    // ==========================================================================
    // Core API Methods
    // ==========================================================================

    async call(method: string, args: Record<string, unknown> = {}, options: CallOptions = {}): Promise<FrappeResponse> {
        const ctx: InterceptorContext = {
            method,
            args,
            options,
            timestamp: Date.now()
        }

        try {
            // Run before call interceptors
            const processedCtx = await this.interceptors.runBeforeCall(ctx)

            // Check cache for GET-like operations
            if (this.isCacheable(method)) {
                const cached = this.cache.get(method, processedCtx.args)
                if (cached) {
                    return cached
                }
            }

            // Check permissions
            this.checkPermissions(processedCtx)

            // Get handler - prioritize real handlers over stubs
            let handler: ((args: Record<string, unknown>) => Promise<FrappeResponse>) | undefined

            // First, check if there's a real handler for this method
            const { getRealHandler } = await import('./api-handlers-real')
            const realHandler = getRealHandler(processedCtx.method)
            if (realHandler) {
                // Wrap real handler to match expected signature
                handler = async (args: Record<string, unknown>) => {
                    return await realHandler(args) as FrappeResponse
                }
            } else {
                // Fall back to registered handler
                handler = this.methodHandlers.get(processedCtx.method)
            }

            if (!handler) {
                throw this.createFrappeError(`Method "${processedCtx.method}" not found`)
            }

            // Execute handler
            const response = await handler(processedCtx.args)

            // Cache response if cacheable
            if (this.isCacheable(method)) {
                this.cache.set(method, processedCtx.args, response)
            }

            // Run after call interceptors
            await this.interceptors.runAfterCall(processedCtx)

            return response
        } catch (error) {
            const frappeError = this.normalizeError(error)
            const processedError = await this.interceptors.runOnError(frappeError, ctx)
            throw processedError
        }
    }

    async xcall(method: string, args: Record<string, unknown> = {}): Promise<FrappeResponse> {
        return this.call(method, args, { async: true })
    }

    // ==========================================================================
    // Document Operations
    // ==========================================================================

    async getDoc(doctype: string, name: string): Promise<FrappeResponse> {
        return this.call('frappe.client.get', { doctype, name })
    }

    async getDocList(doctype: string, options: DocListOptions = {}): Promise<FrappeResponse> {
        const { filters, fields, limit, start, order_by, group_by } = options
        return this.call('frappe.client.get_list', {
            doctype,
            filters,
            fields,
            limit,
            start,
            order_by,
            group_by
        })
    }

    async getDocCount(doctype: string, filters?: Record<string, unknown>): Promise<FrappeResponse> {
        return this.call('frappe.client.get_count', { doctype, filters })
    }

    async createDoc(doctype: string, data: Record<string, unknown>): Promise<FrappeResponse> {
        const response = await this.call('frappe.client.insert', {
            doc: { doctype, ...data }
        })
        this.cache.invalidate(doctype)
        return response
    }

    async updateDoc(doctype: string, name: string, data: Record<string, unknown>): Promise<FrappeResponse> {
        const response = await this.call('frappe.client.save', {
            doctype,
            name,
            doc: data
        })
        this.cache.invalidate(doctype)
        return response
    }

    async deleteDoc(doctype: string, name: string): Promise<FrappeResponse> {
        const response = await this.call('frappe.client.delete', { doctype, name })
        this.cache.invalidate(doctype)
        return response
    }

    async setValue(doctype: string, name: string, fieldname: string, value: unknown): Promise<FrappeResponse> {
        const response = await this.call('frappe.client.set_value', {
            doctype,
            name,
            fieldname,
            value
        })
        this.cache.invalidate(doctype)
        return response
    }

    async getSingleValue(doctype: string, fieldname: string): Promise<FrappeResponse> {
        return this.call('frappe.client.get_value', {
            doctype,
            fieldname
        })
    }

    async runDocMethod(method: string, doc: Record<string, unknown>): Promise<FrappeResponse> {
        return this.call(method, { doc })
    }

    async queryReport(report: string, filters: QueryReportFilters = {}): Promise<FrappeResponse> {
        return this.call('frappe.desk.query_report.run', {
            report_name: report,
            filters
        })
    }

    // ==========================================================================
    // ERPNext Banking Specific Methods
    // ==========================================================================

    async getBankTransactions(bankAccount: string, fromDate: string, toDate: string, allTransactions?: boolean): Promise<FrappeResponse> {
        return this.call(
            'erpnext.accounts.doctype.bank_reconciliation_tool.bank_reconciliation_tool.get_bank_transactions',
            { bank_account: bankAccount, from_date: fromDate, to_date: toDate, all_transactions: allTransactions }
        )
    }

    async getLinkedPayments(bankTransactionName: string, documentTypes: string[], fromDate: string, toDate: string): Promise<FrappeResponse> {
        return this.call(
            'erpnext.accounts.doctype.bank_reconciliation_tool.bank_reconciliation_tool.get_linked_payments',
            { bank_transaction_name: bankTransactionName, document_types: documentTypes, from_date: fromDate, to_date: toDate, filter_by_reference_date: 0 }
        )
    }

    async reconcileVouchers(bankTransactionName: string, vouchers: Array<{ payment_doctype: string; payment_name: string; amount: number }>): Promise<FrappeResponse> {
        return this.call(
            'erpnext.accounts.doctype.bank_reconciliation_tool.bank_reconciliation_tool.reconcile_vouchers',
            { bank_transaction_name: bankTransactionName, vouchers: JSON.stringify(vouchers) }
        )
    }

    async getAccountBalance(bankAccount: string, company: string, tillDate: string): Promise<FrappeResponse> {
        return this.call(
            'erpnext.accounts.doctype.bank_reconciliation_tool.bank_reconciliation_tool.get_account_balance',
            { bank_account: bankAccount, company, till_date: tillDate }
        )
    }

    async getBankAccountList(company: string): Promise<FrappeResponse> {
        return this.call(
            'erpnext.accounts.doctype.bank_account.bank_account.get_list',
            { company }
        )
    }

    async getOlderUnreconciledTransactions(bankAccount: string, fromDate: string): Promise<FrappeResponse> {
        return this.call(
            'erpnext.accounts.doctype.bank_reconciliation_tool.bank_reconciliation_tool.get_older_unreconciled_transactions',
            { bank_account: bankAccount, from_date: fromDate }
        )
    }

    async getClosingBalanceAsPerStatement(bankAccount: string, date: string): Promise<FrappeResponse> {
        return this.call(
            'erpnext.accounts.doctype.bank_account.bank_account.get_closing_balance_as_per_statement',
            { bank_account: bankAccount, date }
        )
    }

    // ==========================================================================
    // Item Operations
    // ==========================================================================

    async getItemDetails(itemCode: string, warehouse?: string, currency?: string): Promise<FrappeResponse> {
        return this.call('erpnext.stock.get_item_details.get_item_details', {
            item_code: itemCode,
            warehouse,
            currency
        })
    }

    async getPriceListRate(itemCode: string, priceList: string, currency?: string): Promise<FrappeResponse> {
        return this.call('erpnext.stock.get_item_details.get_price_list_rate', {
            item_code: itemCode,
            price_list: priceList,
            currency
        })
    }

    async getUOMConversionFactor(fromUom: string, toUom: string, itemCode?: string): Promise<FrappeResponse> {
        return this.call('erpnext.stock.get_item_details.get_uom_conversion_factor', {
            from_uom: fromUom,
            to_uom: toUom,
            item_code: itemCode
        })
    }

    // ==========================================================================
    // Party Operations
    // ==========================================================================

    async getPartyAccount(partyType: string, party: string, company: string): Promise<FrappeResponse> {
        return this.call('erpnext.accounts.party.get_party_account', {
            party_type: partyType,
            party,
            company
        })
    }

    async getPartyBalance(partyType: string, party: string, company: string): Promise<FrappeResponse> {
        return this.call('erpnext.accounts.party.get_party_balance', {
            party_type: partyType,
            party,
            company
        })
    }

    async getPartyDetails(partyType: string, party: string, company: string): Promise<FrappeResponse> {
        return this.call('erpnext.accounts.party.get_party_details', {
            party_type: partyType,
            party,
            company
        })
    }

    async setTaxes(partyType: string, party: string, company: string, taxCategory?: string, postingDate?: string): Promise<FrappeResponse> {
        return this.call('erpnext.accounts.party.set_taxes', {
            party_type: partyType,
            party,
            company,
            tax_category: taxCategory,
            posting_date: postingDate
        })
    }

    // ==========================================================================
    // Utility Methods
    // ==========================================================================

    invalidateCache(doctype: string): void {
        this.cache.invalidate(doctype)
    }

    invalidateAllCache(): void {
        this.cache.invalidateAll()
    }

    setCacheTTL(ttl: number): void {
        this.cache.setTTL(ttl)
    }

    refreshPermissions(): void {
        this.permissions.refresh()
    }

    // ==========================================================================
    // Interceptor Methods
    // ==========================================================================

    addBeforeCallInterceptor(fn: InterceptorFn): () => void {
        return this.interceptors.addBeforeCall(fn)
    }

    addAfterCallInterceptor(fn: InterceptorFn): () => void {
        return this.interceptors.addAfterCall(fn)
    }

    addErrorInterceptor(fn: ErrorInterceptorFn): () => void {
        return this.interceptors.addOnError(fn)
    }

    // ==========================================================================
    // Private Helpers
    // ==========================================================================

    private isCacheable(method: string): boolean {
        const cacheablePatterns = [
            'get_list',
            'get_count',
            'get_value',
            'get',
            'get_bank_transactions',
            'get_linked_payments',
            'get_account_balance',
            'get_bank_account_list',
            'get_item_details',
            'get_price_list_rate',
            'get_party_account',
            'get_party_balance',
            'get_party_details'
        ]
        return cacheablePatterns.some((pattern) => method.includes(pattern))
    }

    private checkPermissions(ctx: InterceptorContext): void {
        const method = ctx.method

        // Determine operation type from method
        let operation: string
        if (method.includes('insert') || method.includes('create')) {
            operation = 'create'
        } else if (method.includes('delete')) {
            operation = 'delete'
        } else if (method.includes('cancel')) {
            operation = 'cancel'
        } else if (method.includes('submit')) {
            operation = 'submit'
        } else if (method.includes('save') || method.includes('set_value')) {
            operation = 'write'
        } else {
            operation = 'read'
        }

        // Extract doctype from args if available
        const doctype = ctx.args.doctype as string
        if (doctype && !this.permissions.check(doctype, operation)) {
            throw this.createFrappeError(
                `Not permitted to ${operation} on ${doctype}`,
                'PermissionError'
            )
        }
    }

    private normalizeError(error: unknown): FrappeErrorResponse {
        if (error && typeof error === 'object' && 'exc' in error) {
            return error as FrappeErrorResponse
        }

        const message = error instanceof Error ? error.message : String(error)
        return {
            message,
            exc: '',
            _server_messages: [],
            _error_message: message
        }
    }

    private createFrappeError(message: string, excType?: string): FrappeErrorResponse {
        return {
            message,
            exc: excType ? `${excType}: ${message}` : message,
            _server_messages: JSON.stringify([{ message, title: 'Error', indicator: 'red' }]),
            _error_message: message
        }
    }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const apiHandler = new APIHandlerClass()
export default apiHandler

// ============================================================================
// Convenience Functions
// ============================================================================

export const call = (method: string, args?: Record<string, unknown>, options?: CallOptions) =>
    apiHandler.call(method, args, options)

export const xcall = (method: string, args?: Record<string, unknown>) =>
    apiHandler.xcall(method, args)

export const getDoc = (doctype: string, name: string) =>
    apiHandler.getDoc(doctype, name)

export const getDocList = (doctype: string, options?: DocListOptions) =>
    apiHandler.getDocList(doctype, options)

export const getDocCount = (doctype: string, filters?: Record<string, unknown>) =>
    apiHandler.getDocCount(doctype, filters)

export const createDoc = (doctype: string, data: Record<string, unknown>) =>
    apiHandler.createDoc(doctype, data)

export const updateDoc = (doctype: string, name: string, data: Record<string, unknown>) =>
    apiHandler.updateDoc(doctype, name, data)

export const deleteDoc = (doctype: string, name: string) =>
    apiHandler.deleteDoc(doctype, name)

export const setValue = (doctype: string, name: string, fieldname: string, value: unknown) =>
    apiHandler.setValue(doctype, name, fieldname, value)

export const getSingleValue = (doctype: string, fieldname: string) =>
    apiHandler.getSingleValue(doctype, fieldname)

export const runDocMethod = (method: string, doc: Record<string, unknown>) =>
    apiHandler.runDocMethod(method, doc)

export const queryReport = (report: string, filters?: QueryReportFilters) =>
    apiHandler.queryReport(report, filters)
