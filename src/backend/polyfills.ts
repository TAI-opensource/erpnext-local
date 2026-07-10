// ============================================================================
// ERPNext Frontend Polyfills
// Replaces all frappe.* calls with local TypeScript implementations
// ============================================================================

import { call, apiHandler, FrappeResponse } from './api-handler'

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface FrappeBoot {
    sysdefaults: Record<string, unknown>
    user_defaults: Record<string, unknown[]>
    lang: string
    server_date: string
    user: {
        name: string
        full_name: string
        email: string
        roles: string[]
        can_read: string[]
        can_write: string[]
        can_create: string[]
        can_delete: string[]
        can_cancel: string[]
        lang?: string
    }
    doctype_layout: Record<string, unknown>
    linked_doctypes: Record<string, unknown>
    defaults: Record<string, unknown>
    [key: string]: unknown
}

export interface FrappeSession {
    user: string
    user_email: string
    full_name: string
    csrf_token: string
    session_expiry: string
    session_expiry_page: string
    user_id: string
    [key: string]: unknown
}

export interface FrappeUser {
    name: string
    full_name: string
    email: string
    roles: string[]
    [key: string]: unknown
}

export interface FrappeDocMeta {
    name: string
    fields: FrappeFieldMeta[]
    permissions: FrappePermission[]
    [key: string]: unknown
}

export interface FrappeFieldMeta {
    fieldname: string
    fieldtype: string
    label: string
    options?: string
    reqd?: number
    read_only?: number
    hidden?: number
    default?: unknown
    [key: string]: unknown
}

export interface FrappePermission {
    role: string
    read?: number
    write?: number
    create?: number
    delete?: number
    cancel?: number
    submit?: number
    [key: string]: unknown
}

export interface FrappeDocInfo {
    comments: unknown[]
    attachments: unknown[]
    permissions: FrappePermission[]
    [key: string]: unknown
}

export interface FrappeRoute {
    route: string[]
    [key: string]: unknown
}

export interface FrappeAlert {
    message: string
    indicator: string
}

export interface FrappePromptField {
    fieldname: string
    fieldtype: string
    label: string
    options?: string
    default?: unknown
    reqd?: number
    [key: string]: unknown
}

export interface FrappeDefaults {
    get_user_default(field: string): unknown
    get_global_default(field: string): unknown
    [key: string]: unknown
}

export interface FrappeUtils {
    now_datetime(): string
    nowdate(): string
    nowtime(): string
    now(): string
    flt(value: unknown, precision?: number): number
    cint(value: unknown): number
    cstr(value: unknown): string
    add_days(date: string | Date, days: number): Date
    date_diff(date1: string | Date, date2: string | Date): number
    getdate(date: string | Date): Date
    [key: string]: unknown
}

export interface FrappeDB {
    get_value(doctype: string, name: string, filters?: string | string[]): Promise<FrappeResponse>
    get_single_value(doctype: string, field: string): Promise<FrappeResponse>
    set_value(doctype: string, name: string, field: string, value: unknown): Promise<FrappeResponse>
    get_link_options(doctype: string, txt?: string, filters?: Record<string, unknown>): Promise<FrappeResponse>
    get_doc(doctype: string, name: string): Promise<FrappeResponse>
    get_list(doctype: string, filters?: Record<string, unknown>, fields?: string[], limit_start?: number, limit_page_length?: number): Promise<FrappeResponse>
    count(doctype: string, filters?: Record<string, unknown>): Promise<FrappeResponse>
    insert(doc: Record<string, unknown>): Promise<FrappeResponse>
    update(doc: Record<string, unknown>): Promise<FrappeResponse>
    delete(doctype: string, name: string): Promise<FrappeResponse>
    [key: string]: unknown
}

export interface FrappeModel {
    docinfo(doctype: string, name: string): Promise<FrappeResponse>
    with_doctype(doctype: string, callback: (meta: FrappeDocMeta) => void): void
    sync(docs: Record<string, unknown> | Record<string, unknown>[]): void
    add_to_locals(doc: Record<string, unknown>): void
    get_doc(doctype: string, name?: string): Record<string, unknown>
    get_all(doctype: string, filters?: Record<string, unknown>, fields?: string[]): Record<string, unknown>[]
    [key: string]: unknown
}

export interface FrappeViews {
    [key: string]: unknown
}

export interface FrappeUIForm {
    [key: string]: unknown
}

export interface FrappeCallOptions {
    method?: string
    args?: Record<string, unknown>
    callback?: (response: FrappeResponse) => void
    error?: (error: { message: string; exc: string; _server_messages: string[] }) => void
    freeze?: boolean
    freeze_message?: string
    async?: boolean
    doc?: Record<string, unknown>
    onestart?: () => void
    always?: () => void
    headers?: Record<string, string>
}

// ============================================================================
// Local Document Cache (Simulates Frappe's locals)
// ============================================================================

class LocalDocStore {
    private store = new Map<string, Map<string, Record<string, unknown>>>()
    private doctypeMeta = new Map<string, FrappeDocMeta>()

    addDoc(doc: Record<string, unknown>): void {
        const doctype = doc.doctype as string
        const name = (doc.name as string) || 'new-doc-' + Date.now()

        if (!this.store.has(doctype)) {
            this.store.set(doctype, new Map())
        }
        this.store.get(doctype)!.set(name, { ...doc, name })
    }

    getDoc(doctype: string, name: string): Record<string, unknown> | undefined {
        return this.store.get(doctype)?.get(name)
    }

    getAllDocs(doctype: string): Record<string, unknown>[] {
        const docs = this.store.get(doctype)
        return docs ? Array.from(docs.values()) : []
    }

    updateDoc(doctype: string, name: string, data: Record<string, unknown>): Record<string, unknown> | undefined {
        const doc = this.store.get(doctype)?.get(name)
        if (doc) {
            Object.assign(doc, data)
            return doc
        }
        return undefined
    }

    deleteDoc(doctype: string, name: string): boolean {
        return this.store.get(doctype)?.delete(name) ?? false
    }

    setMeta(doctype: string, meta: FrappeDocMeta): void {
        this.doctypeMeta.set(doctype, meta)
    }

    getMeta(doctype: string): FrappeDocMeta | undefined {
        return this.doctypeMeta.get(doctype)
    }

    count(doctype: string, filters?: Record<string, unknown>): number {
        const docs = this.getAllDocs(doctype)
        if (!filters) return docs.length

        return docs.filter((doc) => {
            return Object.entries(filters).every(([key, value]) => doc[key] === value)
        }).length
    }
}

const localStore = new LocalDocStore()

// ============================================================================
// Default Boot Data
// ============================================================================

const defaultBoot: FrappeBoot = {
    sysdefaults: {},
    user_defaults: {},
    lang: 'en',
    server_date: new Date().toISOString().split('T')[0],
    user: {
        name: 'Administrator',
        full_name: 'Administrator',
        email: 'admin@example.com',
        roles: ['System Manager', 'Administrator'],
        can_read: [],
        can_write: [],
        can_create: [],
        can_delete: [],
        can_cancel: []
    },
    doctype_layout: {},
    linked_doctypes: {},
    defaults: {}
}

const defaultSession: FrappeSession = {
    user: 'Administrator',
    user_email: 'admin@example.com',
    full_name: 'Administrator',
    csrf_token: 'local-csrf-token-' + Date.now(),
    session_expiry: '06:00',
    session_expiry_page: '/login',
    user_id: 'Administrator'
}

const defaultUser: FrappeUser = {
    name: 'Administrator',
    full_name: 'Administrator',
    email: 'admin@example.com',
    roles: ['System Manager', 'Administrator']
}

// ============================================================================
// frappe.utils Implementation
// ============================================================================

function now_datetime(): string {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

function nowdate(): string {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function nowtime(): string {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

function now(): string {
    return now_datetime()
}

function flt(value: unknown, precision?: number): number {
    const num = parseFloat(String(value))
    if (isNaN(num)) return 0
    if (precision !== undefined) {
        return parseFloat(num.toFixed(precision))
    }
    return num
}

function cint(value: unknown): number {
    return parseInt(String(value), 10) || 0
}

function cstr(value: unknown): string {
    if (value === null || value === undefined) return ''
    return String(value)
}

function add_days(date: string | Date, days: number): Date {
    const d = typeof date === 'string' ? new Date(date) : new Date(date)
    d.setDate(d.getDate() + days)
    return d
}

function date_diff(date1: string | Date, date2: string | Date): number {
    const d1 = typeof date1 === 'string' ? new Date(date1) : new Date(date1)
    const d2 = typeof date2 === 'string' ? new Date(date2) : new Date(date2)
    const diffTime = d1.getTime() - d2.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

function getdate(date: string | Date): Date {
    if (date instanceof Date) return new Date(date)
    return new Date(date)
}

// ============================================================================
// frappe.defaults Implementation
// ============================================================================

function get_user_default(field: string): unknown {
    const boot = (window as unknown as { frappe?: { boot?: FrappeBoot } }).frappe?.boot
    if (boot?.user_defaults && field in boot.user_defaults) {
        const defaults = boot.user_defaults[field]
        return Array.isArray(defaults) ? defaults[0] : defaults
    }
    if (boot?.sysdefaults && field in boot.sysdefaults) {
        return boot.sysdefaults[field]
    }
    return undefined
}

function get_global_default(field: string): unknown {
    const boot = (window as unknown as { frappe?: { boot?: FrappeBoot } }).frappe?.boot
    if (boot?.sysdefaults && field in boot.sysdefaults) {
        return boot.sysdefaults[field]
    }
    return undefined
}

// ============================================================================
// frappe.db Implementation
// ============================================================================

async function db_get_value(
    doctype: string,
    name: string,
    filters?: string | string[]
): Promise<FrappeResponse> {
    const localDoc = localStore.getDoc(doctype, name)
    if (localDoc) {
        if (filters) {
            const fields = Array.isArray(filters) ? filters : [filters]
            const result: Record<string, unknown> = {}
            fields.forEach((f) => {
                result[f] = localDoc[f]
            })
            return { message: result, exc: null, _server_messages: null }
        }
        return { message: localDoc, exc: null, _server_messages: null }
    }
    return call('frappe.client.get_value', { doctype, filters: name, fieldname: filters })
}

async function db_get_single_value(doctype: string, field: string): Promise<FrappeResponse> {
    return call('frappe.client.get_value', { doctype, fieldname: field })
}

async function db_set_value(
    doctype: string,
    name: string,
    field: string,
    value: unknown
): Promise<FrappeResponse> {
    localStore.updateDoc(doctype, name, { [field]: value })
    return call('frappe.client.set_value', { doctype, name, fieldname: field, value })
}

async function db_get_link_options(
    doctype: string,
    txt?: string,
    filters?: Record<string, unknown>
): Promise<FrappeResponse> {
    return call('frappe.client.get_list', {
        doctype,
        filters: { ...filters, ...(txt ? { name: ['like', `%${txt}%`] } : {}) },
        fields: ['name'],
        limit: 20
    })
}

async function db_get_doc(doctype: string, name: string): Promise<FrappeResponse> {
    const localDoc = localStore.getDoc(doctype, name)
    if (localDoc) {
        return { message: localDoc, exc: null, _server_messages: null }
    }
    return call('frappe.client.get', { doctype, name })
}

async function db_get_list(
    doctype: string,
    filters?: Record<string, unknown>,
    fields?: string[],
    limit_start?: number,
    limit_page_length?: number
): Promise<FrappeResponse> {
    const localDocs = localStore.getAllDocs(doctype)
    let filteredDocs = localDocs

    if (filters) {
        filteredDocs = localDocs.filter((doc) => {
            return Object.entries(filters).every(([key, value]) => doc[key] === value)
        })
    }

    const start = limit_start || 0
    const limit = limit_page_length || 20
    const slicedDocs = filteredDocs.slice(start, start + limit)

    if (fields && fields.length > 0) {
        const projected = slicedDocs.map((doc) => {
            const result: Record<string, unknown> = {}
            fields.forEach((f) => {
                result[f] = doc[f]
            })
            return result
        })
        return { message: projected, exc: null, _server_messages: null }
    }

    return { message: slicedDocs, exc: null, _server_messages: null }
}

async function db_count(
    doctype: string,
    filters?: Record<string, unknown>
): Promise<FrappeResponse> {
    const localDocs = localStore.getAllDocs(doctype)
    if (filters) {
        const count = localDocs.filter((doc) => {
            return Object.entries(filters).every(([key, value]) => doc[key] === value)
        }).length
        return { message: count, exc: null, _server_messages: null }
    }
    return { message: localDocs.length, exc: null, _server_messages: null }
}

async function db_insert(doc: Record<string, unknown>): Promise<FrappeResponse> {
    localStore.addDoc(doc)
    const name = doc.name || `new-${Date.now()}`
    const savedDoc = { ...doc, name }
    return call('frappe.client.insert', { doc: savedDoc })
}

async function db_update(doc: Record<string, unknown>): Promise<FrappeResponse> {
    const doctype = doc.doctype as string
    const name = doc.name as string
    localStore.updateDoc(doctype, name, doc)
    return call('frappe.client.save', { doctype, name, doc })
}

async function db_delete(doctype: string, name: string): Promise<FrappeResponse> {
    localStore.deleteDoc(doctype, name)
    return call('frappe.client.delete', { doctype, name })
}

// ============================================================================
// frappe.model Implementation
// ============================================================================

async function model_docinfo(doctype: string, name: string): Promise<FrappeResponse> {
    return call('frappe.client.get', { doctype: 'DocInfo', name: `${doctype}/${name}` })
}

function model_with_doctype(doctype: string, callback: (meta: FrappeDocMeta) => void): void {
    const cachedMeta = localStore.getMeta(doctype)
    if (cachedMeta) {
        callback(cachedMeta)
        return
    }

    const defaultMeta: FrappeDocMeta = {
        name: doctype,
        fields: [],
        permissions: []
    }
    localStore.setMeta(doctype, defaultMeta)
    callback(defaultMeta)
}

function model_sync(docs: Record<string, unknown> | Record<string, unknown>[]): void {
    const docArray = Array.isArray(docs) ? docs : [docs]
    docArray.forEach((doc) => {
        if (doc.doctype && doc.name) {
            localStore.addDoc(doc)
        }
    })
}

function model_add_to_locals(doc: Record<string, unknown>): void {
    localStore.addDoc(doc)
}

function model_get_doc(doctype: string, name?: string): Record<string, unknown> {
    if (name) {
        return localStore.getDoc(doctype, name) || { doctype, name }
    }
    return { doctype, name: '' }
}

function model_get_all(
    doctype: string,
    filters?: Record<string, unknown>,
    fields?: string[]
): Record<string, unknown>[] {
    let docs = localStore.getAllDocs(doctype)

    if (filters) {
        docs = docs.filter((doc) => {
            return Object.entries(filters).every(([key, value]) => doc[key] === value)
        })
    }

    if (fields && fields.length > 0) {
        return docs.map((doc) => {
            const result: Record<string, unknown> = {}
            fields.forEach((f) => {
                result[f] = doc[f]
            })
            return result
        })
    }

    return docs
}

// ============================================================================
// frappe.get_meta Implementation
// ============================================================================

function get_meta(doctype: string): FrappeDocMeta {
    const cachedMeta = localStore.getMeta(doctype)
    if (cachedMeta) {
        return cachedMeta
    }

    const defaultMeta: FrappeDocMeta = {
        name: doctype,
        fields: [],
        permissions: []
    }
    localStore.setMeta(doctype, defaultMeta)
    return defaultMeta
}

// ============================================================================
// frappe.provide Implementation
// ============================================================================

function provide(path: string): Record<string, unknown> {
    const parts = path.split('.')
    let current: Record<string, unknown> = window as unknown as Record<string, unknown>

    parts.forEach((part) => {
        if (!current[part]) {
            current[part] = {}
        }
        current = current[part] as Record<string, unknown>
    })

    return current
}

// ============================================================================
// frappe.get_route & frappe.set_route
// ============================================================================

let currentRoute: string[] = ['desk']

function get_route(): FrappeRoute {
    return { route: [...currentRoute] }
}

function set_route(route: string | string[]): void {
    const routeArray = Array.isArray(route) ? route : route.split('/')
    currentRoute = routeArray.filter(Boolean)
}

// ============================================================================
// frappe.urllib Implementation
// ============================================================================

function get_full_url(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url
    }
    const base = window.location.origin
    return `${base}${url.startsWith('/') ? '' : '/'}${url}`
}

// ============================================================================
// frappe.show_alert Implementation
// ============================================================================

function show_alert(message: string | FrappeAlert, indicator?: string): void {
    const msg = typeof message === 'string' ? message : message.message
    const ind = typeof message === 'string' ? indicator || 'green' : message.indicator || 'green'

    console.log(`[ALERT:${ind}] ${msg}`)

    // Dispatch custom event for UI to handle
    window.dispatchEvent(
        new CustomEvent('frappe:alert', {
            detail: { message: msg, indicator: ind }
        })
    )
}

// ============================================================================
// frappe.show_progress Implementation
// ============================================================================

function show_progress(title: string, percent: number, description?: string): void {
    console.log(`[PROGRESS] ${title}: ${percent}%${description ? ` - ${description}` : ''}`)

    window.dispatchEvent(
        new CustomEvent('frappe:progress', {
            detail: { title, percent, description }
        })
    )
}

// ============================================================================
// frappe.confirm Implementation
// ============================================================================

function confirm_dialog(
    message: string,
    ifyes: () => void,
    ifno?: () => void
): void {
    const confirmed = window.confirm(message)
    if (confirmed && ifyes) {
        ifyes()
    } else if (!confirmed && ifno) {
        ifno()
    }
}

// ============================================================================
// frappe.prompt Implementation
// ============================================================================

function prompt_dialog(
    fields: FrappePromptField[] | FrappePromptField,
    callback: (values: Record<string, unknown>) => void,
    title?: string
): void {
    const fieldArray = Array.isArray(fields) ? fields : [fields]
    const values: Record<string, unknown> = {}

    fieldArray.forEach((field) => {
        const val = window.prompt(`${title || 'Input'} - ${field.label}:`, field.default ? String(field.default) : '')
        values[field.fieldname] = val
    })

    if (callback) {
        callback(values)
    }
}

// ============================================================================
// frappe.valid_email Implementation
// ============================================================================

function valid_email(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
}

// ============================================================================
// frappe.get_abbr Implementation
// ============================================================================

function get_abbr(name: string, length?: number): string {
    if (!name) return ''
    const maxLen = length || 2
    const words = name.trim().split(/\s+/)
    if (words.length === 1) {
        return words[0].substring(0, maxLen).toUpperCase()
    }
    return words
        .slice(0, maxLen)
        .map((w) => w.charAt(0).toUpperCase())
        .join('')
}

// ============================================================================
// Translation stubs (__ and _)
// ============================================================================

function translate(str: string): string {
    return str
}

// ============================================================================
// frappe.call Implementation with APIHandler Integration
// ============================================================================

async function frappe_call(
    method: string | FrappeCallOptions,
    args?: Record<string, unknown>,
    options?: FrappeCallOptions
): Promise<FrappeResponse> {
    // Handle overloaded signature: frappe.call({ method, args, callback, ... })
    let methodName: string
    let callArgs: Record<string, unknown>
    let callOptions: FrappeCallOptions

    if (typeof method === 'string') {
        methodName = method
        callArgs = args || {}
        callOptions = options || {}
    } else {
        const opts = method
        methodName = opts.method || ''
        callArgs = opts.args || {}
        callOptions = opts
    }

    // Handle doc method calls
    if (callOptions.doc && callOptions.method) {
        callArgs = { ...callArgs, doc: callOptions.doc }
    }

    // Handle freeze UI
    if (callOptions.freeze) {
        show_progress('Loading...', 0, callOptions.freeze_message || 'Please wait...')
    }

    try {
        const response = await apiHandler.call(methodName, callArgs, {
            freeze: callOptions.freeze,
            freeze_message: callOptions.freeze_message,
            async: callOptions.async,
            callback: callOptions.callback,
            error: callOptions.error
        })

        // Execute callback if provided
        if (callOptions.callback && typeof callOptions.callback === 'function') {
            callOptions.callback(response)
        }

        return response
    } catch (error) {
        const errObj = error as { message: string; exc: string; _server_messages: string[] }

        // Execute error handler if provided
        if (callOptions.error && typeof callOptions.error === 'function') {
            callOptions.error(errObj)
        } else {
            console.error(`[frappe.call] Error in ${methodName}:`, error)
        }

        throw error
    } finally {
        // Dismiss freeze
        if (callOptions.freeze) {
            window.dispatchEvent(new CustomEvent('frappe:freeze_dismiss'))
        }
    }
}

// ============================================================================
// frappe.xcall Implementation
// ============================================================================

async function frappe_xcall(
    method: string,
    args?: Record<string, unknown>
): Promise<FrappeResponse> {
    return apiHandler.xcall(method, args)
}

// ============================================================================
// Create frappe Object
// ============================================================================

function createFrappe(): void {
    const frappe = {
        // Boot data
        boot: { ...defaultBoot } as FrappeBoot,

        // Session
        session: { ...defaultSession } as FrappeSession,

        // User
        user: { ...defaultUser } as FrappeUser,

        // User icons (empty, populated by UI)
        user_icons: {} as Record<string, string>,

        // Messages for translation
        _messages: {} as Record<string, string>,

        // Current form (set when form opens)
        cur_frm: null as null,

        // Call method
        call: frappe_call,

        // XCall (synchronous-like)
        xcall: frappe_xcall,

        // Database operations
        db: {
            get_value: db_get_value,
            get_single_value: db_get_single_value,
            set_value: db_set_value,
            get_link_options: db_get_link_options,
            get_doc: db_get_doc,
            get_list: db_get_list,
            count: db_count,
            insert: db_insert,
            update: db_update,
            delete: db_delete
        } as FrappeDB,

        // Model operations
        model: {
            docinfo: model_docinfo,
            with_doctype: model_with_doctype,
            sync: model_sync,
            add_to_locals: model_add_to_locals,
            get_doc: model_get_doc,
            get_all: model_get_all
        } as FrappeModel,

        // Defaults
        defaults: {
            get_user_default,
            get_global_default
        } as FrappeDefaults,

        // Utility functions
        utils: {
            now_datetime,
            nowdate,
            nowtime,
            now,
            flt,
            cint,
            cstr,
            add_days,
            date_diff,
            getdate
        } as FrappeUtils,

        // URL utilities
        urllib: {
            get_full_url
        },

        // Route management
        get_route,
        set_route,

        // UI feedback
        show_alert,
        show_progress,

        // Dialogs
        confirm: confirm_dialog,
        prompt: prompt_dialog,

        // Validation
        valid_email,

        // Abbreviation
        get_abbr,

        // Meta data
        get_meta,

        // Object provider
        provide,

        // Views (empty for compatibility)
        views: {} as FrappeViews,

        // UI Form (empty for compatibility)
        ui: {
            form: {} as FrappeUIForm
        },

        // Events (simple event emitter)
        events: {
            on: (event: string, callback: (...args: unknown[]) => void) => {
                window.addEventListener(event, ((e: CustomEvent) => callback(e.detail)) as EventListener)
            },
            off: (event: string, callback: (...args: unknown[]) => void) => {
                window.removeEventListener(event, callback as EventListener)
            },
            trigger: (event: string, data?: unknown) => {
                window.dispatchEvent(new CustomEvent(event, { detail: data }))
            }
        }
    }

    // Set on window
    ;(window as unknown as { frappe: typeof frappe }).frappe = frappe

    // Translation functions
    ;(window as unknown as { __: typeof translate; _: typeof translate }).__ = translate
    ;(window as unknown as { __: typeof translate; _: typeof translate })._ = translate

    // Current form references
    ;(window as unknown as { cur_frm: null; frm: null }).cur_frm = null
    ;(window as unknown as { cur_frm: null; frm: null }).frm = null

    console.log('[ERPNext Polyfills] Frontend polyfills initialized')
}

// ============================================================================
// Initialize Polyfills
// ============================================================================

createFrappe()

// ============================================================================
// Exports
// ============================================================================

export {
    // Translation
    translate as __,
    translate as _,

    // Boot
    defaultBoot,

    // Session
    defaultSession,

    // User
    defaultUser,

    // Utilities
    now_datetime,
    nowdate,
    nowtime,
    now,
    flt,
    cint,
    cstr,
    add_days,
    date_diff,
    getdate,

    // Defaults
    get_user_default,
    get_global_default,

    // DB functions
    db_get_value,
    db_get_single_value,
    db_set_value,
    db_get_link_options,
    db_get_doc,
    db_get_list,
    db_count,
    db_insert,
    db_update,
    db_delete,

    // Model functions
    model_docinfo,
    model_with_doctype,
    model_sync,
    model_add_to_locals,
    model_get_doc,
    model_get_all,

    // Meta
    get_meta,

    // Provide
    provide,

    // Route
    get_route,
    set_route,

    // URL
    get_full_url,

    // UI
    show_alert,
    show_progress,
    confirm_dialog,
    prompt_dialog,

    // Validation
    valid_email,
    get_abbr,

    // Local store (for advanced usage)
    localStore,

    // Types
    type FrappeBoot,
    type FrappeSession,
    type FrappeUser,
    type FrappeDocMeta,
    type FrappeFieldMeta,
    type FrappePermission,
    type FrappeDocInfo,
    type FrappeRoute,
    type FrappeAlert,
    type FrappePromptField,
    type FrappeDefaults,
    type FrappeUtils,
    type FrappeDB,
    type FrappeModel,
    type FrappeViews,
    type FrappeUIForm,
    type FrappeCallOptions
}
