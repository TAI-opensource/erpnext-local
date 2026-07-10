import { SQLiteEngine } from '../sqlite-engine'
import { LocalAuth } from '../auth'
import { getIndexedDBStore } from '../indexeddb-store'

type IndexedDBStore = Awaited<ReturnType<typeof getIndexedDBStore>>

// ============================================================
// Types & Interfaces
// ============================================================

export interface BaseDocument {
  name?: string
  docstatus?: 0 | 1 | 2
  creation?: string
  modified?: string
  owner?: string
  modified_by?: string
  idx?: number
  parent?: string
  parenttype?: string
  parentfield?: string
  [key: string]: unknown
}

export interface DocumentWithItems extends BaseDocument {
  items?: BaseDocument[]
  [key: string]: unknown
}

export interface TaxRow {
  charge_type?: string
  account_head?: string
  rate?: number
  amount?: number
  tax_amount?: number
  description?: string
  cost_center?: string
}

export interface DocumentWithTaxes extends DocumentWithItems {
  taxes?: TaxRow[]
  tax_category?: string
  taxes_and_charges?: string
  net_total?: number
  grand_total?: number
  total_taxes_and_charges?: number
  base_grand_total?: number
  rounded_total?: number
  in_words?: string
  [key: string]: unknown
}

export interface PaymentRow {
  mode_of_payment?: string
  amount?: number
  account?: string
}

export interface DocumentWithPayments extends DocumentWithTaxes {
  payments?: PaymentRow[]
  outstanding_amount?: number
  paid_amount?: number
  [key: string]: unknown
}

export interface FilterCondition {
  field: string
  operator: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'in' | 'like' | 'contains'
  value: unknown
}

export interface ListOptions {
  filters?: FilterCondition[]
  orderBy?: { field: string; direction?: 'asc' | 'desc' }
  limit?: number
  offset?: number
  fields?: string[]
}

export type PermissionType = 'read' | 'write' | 'create' | 'delete' | 'submit' | 'cancel' | 'report'

// ============================================================
// Utility Functions
// ============================================================

export function now_datetime(): string {
  return new Date().toISOString()
}

export function nowdate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function nowtime(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

export function getdate(date?: string | Date): string {
  if (!date) return nowdate()
  if (date instanceof Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
  const d = new Date(date)
  if (isNaN(d.getTime())) return nowdate()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function add_days(date: string | Date, days: number): string {
  const d = typeof date === 'string' ? new Date(date) : new Date(date)
  d.setDate(d.getDate() + days)
  return getdate(d)
}

export function date_diff(date1: string | Date, date2: string | Date): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2
  const diffMs = d1.getTime() - d2.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

export function flt(value: unknown, precision = 2): number {
  if (value === null || value === undefined || value === '') return 0
  const num = typeof value === 'number' ? value : parseFloat(String(value))
  if (isNaN(num)) return 0
  const factor = Math.pow(10, precision)
  return Math.round(num * factor) / factor
}

export function cint(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0
  const num = parseInt(String(value), 10)
  return isNaN(num) ? 0 : num
}

export function cstr(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

export function round(value: number, precision = 0): number {
  const factor = Math.pow(10, precision)
  return Math.round(value * factor) / factor
}

export function fmt_money(value: number, currency = 'BRL'): string {
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
    }).format(value)
  } catch {
    return `${currency} ${value.toFixed(2)}`
  }
}

export function get_url(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return 'http://localhost:3000'
}

export function show_alert(msg: string, indicator = 'green'): void {
  if (typeof window !== 'undefined') {
    console.log(`[${indicator.toUpperCase()}] ${msg}`)
  }
}

export function validate_email(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export function deep_clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export function get_nested_value(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc: unknown, key: string) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key]
    return undefined
  }, obj)
}

export function set_nested_value(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.')
  const lastKey = keys.pop()!
  const target = keys.reduce((acc: Record<string, unknown>, key: string) => {
    if (!acc[key] || typeof acc[key] !== 'object') acc[key] = {}
    return acc[key] as Record<string, unknown>
  }, obj)
  target[lastKey] = value
}

// ============================================================
// BaseController
// ============================================================

export class BaseController {
  protected db: SQLiteEngine
  protected auth: LocalAuth
  protected store: IndexedDBStore | null = null

  constructor(db: SQLiteEngine, auth: LocalAuth) {
    this.db = db
    this.auth = auth
  }

  protected async ensureStore(): Promise<IndexedDBStore> {
    if (!this.store) {
      this.store = await getIndexedDBStore()
    }
    return this.store
  }

  // ----------------------------------------------------------
  // Document Lifecycle Hooks
  // ----------------------------------------------------------

  async validate(doc: BaseDocument): Promise<void> {
    await this.validate_mandatory_fields(doc)
    await this.validate_links(doc)
  }

  async before_insert(doc: BaseDocument): Promise<void> {
    // Override in subclasses
  }

  async after_insert(doc: BaseDocument): Promise<void> {
    // Override in subclasses
  }

  async before_save(doc: BaseDocument): Promise<void> {
    // Override in subclasses
  }

  async after_save(doc: BaseDocument): Promise<void> {
    // Override in subclasses
  }

  async before_submit(doc: BaseDocument): Promise<void> {
    // Override in subclasses
  }

  async after_submit(doc: BaseDocument): Promise<void> {
    // Override in subclasses
  }

  async before_cancel(doc: BaseDocument): Promise<void> {
    // Override in subclasses
  }

  async after_cancel(doc: BaseDocument): Promise<void> {
    // Override in subclasses
  }

  async on_update(doc: BaseDocument): Promise<void> {
    // Override in subclasses
  }

  // ----------------------------------------------------------
  // Validation Helpers
  // ----------------------------------------------------------

  async validate_mandatory_fields(doc: BaseDocument): Promise<void> {
    const mandatory = this.get_mandatory_fields(doc)
    const missing: string[] = []

    for (const field of mandatory) {
      const value = doc[field]
      if (value === undefined || value === null || value === '') {
        missing.push(field)
      }
    }

    if (missing.length > 0) {
      throw new Error(`Mandatory fields missing: ${missing.join(', ')}`)
    }
  }

  protected get_mandatory_fields(doc: BaseDocument): string[] {
    const doctype = doc.parenttype || (doc as Record<string, unknown>).__doctype as string
    const mandatoryByDoctype: Record<string, string[]> = {
      SalesOrder: ['customer', 'company', 'transaction_date'],
      SalesInvoice: ['customer', 'company', 'posting_date'],
      PurchaseOrder: ['supplier', 'company', 'transaction_date'],
      PurchaseInvoice: ['supplier', 'company', 'posting_date'],
      DeliveryNote: ['customer', 'company', 'posting_date'],
      PurchaseReceipt: ['supplier', 'company', 'posting_date'],
      StockEntry: ['company', 'posting_date'],
      PaymentEntry: ['party_type', 'party', 'company', 'posting_date'],
      JournalEntry: ['company', 'posting_date'],
    }
    return mandatoryByDoctype[doctype || ''] || []
  }

  async validate_links(doc: BaseDocument): Promise<void> {
    const links = this.get_link_fields(doc)
    for (const link of links) {
      const value = doc[link.field]
      if (value) {
        const exists = await this.get_value(link.reference_doctype, String(value), 'name')
        if (!exists) {
          throw new Error(`${link.field}: ${value} does not exist in ${link.reference_doctype}`)
        }
      }
    }
  }

  protected get_link_fields(doc: BaseDocument): Array<{ field: string; reference_doctype: string }> {
    return [
      { field: 'company', reference_doctype: 'Company' },
      { field: 'customer', reference_doctype: 'Customer' },
      { field: 'supplier', reference_doctype: 'Supplier' },
      { field: 'warehouse', reference_doctype: 'Warehouse' },
      { field: 'item_code', reference_doctype: 'Item' },
      { field: 'cost_center', reference_doctype: 'CostCenter' },
      { field: 'debit_to', reference_doctype: 'Account' },
      { field: 'credit_to', reference_doctype: 'Account' },
    ]
  }

  // ----------------------------------------------------------
  // Name & Metadata
  // ----------------------------------------------------------

  set_name(doc: BaseDocument): string {
    if (doc.name) return doc.name
    const doctype = (doc as Record<string, unknown>).__doctype as string || 'Document'
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    doc.name = `${doctype}-${timestamp}-${random}`
    return doc.name
  }

  set_creation_and_modified(doc: BaseDocument): void {
    const now = now_datetime()
    if (!doc.creation) {
      doc.creation = now
      doc.owner = this.auth.getCurrentUser()?.email || 'Administrator'
    }
    doc.modified = now
    doc.modified_by = this.auth.getCurrentUser()?.email || 'Administrator'
  }

  set_status(doc: BaseDocument, status: string): void {
    doc.status = status
  }

  // ----------------------------------------------------------
  // Permission Check
  // ----------------------------------------------------------

  async has_permission(doc: BaseDocument, permission_type: PermissionType): Promise<boolean> {
    const doctype = (doc as Record<string, unknown>).__doctype as string || 'Document'
    return await this.auth.hasPermission(doctype, permission_type)
  }

  // ----------------------------------------------------------
  // Database Operations
  // ----------------------------------------------------------

  async get_value(doctype: string, name: string, fieldname: string): Promise<unknown> {
    const tableName = this._doctype_to_table(doctype)
    const store = await this.ensureStore()
    const record = await store.get<Record<string, unknown>>(tableName as never, name)
    if (!record) return null
    return fieldname === '*' ? record : record[fieldname]
  }

  async get_list(doctype: string, options: ListOptions = {}): Promise<Record<string, unknown>[]> {
    const tableName = this._doctype_to_table(doctype)
    const store = await this.ensureStore()

    const queryOptions: Record<string, unknown> = {}
    if (options.filters) queryOptions.filters = options.filters
    if (options.orderBy) queryOptions.orderBy = options.orderBy
    if (options.limit) queryOptions.limit = options.limit
    if (options.offset) queryOptions.offset = options.offset

    const results = await store.query<Record<string, unknown>>(tableName as never, queryOptions as never)

    if (options.fields && options.fields.length > 0) {
      return results.map((row) => {
        const filtered: Record<string, unknown> = {}
        for (const field of options.fields!) {
          if (field in row) filtered[field] = row[field]
        }
        return filtered
      })
    }

    return results
  }

  async get_count(doctype: string, filters?: FilterCondition[]): Promise<number> {
    const tableName = this._doctype_to_table(doctype)
    const store = await this.ensureStore()

    if (!filters || filters.length === 0) {
      return await store.count(tableName as never)
    }

    const results = await store.query<Record<string, unknown>>(tableName as never, { filters } as never)
    return results.length
  }

  async set_value(doctype: string, name: string, fieldname: string, value: unknown): Promise<void> {
    const tableName = this._doctype_to_table(doctype)
    const store = await this.ensureStore()
    const existing = await store.get<Record<string, unknown>>(tableName as never, name)

    if (!existing) {
      throw new Error(`${doctype} ${name} not found`)
    }

    existing[fieldname] = value
    existing.modified = now_datetime()
    existing.modified_by = this.auth.getCurrentUser()?.email || 'Administrator'
    await store.put(tableName as never, existing as Record<string, unknown> & { name: string })
  }

  // ----------------------------------------------------------
  // Document Operations
  // ----------------------------------------------------------

  async insert(doc: BaseDocument): Promise<BaseDocument> {
    await this.before_insert(doc)

    this.set_name(doc)
    this.set_creation_and_modified(doc)
    doc.docstatus = 0

    await this.validate(doc)
    await this._save_doc(doc)
    await this.after_insert(doc)
    await this.on_update(doc)

    return doc
  }

  async save(doc: BaseDocument): Promise<BaseDocument> {
    if (!doc.name) {
      return await this.insert(doc)
    }

    await this.before_save(doc)
    this.set_creation_and_modified(doc)

    await this.validate(doc)
    await this._save_doc(doc)
    await this.after_save(doc)
    await this.on_update(doc)

    return doc
  }

  async submit(doc: BaseDocument): Promise<BaseDocument> {
    if (!doc.name) {
      throw new Error('Document must be saved before submitting')
    }

    await this.before_submit(doc)

    doc.docstatus = 1
    this.set_creation_and_modified(doc)

    await this._save_doc(doc)
    await this.after_submit(doc)
    await this.on_update(doc)

    return doc
  }

  async cancel(doc: BaseDocument): Promise<BaseDocument> {
    if (!doc.name) {
      throw new Error('Document not found')
    }

    await this.before_cancel(doc)

    doc.docstatus = 2
    this.set_creation_and_modified(doc)

    await this._save_doc(doc)
    await this.after_cancel(doc)
    await this.on_update(doc)

    return doc
  }

  async delete(doctype: string, name: string): Promise<void> {
    const tableName = this._doctype_to_table(doctype)
    const store = await this.ensureStore()
    await store.delete(tableName as never, name)
  }

  // ----------------------------------------------------------
  // Run Doc Method
  // ----------------------------------------------------------

  async run_doc_method(doc: BaseDocument, method: string): Promise<unknown> {
    const methodMap: Record<string, () => Promise<unknown>> = {
      validate: () => this.validate(doc),
      before_insert: () => this.before_insert(doc),
      after_insert: () => this.after_insert(doc),
      before_save: () => this.before_save(doc),
      after_save: () => this.after_save(doc),
      before_submit: () => this.before_submit(doc),
      after_submit: () => this.after_submit(doc),
      before_cancel: () => this.before_cancel(doc),
      after_cancel: () => this.after_cancel(doc),
      on_update: () => this.on_update(doc),
    }

    const handler = methodMap[method]
    if (handler) {
      return await handler()
    }

    // Try dynamic method on doc
    if (typeof (doc as Record<string, unknown>)[method] === 'function') {
      return await ((doc as Record<string, unknown>)[method] as () => Promise<unknown>)()
    }

    throw new Error(`Method ${method} not found`)
  }

  // ----------------------------------------------------------
  // Internal Helpers
  // ----------------------------------------------------------

  protected async _save_doc(doc: BaseDocument): Promise<void> {
    const doctype = (doc as Record<string, unknown>).__doctype as string || 'Document'
    const tableName = this._doctype_to_table(doctype)
    const store = await this.ensureStore()
    await store.put(tableName as never, doc as Record<string, unknown> & { name: string })

    // Save child tables
    if (doc.items && Array.isArray(doc.items)) {
      await this._save_child_rows(doctype, doc.name!, 'items', doc.items)
    }
    if (doc.taxes && Array.isArray(doc.taxes)) {
      await this._save_child_rows(doctype, doc.name!, 'taxes', doc.taxes)
    }
    if (doc.payments && Array.isArray(doc.payments)) {
      await this._save_child_rows(doctype, doc.name!, 'payments', doc.payments)
    }
  }

  protected async _save_child_rows(
    parenttype: string,
    parentname: string,
    parentfield: string,
    rows: BaseDocument[]
  ): Promise<void> {
    const childTable = `${parenttype.toLowerCase()}_${parentfield}`
    const store = await this.ensureStore()

    // Delete existing rows
    try {
      await store.clear(childTable as never)
    } catch {
      // Table might not exist
    }

    // Insert new rows
    for (let idx = 0; idx < rows.length; idx++) {
      const row = { ...rows[idx] }
      row.parent = parentname
      row.parenttype = parenttype
      row.parentfield = parentfield
      row.idx = idx + 1
      if (!row.row_id) row.row_id = `${parentname}-${parentfield}-${idx + 1}`
      try {
        await store.put(childTable as never, row as Record<string, unknown> & { name: string })
      } catch {
        // Ignore if child table doesn't exist
      }
    }
  }

  protected _doctype_to_table(doctype: string): string {
    const map: Record<string, string> = {
      Company: 'company',
      Account: 'account',
      UOM: 'uom',
      Currency: 'currency',
      Country: 'country',
      CostCenter: 'cost_center',
      CustomerGroup: 'customer_group',
      Territory: 'territory',
      SupplierGroup: 'supplier_group',
      ItemGroup: 'item_group',
      Brand: 'brand',
      PriceList: 'price_list',
      ItemPrice: 'item_price',
      TaxCategory: 'tax_category',
      SalesTaxesAndChargesTemplate: 'sales_taxes_and_charges_template',
      PurchaseTaxesAndChargesTemplate: 'purchase_taxes_and_charges_template',
      PaymentTermsTemplate: 'payment_terms_template',
      TermsAndConditions: 'terms_and_conditions',
      LetterHead: 'letter_head',
      ModeOfPayment: 'mode_of_payment',
      Customer: 'customer',
      Quotation: 'quotation',
      SalesOrder: 'sales_order',
      SalesInvoice: 'sales_invoice',
      Supplier: 'supplier',
      PurchaseOrder: 'purchase_order',
      PurchaseInvoice: 'purchase_invoice',
      Item: 'item',
      Warehouse: 'warehouse',
      StockLedgerEntry: 'stock_ledger_entry',
      StockEntry: 'stock_entry',
      DeliveryNote: 'delivery_note',
      PurchaseReceipt: 'purchase_receipt',
      MaterialRequest: 'material_request',
      SerialNo: 'serial_no',
      Batch: 'batch',
      PaymentEntry: 'payment_entry',
      JournalEntry: 'journal_entry',
      PaymentRequest: 'payment_request',
      GLEntry: 'gl_entry',
      PaymentLedgerEntry: 'payment_ledger_entry',
      FiscalYear: 'fiscal_year',
      PricingRule: 'pricing_rule',
      BankAccount: 'bank_account',
      BankTransaction: 'bank_transaction',
      BankTransactionRule: 'bank_transaction_rule',
    }

    const table = map[doctype]
    if (table) return table

    // Fallback: lowercase first letter
    return doctype.charAt(0).toLowerCase() + doctype.slice(1)
  }
}

// ============================================================
// AccountsController
// ============================================================

export class AccountsController extends BaseController {
  // ----------------------------------------------------------
  // Tax Calculations
  // ----------------------------------------------------------

  async calculate_taxes_and_totals(doc: DocumentWithTaxes): Promise<void> {
    await this.calculate_net_total(doc)
    await this.calculate_taxes(doc)
    await this.calculate_grand_total(doc)
    await this.calculate_outstanding_amount(doc as DocumentWithPayments)
  }

  protected async calculate_net_total(doc: DocumentWithTaxes): Promise<void> {
    if (!doc.items || !Array.isArray(doc.items)) {
      doc.net_total = 0
      return
    }

    let netTotal = 0
    for (const item of doc.items) {
      const qty = flt(item.qty)
      const rate = flt(item.rate)
      const amount = flt(qty * rate)
      item.amount = amount
      netTotal += amount
    }
    doc.net_total = flt(netTotal)
  }

  protected async calculate_taxes(doc: DocumentWithTaxes): Promise<void> {
    if (!doc.taxes || !Array.isArray(doc.taxes) || doc.taxes.length === 0) {
      doc.total_taxes_and_charges = 0
      return
    }

    let totalTax = 0
    for (const tax of doc.taxes) {
      const rate = flt(tax.rate)
      let taxAmount = 0

      switch (tax.charge_type) {
        case 'On Net Total':
          taxAmount = flt((doc.net_total || 0) * rate / 100)
          break
        case 'On Previous Row Amount':
          taxAmount = flt((doc.taxes?.[doc.taxes.indexOf(tax) - 1]?.amount || 0) * rate / 100)
          break
        case 'Actual':
          taxAmount = flt(tax.amount || 0)
          break
        default:
          taxAmount = flt((doc.net_total || 0) * rate / 100)
      }

      tax.amount = taxAmount
      tax.tax_amount = taxAmount
      totalTax += taxAmount
    }

    doc.total_taxes_and_charges = flt(totalTax)
  }

  async calculate_grand_total(doc: DocumentWithTaxes): Promise<void> {
    const netTotal = flt(doc.net_total || 0)
    const totalTax = flt(doc.total_taxes_and_charges || 0)
    doc.grand_total = flt(netTotal + totalTax)
    doc.base_grand_total = flt(doc.grand_total * flt(doc.conversion_rate || 1))
    doc.rounded_total = round(doc.grand_total || 0)
  }

  async calculate_outstanding_amount(doc: DocumentWithPayments): Promise<void> {
    let paidAmount = 0
    if (doc.payments && Array.isArray(doc.payments)) {
      for (const payment of doc.payments) {
        paidAmount += flt(payment.amount)
      }
    }
    doc.paid_amount = flt(paidAmount)
    doc.outstanding_amount = flt((doc.grand_total || 0) - paidAmount)
  }

  // ----------------------------------------------------------
  // Tax Helpers
  // ----------------------------------------------------------

  async get_tax_rate(account_head: string): Promise<number> {
    const taxRate = await this.get_value('Account', account_head, 'tax_rate')
    return flt(taxRate)
  }

  async get_taxes_and_charges(template_name: string): Promise<TaxRow[]> {
    const tableName = `${template_name.toLowerCase().replace(/ /g, '_')}_detail` as never
    try {
      const store = await this.ensureStore()
      const results = await store.query<Record<string, unknown>>(tableName as never, {})
      return results.map((row) => ({
        charge_type: row.charge_type as string,
        account_head: row.account_head as string,
        rate: flt(row.rate),
        amount: 0,
        tax_amount: 0,
        description: row.description as string,
        cost_center: row.cost_center as string,
      }))
    } catch {
      return []
    }
  }

  // ----------------------------------------------------------
  // Payment Entry / Journal Entry
  // ----------------------------------------------------------

  async make_payment_entry(doc: DocumentWithPayments): Promise<BaseDocument> {
    const partyType = (doc as Record<string, unknown>).customer ? 'Customer' : 'Supplier'
    const party = (doc as Record<string, unknown>).customer || (doc as Record<string, unknown>).supplier

    const pe: BaseDocument = {
      __doctype: 'PaymentEntry',
      payment_type: 'Receive',
      party_type: partyType,
      party: party as string,
      party_name: (doc as Record<string, unknown>).customer_name || (doc as Record<string, unknown>).supplier_name,
      company: doc.company,
      posting_date: nowdate(),
      posting_time: nowtime(),
      paid_amount: doc.grand_total || 0,
      received_amount: doc.grand_total || 0,
      source_exchange_rate: 1,
      target_exchange_rate: 1,
      cost_center: doc.cost_center,
      docstatus: 0,
    }

    return await this.insert(pe)
  }

  async make_journal_entry(doc: DocumentWithPayments): Promise<BaseDocument> {
    const je: BaseDocument = {
      __doctype: 'JournalEntry',
      voucher_type: 'Journal Entry',
      company: doc.company,
      posting_date: nowdate(),
      posting_time: nowtime(),
      total_debit: doc.grand_total || 0,
      total_credit: doc.grand_total || 0,
      docstatus: 0,
    }

    return await this.insert(je)
  }

  // ----------------------------------------------------------
  // Payment Terms
  // ----------------------------------------------------------

  async get_payment_terms(
    terms_template: string,
    grand_total: number
  ): Promise<Array<{ payment_term: string; due_date: string; amount: number }>> {
    if (!terms_template || grand_total <= 0) return []

    try {
      const store = await this.ensureStore()
      const terms = await store.query<Record<string, unknown>>(
        'payment_terms_template_detail' as never,
        { filters: [{ field: 'parent', operator: '=', value: terms_template }] } as never
      )

      if (terms.length === 0) return []

      const totalBase = terms.reduce((sum, t) => sum + flt(t.base_portion || 100), 0)
      const today = new Date()

      return terms.map((term) => {
        const portion = flt(term.base_portion || 100) / totalBase
        const dueDays = cint(term.due_date || 0)
        const dueDate = add_days(today, dueDays)

        return {
          payment_term: term.payment_term as string,
          due_date: dueDate,
          amount: flt(grand_total * portion),
        }
      })
    } catch {
      return []
    }
  }

  // ----------------------------------------------------------
  // Company Defaults
  // ----------------------------------------------------------

  async get_default_taxes_and_charges(company: string): Promise<string | null> {
    const result = await this.get_value('Company', company, 'default_sales_taxes_and_charges_template')
    return result as string | null
  }

  async get_round_off_applicable_accounts(company: string): Promise<string[]> {
    try {
      const store = await this.ensureStore()
      const results = await store.query<Record<string, unknown>>('account' as never, {
        filters: [
          { field: 'company', operator: '=', value: company },
          { field: 'account_type', operator: '=', value: 'Round Off' },
        ],
      } as never)
      return results.map((r) => r.name as string)
    } catch {
      return []
    }
  }

  async get_company_default(company: string, field: string): Promise<unknown> {
    return await this.get_value('Company', company, field)
  }

  async get_fiscal_year(date: string): Promise<string | null> {
    try {
      const store = await this.ensureStore()
      const results = await store.query<Record<string, unknown>>('fiscal_year' as never, {
        filters: [
          { field: 'disabled', operator: '=', value: 0 },
        ],
      } as never)

      for (const fy of results) {
        if (date >= (fy.year_start_date as string) && date <= (fy.year_end_date as string)) {
          return fy.name as string
        }
      }
      return null
    } catch {
      return null
    }
  }

  async get_exchange_rate(
    from_currency: string,
    to_currency: string,
    date?: string
  ): Promise<number> {
    if (from_currency === to_currency) return 1
    // In a real implementation, this would call an exchange rate API
    // For now, return 1 as default
    return 1
  }
}

// ============================================================
// SellingController
// ============================================================

export class SellingController extends AccountsController {
  // ----------------------------------------------------------
  // Customer Details
  // ----------------------------------------------------------

  async get_customer_details(
    customer: string,
    company: string
  ): Promise<Record<string, unknown>> {
    const store = await this.ensureStore()
    const customerDoc = await store.get<Record<string, unknown>>('customer' as never, customer)

    if (!customerDoc) {
      throw new Error(`Customer ${customer} not found`)
    }

    // Get customer account for company
    let defaultIncomeAccount: string | null = null
    try {
      const accounts = await store.query<Record<string, unknown>>('customer_account' as never, {
        filters: [
          { field: 'parent', operator: '=', value: customer },
          { field: 'company', operator: '=', value: company },
        ],
      } as never)
      if (accounts.length > 0) {
        defaultIncomeAccount = accounts[0].account as string
      }
    } catch {
      // Ignore
    }

    // Get credit limit
    let creditLimit = 0
    try {
      const creditLimits = await store.query<Record<string, unknown>>('customer_credit_limit' as never, {
        filters: [
          { field: 'parent', operator: '=', value: customer },
          { field: 'company', operator: '=', value: company },
        ],
      } as never)
      if (creditLimits.length > 0) {
        creditLimit = flt(creditLimits[0].credit_limit)
      }
    } catch {
      // Ignore
    }

    return {
      name: customerDoc.name,
      customer_name: customerDoc.customer_name,
      customer_group: customerDoc.customer_group,
      territory: customerDoc.territory,
      default_currency: customerDoc.default_currency,
      default_price_list: customerDoc.default_price_list,
      tax_id: customerDoc.tax_id,
      tax_category: customerDoc.tax_category,
      payment_terms: customerDoc.payment_terms,
      loyalty_program: customerDoc.loyalty_program,
      default_income_account: defaultIncomeAccount,
      credit_limit: creditLimit,
    }
  }

  // ----------------------------------------------------------
  // Item Details (Selling)
  // ----------------------------------------------------------

  async get_item_details(
    item_code: string,
    company: string,
    customer?: string,
    warehouse?: string
  ): Promise<Record<string, unknown>> {
    const store = await this.ensureStore()
    const itemDoc = await store.get<Record<string, unknown>>('item' as never, item_code)

    if (!itemDoc) {
      throw new Error(`Item ${item_code} not found`)
    }

    // Get item defaults
    let defaultWarehouse = warehouse || null
    let defaultIncomeAccount: string | null = null
    let defaultExpenseAccount: string | null = null
    let defaultCostCenter: string | null = null

    try {
      const defaults = await store.query<Record<string, unknown>>('item_default' as never, {
        filters: [
          { field: 'parent', operator: '=', value: item_code },
          { field: 'company', operator: '=', value: company },
        ],
      } as never)
      if (defaults.length > 0) {
        defaultWarehouse = defaultWarehouse || defaults[0].default_warehouse as string
        defaultIncomeAccount = defaults[0].default_income_account as string
        defaultExpenseAccount = defaults[0].default_expense_account as string
        defaultCostCenter = defaults[0].default_cost_center as string
      }
    } catch {
      // Ignore
    }

    // Get selling price
    let rate = flt(itemDoc.standard_rate)
    const priceList = itemDoc.default_price_list || 'Standard Selling'

    try {
      const prices = await store.query<Record<string, unknown>>('item_price' as never, {
        filters: [
          { field: 'item_code', operator: '=', value: item_code },
          { field: 'price_list', operator: '=', value: priceList },
        ],
      } as never)
      if (prices.length > 0) {
        rate = flt(prices[0].price_list_rate)
      }
    } catch {
      // Ignore
    }

    return {
      item_code: itemDoc.item_code,
      item_name: itemDoc.item_name,
      description: itemDoc.description,
      stock_uom: itemDoc.stock_uom,
      is_stock_item: itemDoc.is_stock_item,
      has_batch_no: itemDoc.has_batch_no,
      has_serial_no: itemDoc.has_serial_no,
      rate,
      warehouse: defaultWarehouse,
      income_account: defaultIncomeAccount,
      expense_account: defaultExpenseAccount,
      cost_center: defaultCostCenter,
      conversion_factor: 1,
      uom: itemDoc.stock_uom,
    }
  }

  // ----------------------------------------------------------
  // Credit Limit Validation
  // ----------------------------------------------------------

  async validate_customer_credit_limit(doc: DocumentWithPayments): Promise<void> {
    const customer = String(doc.customer || '')
    const company = String(doc.company || '')
    if (!customer || !company) return

    const details = await this.get_customer_details(customer, company)
    const creditLimit = flt(details.credit_limit)

    if (creditLimit <= 0) return

    // Get outstanding amount (existing + current)
    const store = await this.ensureStore()
    let totalOutstanding = 0

    try {
      const invoices = await store.query<Record<string, unknown>>('sales_invoice' as never, {
        filters: [
          { field: 'customer', operator: '=', value: customer },
          { field: 'company', operator: '=', value: company },
          { field: 'docstatus', operator: '=', value: 1 },
          { field: 'status', operator: '!=', value: 'Cancelled' },
        ],
      } as never)

      for (const inv of invoices) {
        totalOutstanding += flt(inv.outstanding_amount)
      }
    } catch {
      // Ignore
    }

    const currentDocTotal = flt(doc.grand_total)
    const projectedOutstanding = totalOutstanding + currentDocTotal

    if (projectedOutstanding > creditLimit) {
      throw new Error(
        `Credit limit exceeded for customer ${customer}. ` +
        `Limit: ${fmt_money(creditLimit)}, Outstanding: ${fmt_money(totalOutstanding)}, ` +
        `Current: ${fmt_money(currentDocTotal)}`
      )
    }
  }

  // ----------------------------------------------------------
  // Create Delivery Note / Sales Invoice
  // ----------------------------------------------------------

  async make_delivery_note(doc: DocumentWithItems): Promise<BaseDocument> {
    const dn: BaseDocument = {
      __doctype: 'DeliveryNote',
      customer: doc.customer,
      customer_name: (doc as Record<string, unknown>).customer_name,
      company: doc.company,
      posting_date: nowdate(),
      posting_time: nowtime(),
      currency: (doc as Record<string, unknown>).currency,
      selling_price_list: (doc as Record<string, unknown>).selling_price_list,
      conversion_rate: (doc as Record<string, unknown>).conversion_rate || 1,
      taxes_and_charges: doc.taxes_and_charges,
      docstatus: 0,
      items: [],
    }

    if (doc.items && Array.isArray(doc.items)) {
      dn.items = doc.items.map((item) => ({
        item_code: item.item_code,
        item_name: item.item_name,
        description: item.description,
        qty: item.qty,
        rate: item.rate,
        amount: item.amount,
        warehouse: item.warehouse,
        uom: item.uom,
        conversion_factor: item.conversion_factor || 1,
        cost_center: item.cost_center,
        batch_no: item.batch_no,
        serial_no: item.serial_no,
      }))
    }

    return await this.insert(dn)
  }

  async make_sales_invoice(doc: DocumentWithItems): Promise<BaseDocument> {
    const si: BaseDocument = {
      __doctype: 'SalesInvoice',
      customer: doc.customer,
      customer_name: (doc as Record<string, unknown>).customer_name,
      company: doc.company,
      posting_date: nowdate(),
      posting_time: nowtime(),
      due_date: add_days(nowdate(), 30),
      currency: (doc as Record<string, unknown>).currency,
      selling_price_list: (doc as Record<string, unknown>).selling_price_list,
      conversion_rate: (doc as Record<string, unknown>).conversion_rate || 1,
      taxes_and_charges: doc.taxes_and_charges,
      debit_to: (doc as Record<string, unknown>).debit_to,
      docstatus: 0,
      items: [],
    }

    if (doc.items && Array.isArray(doc.items)) {
      si.items = doc.items.map((item) => ({
        item_code: item.item_code,
        item_name: item.item_name,
        description: item.description,
        qty: item.qty,
        rate: item.rate,
        amount: item.amount,
        warehouse: item.warehouse,
        uom: item.uom,
        conversion_factor: item.conversion_factor || 1,
        cost_center: item.cost_center,
        income_account: item.income_account,
        expense_account: item.expense_account,
        batch_no: item.batch_no,
        serial_no: item.serial_no,
      }))
    }

    return await this.insert(si)
  }
}

// ============================================================
// BuyingController
// ============================================================

export class BuyingController extends AccountsController {
  // ----------------------------------------------------------
  // Supplier Details
  // ----------------------------------------------------------

  async get_supplier_details(supplier: string): Promise<Record<string, unknown>> {
    const store = await this.ensureStore()
    const supplierDoc = await store.get<Record<string, unknown>>('supplier' as never, supplier)

    if (!supplierDoc) {
      throw new Error(`Supplier ${supplier} not found`)
    }

    return {
      name: supplierDoc.name,
      supplier_name: supplierDoc.supplier_name,
      supplier_type: supplierDoc.supplier_type,
      supplier_group: supplierDoc.supplier_group,
      country: supplierDoc.country,
      default_currency: supplierDoc.default_currency,
      default_price_list: supplierDoc.default_price_list,
      tax_id: supplierDoc.tax_id,
      tax_category: supplierDoc.tax_category,
      payment_terms: supplierDoc.payment_terms,
      on_hold: supplierDoc.on_hold,
    }
  }

  // ----------------------------------------------------------
  // Item Details (Buying)
  // ----------------------------------------------------------

  async get_item_details(
    item_code: string,
    company: string,
    supplier?: string,
    warehouse?: string
  ): Promise<Record<string, unknown>> {
    const store = await this.ensureStore()
    const itemDoc = await store.get<Record<string, unknown>>('item' as never, item_code)

    if (!itemDoc) {
      throw new Error(`Item ${item_code} not found`)
    }

    // Get item defaults
    let defaultWarehouse = warehouse || null
    let defaultExpenseAccount: string | null = null
    let defaultCostCenter: string | null = null

    try {
      const defaults = await store.query<Record<string, unknown>>('item_default' as never, {
        filters: [
          { field: 'parent', operator: '=', value: item_code },
          { field: 'company', operator: '=', value: company },
        ],
      } as never)
      if (defaults.length > 0) {
        defaultWarehouse = defaultWarehouse || defaults[0].default_warehouse as string
        defaultExpenseAccount = defaults[0].default_expense_account as string
        defaultCostCenter = defaults[0].default_cost_center as string
      }
    } catch {
      // Ignore
    }

    // Get buying price
    let rate = flt(itemDoc.valuation_rate) || flt(itemDoc.standard_rate)
    const priceList = itemDoc.default_price_list || 'Standard Buying'

    try {
      const prices = await store.query<Record<string, unknown>>('item_price' as never, {
        filters: [
          { field: 'item_code', operator: '=', value: item_code },
          { field: 'price_list', operator: '=', value: priceList },
        ],
      } as never)
      if (prices.length > 0) {
        rate = flt(prices[0].price_list_rate)
      }
    } catch {
      // Ignore
    }

    // Get supplier-specific code
    let supplierPartNo: string | null = null
    if (supplier) {
      try {
        const supplierItems = await store.query<Record<string, unknown>>('item_supplier' as never, {
          filters: [
            { field: 'parent', operator: '=', value: item_code },
            { field: 'supplier', operator: '=', value: supplier },
          ],
        } as never)
        if (supplierItems.length > 0) {
          supplierPartNo = supplierItems[0].supplier_code as string
        }
      } catch {
        // Ignore
      }
    }

    return {
      item_code: itemDoc.item_code,
      item_name: itemDoc.item_name,
      description: itemDoc.description,
      stock_uom: itemDoc.stock_uom,
      is_stock_item: itemDoc.is_stock_item,
      has_batch_no: itemDoc.has_batch_no,
      has_serial_no: itemDoc.has_serial_no,
      rate,
      warehouse: defaultWarehouse,
      expense_account: defaultExpenseAccount,
      cost_center: defaultCostCenter,
      conversion_factor: 1,
      uom: itemDoc.stock_uom,
      supplier_part_no: supplierPartNo,
    }
  }

  // ----------------------------------------------------------
  // Supplier Scorecard Validation
  // ----------------------------------------------------------

  async validate_supplier_scorecard(supplier: string): Promise<boolean> {
    const details = await this.get_supplier_details(supplier)
    if (details.on_hold) {
      throw new Error(`Supplier ${supplier} is on hold`)
    }
    return true
  }

  // ----------------------------------------------------------
  // Create Purchase Receipt / Purchase Invoice
  // ----------------------------------------------------------

  async make_purchase_receipt(doc: DocumentWithItems): Promise<BaseDocument> {
    const pr: BaseDocument = {
      __doctype: 'PurchaseReceipt',
      supplier: doc.supplier,
      supplier_name: (doc as Record<string, unknown>).supplier_name,
      company: doc.company,
      posting_date: nowdate(),
      posting_time: nowtime(),
      currency: (doc as Record<string, unknown>).currency,
      buying_price_list: (doc as Record<string, unknown>).buying_price_list,
      conversion_rate: (doc as Record<string, unknown>).conversion_rate || 1,
      taxes_and_charges: doc.taxes_and_charges,
      docstatus: 0,
      items: [],
    }

    if (doc.items && Array.isArray(doc.items)) {
      pr.items = doc.items.map((item) => ({
        item_code: item.item_code,
        item_name: item.item_name,
        description: item.description,
        qty: item.qty,
        rate: item.rate,
        amount: item.amount,
        warehouse: item.warehouse,
        uom: item.uom,
        conversion_factor: item.conversion_factor || 1,
        cost_center: item.cost_center,
        batch_no: item.batch_no,
        serial_no: item.serial_no,
      }))
    }

    return await this.insert(pr)
  }

  async make_purchase_invoice(doc: DocumentWithItems): Promise<BaseDocument> {
    const pi: BaseDocument = {
      __doctype: 'PurchaseInvoice',
      supplier: doc.supplier,
      supplier_name: (doc as Record<string, unknown>).supplier_name,
      company: doc.company,
      posting_date: nowdate(),
      posting_time: nowtime(),
      due_date: add_days(nowdate(), 30),
      currency: (doc as Record<string, unknown>).currency,
      buying_price_list: (doc as Record<string, unknown>).buying_price_list,
      conversion_rate: (doc as Record<string, unknown>).conversion_rate || 1,
      taxes_and_charges: doc.taxes_and_charges,
      credit_to: (doc as Record<string, unknown>).credit_to,
      docstatus: 0,
      items: [],
    }

    if (doc.items && Array.isArray(doc.items)) {
      pi.items = doc.items.map((item) => ({
        item_code: item.item_code,
        item_name: item.item_name,
        description: item.description,
        qty: item.qty,
        rate: item.rate,
        amount: item.amount,
        warehouse: item.warehouse,
        uom: item.uom,
        conversion_factor: item.conversion_factor || 1,
        cost_center: item.cost_center,
        expense_account: item.expense_account,
        batch_no: item.batch_no,
        serial_no: item.serial_no,
      }))
    }

    return await this.insert(pi)
  }
}

// ============================================================
// StockController
// ============================================================

export class StockController extends BaseController {
  // ----------------------------------------------------------
  // Stock Ledger Entries
  // ----------------------------------------------------------

  async get_stock_ledger_entry(
    voucher_type: string,
    voucher_no: string
  ): Promise<Record<string, unknown>[]> {
    const store = await this.ensureStore()
    return await store.query<Record<string, unknown>>('stock_ledger_entry' as never, {
      filters: [
        { field: 'voucher_type', operator: '=', value: voucher_type },
        { field: 'voucher_no', operator: '=', value: voucher_no },
        { field: 'is_cancelled', operator: '=', value: 0 },
      ],
      orderBy: { field: 'posting_date', direction: 'asc' },
    } as never)
  }

  async get_last_stock_ledger_entry(
    item_code: string,
    warehouse: string
  ): Promise<Record<string, unknown> | null> {
    const store = await this.ensureStore()
    const results = await store.query<Record<string, unknown>>('stock_ledger_entry' as never, {
      filters: [
        { field: 'item_code', operator: '=', value: item_code },
        { field: 'warehouse', operator: '=', value: warehouse },
        { field: 'is_cancelled', operator: '=', value: 0 },
      ],
      orderBy: { field: 'posting_date', direction: 'desc' },
      limit: 1,
    } as never)

    return results.length > 0 ? results[0] : null
  }

  // ----------------------------------------------------------
  // Bin / Stock Balances
  // ----------------------------------------------------------

  async get_bin_details(
    item_code: string,
    warehouse?: string
  ): Promise<Record<string, unknown>[]> {
    const store = await this.ensureStore()
    const filters: FilterCondition[] = [
      { field: 'item_code', operator: '=', value: item_code },
    ]

    if (warehouse) {
      filters.push({ field: 'warehouse', operator: '=', value: warehouse })
    }

    // Calculate from SLEs
    const sleResults = await store.query<Record<string, unknown>>('stock_ledger_entry' as never, {
      filters: [
        ...filters,
        { field: 'is_cancelled', operator: '=', value: 0 },
      ],
      orderBy: { field: 'posting_date', direction: 'asc' },
    } as never)

    // Group by warehouse
    const binMap: Record<string, Record<string, unknown>> = {}
    for (const sle of sleResults) {
      const wh = sle.warehouse as string
      if (!binMap[wh]) {
        binMap[wh] = {
          item_code,
          warehouse: wh,
          actual_qty: 0,
          valuation_rate: 0,
          stock_value: 0,
        }
      }
      binMap[wh].actual_qty = flt(binMap[wh].actual_qty) + flt(sle.actual_qty)
      binMap[wh].valuation_rate = flt(sle.valuation_rate)
      binMap[wh].stock_value = flt(sle.stock_value)
    }

    return Object.values(binMap)
  }

  // ----------------------------------------------------------
  // Incoming Rate / Valuation
  // ----------------------------------------------------------

  async get_incoming_rate(
    item_code: string,
    warehouse: string,
    posting_date: string,
    posting_time?: string
  ): Promise<number> {
    const store = await this.ensureStore()
    const results = await store.query<Record<string, unknown>>('stock_ledger_entry' as never, {
      filters: [
        { field: 'item_code', operator: '=', value: item_code },
        { field: 'warehouse', operator: '=', value: warehouse },
        { field: 'posting_date', operator: '<=', value: posting_date },
        { field: 'is_cancelled', operator: '=', value: 0 },
      ],
      orderBy: { field: 'creation', direction: 'desc' },
      limit: 1,
    } as never)

    if (results.length > 0) {
      return flt(results[0].valuation_rate)
    }

    return 0
  }

  async get_valuation_rate(item_code: string, warehouse: string): Promise<number> {
    const lastSle = await this.get_last_stock_ledger_entry(item_code, warehouse)
    if (lastSle) {
      return flt(lastSle.valuation_rate)
    }

    // Fallback to item valuation rate
    const itemValRate = await this.get_value('Item', item_code, 'valuation_rate')
    return flt(itemValRate)
  }

  // ----------------------------------------------------------
  // Serial No / Batch No Validation
  // ----------------------------------------------------------

  async validate_serial_no_batch_no(doc: DocumentWithItems): Promise<void> {
    if (!doc.items || !Array.isArray(doc.items)) return

    for (const item of doc.items) {
      const itemCode = String(item.item_code || '')
      if (!itemCode) continue

      const itemDoc = await this.get_value('Item', itemCode, '*') as Record<string, unknown>
      if (!itemDoc) continue

      if (itemDoc.has_serial_no && itemDoc.has_serial_no !== 0) {
        if (!item.serial_no && flt(item.qty) > 0) {
          throw new Error(`Serial No is required for item ${itemCode}`)
        }
      }

      if (itemDoc.has_batch_no && itemDoc.has_batch_no !== 0) {
        if (!item.batch_no && flt(item.qty) > 0) {
          throw new Error(`Batch No is required for item ${itemCode}`)
        }
      }
    }
  }

  // ----------------------------------------------------------
  // Warehouse Validation
  // ----------------------------------------------------------

  async validate_warehouse(doc: DocumentWithItems): Promise<void> {
    if (!doc.items || !Array.isArray(doc.items)) return

    const warehouseSet = new Set<string>()
    for (const item of doc.items) {
      if (item.warehouse) warehouseSet.add(String(item.warehouse))
    }

    const warehouses = Array.from(warehouseSet)
    for (const wh of warehouses) {
      const exists = await this.get_value('Warehouse', wh, 'name')
      if (!exists) {
        throw new Error(`Warehouse ${wh} does not exist`)
      }
    }
  }

  // ----------------------------------------------------------
  // Create Stock Entry
  // ----------------------------------------------------------

  async make_stock_entry(doc: DocumentWithItems): Promise<BaseDocument> {
    const se: BaseDocument = {
      __doctype: 'StockEntry',
      stock_entry_type: (doc as Record<string, unknown>).stock_entry_type || 'Material Transfer',
      company: doc.company,
      posting_date: nowdate(),
      posting_time: nowtime(),
      from_warehouse: (doc as Record<string, unknown>).from_warehouse,
      to_warehouse: (doc as Record<string, unknown>).to_warehouse,
      purpose: (doc as Record<string, unknown>).purpose || 'Material Transfer',
      docstatus: 0,
      items: [],
    }

    if (doc.items && Array.isArray(doc.items)) {
      se.items = doc.items.map((item) => ({
        item_code: item.item_code,
        item_name: item.item_name,
        qty: item.qty,
        s_warehouse: item.warehouse || (doc as Record<string, unknown>).from_warehouse,
        t_warehouse: (doc as Record<string, unknown>).to_warehouse,
        transfer_qty: flt(item.qty) * flt(item.conversion_factor || 1),
        uom: item.uom,
        conversion_factor: item.conversion_factor || 1,
        batch_no: item.batch_no,
        serial_no: item.serial_no,
        cost_center: item.cost_center,
      }))
    }

    return await this.insert(se)
  }

  // ----------------------------------------------------------
  // Update Stock Ledger Entry
  // ----------------------------------------------------------

  async update_stock_ledger_entry(doc: BaseDocument): Promise<void> {
    const store = await this.ensureStore()
    const existing = await store.get<Record<string, unknown>>('stock_ledger_entry' as never, doc.name as string)

    if (!existing) {
      throw new Error(`Stock Ledger Entry ${doc.name} not found`)
    }

    // Update the SLE
    const updated = { ...existing, ...doc, modified: now_datetime() }
    await store.put('stock_ledger_entry' as never, updated as Record<string, unknown> & { name: string })
  }
}
