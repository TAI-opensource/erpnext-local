import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import Dexie, { Table } from 'dexie';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type DatabaseStatus = 'idle' | 'initializing' | 'ready' | 'syncing' | 'error';

export interface DatabaseStats {
  tables: string[];
  records: Record<string, number>;
  totalRecords: number;
  estimatedSizeKB: number;
  lastSync: Date | null;
  lastBackup: Date | null;
}

export interface DatabaseBackup {
  version: string;
  timestamp: Date;
  sqliteData: Uint8Array;
  indexedDbData: Record<string, unknown[]>;
  metadata: {
    tables: string[];
    totalRecords: number;
  };
}

export interface DatabaseEvent {
  type: 'onReady' | 'onSync' | 'onBackup' | 'onError';
  timestamp: Date;
  data?: unknown;
}

export type DatabaseEventHandler = (event: DatabaseEvent) => void;

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  primaryKey?: string;
}

export interface ColumnSchema {
  name: string;
  type: 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB';
  notNull?: boolean;
  defaultValue?: unknown;
  unique?: boolean;
}

// ============================================================================
// IndexedDB Store (Dexie)
// ============================================================================

class IndexedDBStore extends Dexie {
  sqliteStore!: Table<Uint8Array, string>;
  metadataStore!: Table<{ key: string; value: unknown }, string>;

  constructor() {
    super('ERPNextBankingDB');
    this.version(1).stores({
      sqliteStore: 'key',
      metadataStore: 'key',
    });
  }
}

// ============================================================================
// Schema Definitions - 21 ERPNext Modules
// ============================================================================

const TABLE_SCHEMAS: TableSchema[] = [
  // Core
  {
    name: 'company',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'company_name', type: 'TEXT', notNull: true },
      { name: 'abbr', type: 'TEXT', notNull: true },
      { name: 'default_currency', type: 'TEXT', notNull: true, defaultValue: 'BRL' },
      { name: 'country', type: 'TEXT', notNull: true, defaultValue: 'Brazil' },
      { name: 'default_cost_center', type: 'TEXT' },
      { name: 'default_bank_account', type: 'TEXT' },
      { name: 'domain', type: 'TEXT', defaultValue: 'Accounting' },
      { name: 'chart_of_accounts', type: 'TEXT' },
      { name: 'created_at', type: 'TEXT', notNull: true },
      { name: 'modified_at', type: 'TEXT', notNull: true },
    ],
  },
  {
    name: 'account',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'account_name', type: 'TEXT', notNull: true },
      { name: 'account_type', type: 'TEXT', notNull: true },
      { name: 'account_subtype', type: 'TEXT' },
      { name: 'root_type', type: 'TEXT', notNull: true },
      { name: 'company', type: 'TEXT', notNull: true },
      { name: 'parent_account', type: 'TEXT' },
      { name: 'is_group', type: 'INTEGER', defaultValue: 0 },
      { name: 'is_system_account', type: 'INTEGER', defaultValue: 0 },
      { name: 'disabled', type: 'INTEGER', defaultValue: 0 },
      { name: 'currency', type: 'TEXT' },
      { name: 'balance', type: 'REAL', defaultValue: 0 },
      { name: 'created_at', type: 'TEXT', notNull: true },
      { name: 'modified_at', type: 'TEXT', notNull: true },
    ],
  },
  // Setup
  {
    name: 'uom',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'uom_name', type: 'TEXT', notNull: true },
      { name: 'enabled', type: 'INTEGER', defaultValue: 1 },
      { name: 'must_be_whole_number', type: 'INTEGER', defaultValue: 0 },
    ],
  },
  {
    name: 'currency',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'currency_name', type: 'TEXT', notNull: true },
      { name: 'enabled', type: 'INTEGER', defaultValue: 1 },
      { name: 'fraction', type: 'TEXT' },
      { name: 'fraction_units', type: 'INTEGER', defaultValue: 100 },
      { name: 'symbol', type: 'TEXT' },
      { name: 'symbol_on_right', type: 'INTEGER', defaultValue: 0 },
      { name: 'number_format', type: 'TEXT', defaultValue: '#,###.##' },
    ],
  },
  {
    name: 'price_list',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'price_list_name', type: 'TEXT', notNull: true },
      { name: 'enabled', type: 'INTEGER', defaultValue: 1 },
      { name: 'currency', type: 'TEXT', notNull: true },
      { name: 'selling', type: 'INTEGER', defaultValue: 0 },
      { name: 'buying', type: 'INTEGER', defaultValue: 0 },
    ],
  },
  {
    name: 'user',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'email', type: 'TEXT', notNull: true },
      { name: 'full_name', type: 'TEXT' },
      { name: 'role_profile', type: 'TEXT' },
      { name: 'enabled', type: 'INTEGER', defaultValue: 1 },
      { name: 'last_active', type: 'TEXT' },
      { name: 'user_type', type: 'TEXT', defaultValue: 'System User' },
    ],
  },
  // Accounts
  {
    name: 'journal_entry',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'voucher_type', type: 'TEXT', defaultValue: 'Journal Entry' },
      { name: 'posting_date', type: 'TEXT', notNull: true },
      { name: 'company', type: 'TEXT', notNull: true },
      { name: 'total_debit', type: 'REAL', defaultValue: 0 },
      { name: 'total_credit', type: 'REAL', defaultValue: 0 },
      { name: 'status', type: 'TEXT', defaultValue: 'Draft' },
      { name: 'docstatus', type: 'INTEGER', defaultValue: 0 },
      { name: 'remarks', type: 'TEXT' },
      { name: 'created_at', type: 'TEXT', notNull: true },
      { name: 'modified_at', type: 'TEXT', notNull: true },
    ],
  },
  {
    name: 'journal_entry_account',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'parent', type: 'TEXT', notNull: true },
      { name: 'account', type: 'TEXT', notNull: true },
      { name: 'debit', type: 'REAL', defaultValue: 0 },
      { name: 'credit', type: 'REAL', defaultValue: 0 },
      { name: 'debit_in_account_currency', type: 'REAL', defaultValue: 0 },
      { name: 'credit_in_account_currency', type: 'REAL', defaultValue: 0 },
      { name: 'cost_center', type: 'TEXT' },
    ],
  },
  {
    name: 'payment_entry',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'payment_type', type: 'TEXT', notNull: true },
      { name: 'posting_date', type: 'TEXT', notNull: true },
      { name: 'party_type', type: 'TEXT' },
      { name: 'party', type: 'TEXT' },
      { name: 'paid_from', type: 'TEXT' },
      { name: 'paid_to', type: 'TEXT' },
      { name: 'paid_amount', type: 'REAL', defaultValue: 0 },
      { name: 'received_amount', type: 'REAL', defaultValue: 0 },
      { name: 'source_exchange_rate', type: 'REAL', defaultValue: 1 },
      { name: 'target_exchange_rate', type: 'REAL', defaultValue: 1 },
      { name: 'status', type: 'TEXT', defaultValue: 'Draft' },
      { name: 'docstatus', type: 'INTEGER', defaultValue: 0 },
      { name: 'company', type: 'TEXT' },
      { name: 'mode_of_payment', type: 'TEXT' },
      { name: 'reference_doctype', type: 'TEXT' },
      { name: 'reference_name', type: 'TEXT' },
      { name: 'created_at', type: 'TEXT', notNull: true },
      { name: 'modified_at', type: 'TEXT', notNull: true },
    ],
  },
  // Banking
  {
    name: 'bank_account',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'account_name', type: 'TEXT', notNull: true },
      { name: 'bank', type: 'TEXT' },
      { name: 'bank_account_no', type: 'TEXT' },
      { name: 'iban', type: 'TEXT' },
      { name: 'swift_code', type: 'TEXT' },
      { name: 'company', type: 'TEXT', notNull: true },
      { name: 'account_currency', type: 'TEXT', notNull: true },
      { name: 'account_type', type: 'TEXT' },
      { name: 'is_default', type: 'INTEGER', defaultValue: 0 },
      { name: 'is_company_account', type: 'INTEGER', defaultValue: 0 },
      { name: 'balance', type: 'REAL', defaultValue: 0 },
      { name: 'disabled', type: 'INTEGER', defaultValue: 0 },
      { name: 'created_at', type: 'TEXT', notNull: true },
      { name: 'modified_at', type: 'TEXT', notNull: true },
    ],
  },
  {
    name: 'bank',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'bank_name', type: 'TEXT', notNull: true },
      { name: 'swift_number', type: 'TEXT' },
      { name: 'country', type: 'TEXT' },
      { name: 'website', type: 'TEXT' },
    ],
  },
  {
    name: 'bank_transaction',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'date', type: 'TEXT', notNull: true },
      { name: 'bank_account', type: 'TEXT', notNull: true },
      { name: 'deposit', type: 'REAL', defaultValue: 0 },
      { name: 'withdrawal', type: 'REAL', defaultValue: 0 },
      { name: 'balance', type: 'REAL', defaultValue: 0 },
      { name: 'currency', type: 'TEXT' },
      { name: 'description', type: 'TEXT' },
      { name: 'reference_number', type: 'TEXT' },
      { name: 'status', type: 'TEXT', defaultValue: 'Pending' },
      { name: 'party_type', type: 'TEXT' },
      { name: 'party', type: 'TEXT' },
      { name: 'account_type', type: 'TEXT' },
      { name: 'allocations', type: 'TEXT' },
      { name: 'created_at', type: 'TEXT', notNull: true },
      { name: 'modified_at', type: 'TEXT', notNull: true },
    ],
  },
  {
    name: 'bank_statement_import',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'bank_account', type: 'TEXT', notNull: true },
      { name: 'file_name', type: 'TEXT' },
      { name: 'file_type', type: 'TEXT' },
      { name: 'status', type: 'TEXT', defaultValue: 'Pending' },
      { name: 'total_transactions', type: 'INTEGER', defaultValue: 0 },
      { name: 'imported_transactions', type: 'INTEGER', defaultValue: 0 },
      { name: 'failed_transactions', type: 'INTEGER', defaultValue: 0 },
      { name: 'error_log', type: 'TEXT' },
      { name: 'company', type: 'TEXT' },
      { name: 'created_at', type: 'TEXT', notNull: true },
      { name: 'modified_at', type: 'TEXT', notNull: true },
    ],
  },
  {
    name: 'bank_reconciliation',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'bank_account', type: 'TEXT', notNull: true },
      { name: 'bank_transaction', type: 'TEXT', notNull: true },
      { name: 'reference_doctype', type: 'TEXT' },
      { name: 'reference_name', type: 'TEXT' },
      { name: 'allocated_amount', type: 'REAL', defaultValue: 0 },
      { name: 'status', type: 'TEXT', defaultValue: 'Pending' },
      { name: 'reconciled_by', type: 'TEXT' },
      { name: 'reconciled_on', type: 'TEXT' },
      { name: 'created_at', type: 'TEXT', notNull: true },
    ],
  },
  // Selling
  {
    name: 'customer',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'customer_name', type: 'TEXT', notNull: true },
      { name: 'customer_type', type: 'TEXT', defaultValue: 'Individual' },
      { name: 'customer_group', type: 'TEXT' },
      { name: 'territory', type: 'TEXT' },
      { name: 'default_currency', type: 'TEXT' },
      { name: 'default_price_list', type: 'TEXT' },
      { name: 'tax_id', type: 'TEXT' },
      { name: 'disabled', type: 'INTEGER', defaultValue: 0 },
      { name: 'created_at', type: 'TEXT', notNull: true },
      { name: 'modified_at', type: 'TEXT', notNull: true },
    ],
  },
  {
    name: 'sales_order',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'customer', type: 'TEXT', notNull: true },
      { name: 'order_date', type: 'TEXT', notNull: true },
      { name: 'delivery_date', type: 'TEXT' },
      { name: 'company', type: 'TEXT', notNull: true },
      { name: 'currency', type: 'TEXT', notNull: true },
      { name: 'grand_total', type: 'REAL', defaultValue: 0 },
      { name: 'status', type: 'TEXT', defaultValue: 'Draft' },
      { name: 'docstatus', type: 'INTEGER', defaultValue: 0 },
      { name: 'created_at', type: 'TEXT', notNull: true },
      { name: 'modified_at', type: 'TEXT', notNull: true },
    ],
  },
  {
    name: 'sales_invoice',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'customer', type: 'TEXT', notNull: true },
      { name: 'posting_date', type: 'TEXT', notNull: true },
      { name: 'company', type: 'TEXT', notNull: true },
      { name: 'currency', type: 'TEXT', notNull: true },
      { name: 'grand_total', type: 'REAL', defaultValue: 0 },
      { name: 'outstanding_amount', type: 'REAL', defaultValue: 0 },
      { name: 'status', type: 'TEXT', defaultValue: 'Draft' },
      { name: 'docstatus', type: 'INTEGER', defaultValue: 0 },
      { name: 'is_paid', type: 'INTEGER', defaultValue: 0 },
      { name: 'created_at', type: 'TEXT', notNull: true },
      { name: 'modified_at', type: 'TEXT', notNull: true },
    ],
  },
  // Buying
  {
    name: 'supplier',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'supplier_name', type: 'TEXT', notNull: true },
      { name: 'supplier_type', type: 'TEXT', defaultValue: 'Individual' },
      { name: 'supplier_group', type: 'TEXT' },
      { name: 'territory', type: 'TEXT' },
      { name: 'default_currency', type: 'TEXT' },
      { name: 'default_price_list', type: 'TEXT' },
      { name: 'tax_id', type: 'TEXT' },
      { name: 'disabled', type: 'INTEGER', defaultValue: 0 },
      { name: 'created_at', type: 'TEXT', notNull: true },
      { name: 'modified_at', type: 'TEXT', notNull: true },
    ],
  },
  {
    name: 'purchase_order',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'supplier', type: 'TEXT', notNull: true },
      { name: 'transaction_date', type: 'TEXT', notNull: true },
      { name: 'schedule_date', type: 'TEXT' },
      { name: 'company', type: 'TEXT', notNull: true },
      { name: 'currency', type: 'TEXT', notNull: true },
      { name: 'grand_total', type: 'REAL', defaultValue: 0 },
      { name: 'status', type: 'TEXT', defaultValue: 'Draft' },
      { name: 'docstatus', type: 'INTEGER', defaultValue: 0 },
      { name: 'created_at', type: 'TEXT', notNull: true },
      { name: 'modified_at', type: 'TEXT', notNull: true },
    ],
  },
  {
    name: 'purchase_invoice',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'supplier', type: 'TEXT', notNull: true },
      { name: 'posting_date', type: 'TEXT', notNull: true },
      { name: 'company', type: 'TEXT', notNull: true },
      { name: 'currency', type: 'TEXT', notNull: true },
      { name: 'grand_total', type: 'REAL', defaultValue: 0 },
      { name: 'outstanding_amount', type: 'REAL', defaultValue: 0 },
      { name: 'status', type: 'TEXT', defaultValue: 'Draft' },
      { name: 'docstatus', type: 'INTEGER', defaultValue: 0 },
      { name: 'is_paid', type: 'INTEGER', defaultValue: 0 },
      { name: 'created_at', type: 'TEXT', notNull: true },
      { name: 'modified_at', type: 'TEXT', notNull: true },
    ],
  },
  // Stock
  {
    name: 'item',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'item_name', type: 'TEXT', notNull: true },
      { name: 'item_code', type: 'TEXT', notNull: true },
      { name: 'item_group', type: 'TEXT' },
      { name: 'stock_uom', type: 'TEXT', notNull: true },
      { name: 'is_stock_item', type: 'INTEGER', defaultValue: 1 },
      { name: 'is_fixed_asset', type: 'INTEGER', defaultValue: 0 },
      { name: 'disabled', type: 'INTEGER', defaultValue: 0 },
      { name: 'description', type: 'TEXT' },
      { name: 'created_at', type: 'TEXT', notNull: true },
      { name: 'modified_at', type: 'TEXT', notNull: true },
    ],
  },
  {
    name: 'item_price',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'item_code', type: 'TEXT', notNull: true },
      { name: 'price_list', type: 'TEXT', notNull: true },
      { name: 'price_list_rate', type: 'REAL', defaultValue: 0 },
      { name: 'currency', type: 'TEXT', notNull: true },
      { name: 'uom', type: 'TEXT' },
      { name: 'valid_from', type: 'TEXT' },
      { name: 'disable', type: 'INTEGER', defaultValue: 0 },
    ],
  },
  // HR
  {
    name: 'employee',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'employee_name', type: 'TEXT', notNull: true },
      { name: 'company', type: 'TEXT', notNull: true },
      { name: 'department', type: 'TEXT' },
      { name: 'designation', type: 'TEXT' },
      { name: 'date_of_joining', type: 'TEXT' },
      { name: 'status', type: 'TEXT', defaultValue: 'Active' },
      { name: 'user_id', type: 'TEXT' },
      { name: 'created_at', type: 'TEXT', notNull: true },
      { name: 'modified_at', type: 'TEXT', notNull: true },
    ],
  },
  // Assets
  {
    name: 'asset',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'asset_name', type: 'TEXT', notNull: true },
      { name: 'asset_category', type: 'TEXT' },
      { name: 'company', type: 'TEXT', notNull: true },
      { name: 'purchase_date', type: 'TEXT' },
      { name: 'gross_purchase_amount', type: 'REAL', defaultValue: 0 },
      { name: 'asset_value', type: 'REAL', defaultValue: 0 },
      { name: 'status', type: 'TEXT', defaultValue: 'Draft' },
      { name: 'location', type: 'TEXT' },
      { name: 'created_at', type: 'TEXT', notNull: true },
      { name: 'modified_at', type: 'TEXT', notNull: true },
    ],
  },
  // Tax
  {
    name: 'tax_template',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'title', type: 'TEXT', notNull: true },
      { name: 'company', type: 'TEXT' },
      { name: 'taxes', type: 'TEXT' },
    ],
  },
  // Doctype
  {
    name: 'custom_field',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'dt', type: 'TEXT', notNull: true },
      { name: 'fieldname', type: 'TEXT', notNull: true },
      { name: 'label', type: 'TEXT' },
      { name: 'fieldtype', type: 'TEXT', notNull: true },
      { name: 'options', type: 'TEXT' },
      { name: 'default', type: 'TEXT' },
      { name: 'reqd', type: 'INTEGER', defaultValue: 0 },
      { name: 'hidden', type: 'INTEGER', defaultValue: 0 },
    ],
  },
];

// ============================================================================
// Index Definitions
// ============================================================================

const TABLE_INDEXES: Record<string, string[]> = {
  account: ['company', 'root_type', 'account_type', 'parent_account'],
  bank_account: ['company', 'bank'],
  bank_transaction: ['bank_account', 'date', 'status'],
  bank_statement_import: ['bank_account', 'status'],
  bank_reconciliation: ['bank_account', 'bank_transaction', 'status'],
  journal_entry: ['company', 'posting_date', 'status'],
  journal_entry_account: ['parent', 'account'],
  payment_entry: ['company', 'posting_date', 'party_type', 'party'],
  customer: ['customer_group', 'territory'],
  supplier: ['supplier_group', 'territory'],
  sales_invoice: ['customer', 'posting_date', 'status'],
  purchase_invoice: ['supplier', 'posting_date', 'status'],
  sales_order: ['customer', 'order_date', 'status'],
  purchase_order: ['supplier', 'transaction_date', 'status'],
  item: ['item_group', 'item_code'],
  item_price: ['item_code', 'price_list'],
  employee: ['company', 'department', 'status'],
  asset: ['company', 'asset_category', 'status'],
};

// ============================================================================
// Seed Data
// ============================================================================

function generateSeedData(): Record<string, unknown[]> {
  const now = new Date().toISOString();

  return {
    company: [
      {
        name: '_Test Company',
        company_name: '_Test Company',
        abbr: '_TC',
        default_currency: 'BRL',
        country: 'Brazil',
        domain: 'Accounting',
        created_at: now,
        modified_at: now,
      },
    ],
    account: [
      { name: 'Root Assets', account_name: 'Root Assets', account_type: '', root_type: 'Asset', company: '_Test Company', is_group: 1, is_system_account: 1, created_at: now, modified_at: now },
      { name: '_TC - Bank', account_name: 'Bank', account_type: 'Bank', root_type: 'Asset', company: '_Test Company', parent_account: 'Root Assets', is_group: 0, is_system_account: 1, currency: 'BRL', created_at: now, modified_at: now },
      { name: '_TC - Cash', account_name: 'Cash', account_type: 'Cash', root_type: 'Asset', company: '_Test Company', parent_account: 'Root Assets', is_group: 0, is_system_account: 1, currency: 'BRL', created_at: now, modified_at: now },
      { name: '_TC - Receivable', account_name: 'Receivable', account_type: 'Receivable', root_type: 'Asset', company: '_Test Company', parent_account: 'Root Assets', is_group: 0, is_system_account: 1, currency: 'BRL', created_at: now, modified_at: now },
      { name: 'Root Liabilities', account_name: 'Root Liabilities', account_type: '', root_type: 'Liability', company: '_Test Company', is_group: 1, is_system_account: 1, created_at: now, modified_at: now },
      { name: '_TC - Payable', account_name: 'Payable', account_type: 'Payable', root_type: 'Liability', company: '_Test Company', parent_account: 'Root Liabilities', is_group: 0, is_system_account: 1, currency: 'BRL', created_at: now, modified_at: now },
      { name: 'Root Equity', account_name: 'Root Equity', account_type: '', root_type: 'Equity', company: '_Test Company', is_group: 1, is_system_account: 1, created_at: now, modified_at: now },
      { name: '_TC - Equity', account_name: 'Equity', account_type: '', root_type: 'Equity', company: '_Test Company', parent_account: 'Root Equity', is_group: 0, is_system_account: 1, currency: 'BRL', created_at: now, modified_at: now },
      { name: 'Root Income', account_name: 'Root Income', account_type: '', root_type: 'Income', company: '_Test Company', is_group: 1, is_system_account: 1, created_at: now, modified_at: now },
      { name: '_TC - Sales', account_name: 'Sales', account_type: '', root_type: 'Income', company: '_Test Company', parent_account: 'Root Income', is_group: 0, is_system_account: 1, currency: 'BRL', created_at: now, modified_at: now },
      { name: 'Root Expense', account_name: 'Root Expense', account_type: '', root_type: 'Expense', company: '_Test Company', is_group: 1, is_system_account: 1, created_at: now, modified_at: now },
      { name: '_TC - Cost of Goods Sold', account_name: 'Cost of Goods Sold', account_type: '', root_type: 'Expense', company: '_Test Company', parent_account: 'Root Expense', is_group: 0, is_system_account: 1, currency: 'BRL', created_at: now, modified_at: now },
    ],
    uom: [
      { name: 'Nos', uom_name: 'Nos', enabled: 1, must_be_whole_number: 0 },
      { name: 'Kg', uom_name: 'Kg', enabled: 1, must_be_whole_number: 0 },
      { name: 'Ltr', uom_name: 'Ltr', enabled: 1, must_be_whole_number: 0 },
      { name: 'Box', uom_name: 'Box', enabled: 1, must_be_whole_number: 1 },
      { name: 'Set', uom_name: 'Set', enabled: 1, must_be_whole_number: 1 },
      { name: 'Pair', uom_name: 'Pair', enabled: 1, must_be_whole_number: 1 },
      { name: 'Unit', uom_name: 'Unit', enabled: 1, must_be_whole_number: 1 },
      { name: 'Hour', uom_name: 'Hour', enabled: 1, must_be_whole_number: 0 },
      { name: 'Day', uom_name: 'Day', enabled: 1, must_be_whole_number: 0 },
      { name: 'Month', uom_name: 'Month', enabled: 1, must_be_whole_number: 1 },
      { name: 'Gm', uom_name: 'Gm', enabled: 1, must_be_whole_number: 0 },
      { name: 'Sqft', uom_name: 'Sqft', enabled: 1, must_be_whole_number: 0 },
      { name: 'Rft', uom_name: 'Rft', enabled: 1, must_be_whole_number: 0 },
      { name: 'Ton', uom_name: 'Ton', enabled: 1, must_be_whole_number: 0 },
    ],
    currency: [
      { name: 'BRL', currency_name: 'Brazilian Real', enabled: 1, fraction: 'Centavo', fraction_units: 100, symbol: 'R$', symbol_on_right: 0, number_format: '#,###.##' },
      { name: 'USD', currency_name: 'US Dollar', enabled: 1, fraction: 'Cent', fraction_units: 100, symbol: '$', symbol_on_right: 0, number_format: '#,###.##' },
      { name: 'EUR', currency_name: 'Euro', enabled: 1, fraction: 'Cent', fraction_units: 100, symbol: '\u20AC', symbol_on_right: 0, number_format: '#.###,##' },
      { name: 'GBP', currency_name: 'Pound Sterling', enabled: 1, fraction: 'Pence', fraction_units: 100, symbol: '\u00A3', symbol_on_right: 0, number_format: '#,###.##' },
      { name: 'JPY', currency_name: 'Japanese Yen', enabled: 1, fraction: 'Sen', fraction_units: 100, symbol: '\u00A5', symbol_on_right: 0, number_format: '#,###' },
      { name: 'ARS', currency_name: 'Argentine Peso', enabled: 1, fraction: 'Centavo', fraction_units: 100, symbol: 'AR$', symbol_on_right: 0, number_format: '#.###,##' },
      { name: 'CLP', currency_name: 'Chilean Peso', enabled: 1, fraction: 'Centavo', fraction_units: 100, symbol: 'CL$', symbol_on_right: 0, number_format: '#.###' },
      { name: 'COP', currency_name: 'Colombian Peso', enabled: 1, fraction: 'Centavo', fraction_units: 100, symbol: 'CO$', symbol_on_right: 0, number_format: '#.###,##' },
    ],
    price_list: [
      { name: 'Standard Selling', price_list_name: 'Standard Selling', enabled: 1, currency: 'BRL', selling: 1, buying: 0 },
      { name: 'Standard Buying', price_list_name: 'Standard Buying', enabled: 1, currency: 'BRL', selling: 0, buying: 1 },
    ],
    user: [
      {
        name: 'Administrator',
        email: 'administrator@example.com',
        full_name: 'Administrator',
        role_profile: 'System Manager',
        enabled: 1,
        user_type: 'System User',
      },
    ],
    bank: [
      { name: 'Banco do Brasil', bank_name: 'Banco do Brasil', country: 'Brazil' },
      { name: 'Itau Unibanco', bank_name: 'Itau Unibanco', country: 'Brazil' },
      { name: 'Bradesco', bank_name: 'Bradesco', country: 'Brazil' },
      { name: 'Caixa Economica Federal', bank_name: 'Caixa Economica Federal', country: 'Brazil' },
      { name: 'Banco Santander', bank_name: 'Banco Santander', country: 'Brazil' },
      { name: 'Banco Inter', bank_name: 'Banco Inter', country: 'Brazil' },
      { name: 'Nubank', bank_name: 'Nubank', country: 'Brazil' },
    ],
  };
}

// ============================================================================
// DatabaseManager Class
// ============================================================================

export class DatabaseManager {
  private static instance: DatabaseManager | null = null;
  private static MAX_INSTANCES = 1;

  private sql: SqlJsStatic | null = null;
  private db: Database | null = null;
  private indexedDb: IndexedDBStore | null = null;
  private status: DatabaseStatus = 'idle';
  private eventHandlers: DatabaseEventHandler[] = [];
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private backupInterval: ReturnType<typeof setInterval> | null = null;
  private lastSync: Date | null = null;
  private lastBackup: Date | null = null;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      if (DatabaseManager.MAX_INSTANCES <= 0) {
        throw new Error('Maximum DatabaseManager instances reached');
      }
      DatabaseManager.instance = new DatabaseManager();
      DatabaseManager.MAX_INSTANCES--;
    }
    return DatabaseManager.instance;
  }

  static resetInstance(): void {
    DatabaseManager.instance = null;
    DatabaseManager.MAX_INSTANCES = 1;
  }

  // --------------------------------------------------------------------------
  // Event System
  // --------------------------------------------------------------------------

  on(eventType: DatabaseEvent['type'], handler: DatabaseEventHandler): () => void {
    const filteredHandler: DatabaseEventHandler = (event) => {
      if (event.type === eventType) {
        handler(event);
      }
    };
    this.eventHandlers.push(filteredHandler);
    return () => {
      this.eventHandlers = this.eventHandlers.filter((h) => h !== filteredHandler);
    };
  }

  private emit(type: DatabaseEvent['type'], data?: unknown): void {
    const event: DatabaseEvent = { type, timestamp: new Date(), data };
    this.eventHandlers.forEach((handler) => {
      try {
        handler(event);
      } catch (err) {
        console.error(`Error in DatabaseManager event handler [${type}]:`, err);
      }
    });
  }

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------

  async init(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._doInit();
    return this.initializationPromise;
  }

  private async _doInit(): Promise<void> {
    try {
      this.setStatus('initializing');

      // 1. Initialize IndexedDB
      this.indexedDb = new IndexedDBStore();
      await this.indexedDb.open();

      // 2. Initialize SQLite WASM
      this.sql = await initSqlJs({
        locateFile: (file: string) => `/wasm/${file}`,
      });

      // 3. Try to load SQLite from IndexedDB
      const savedData = await this.loadSQLiteFromIndexedDb();
      if (savedData) {
        this.db = new this.sql.Database(savedData);
      } else {
        this.db = new this.sql.Database();
        await this.createTables();
        await this.seedData();
        await this.createIndexes();
      }

      this.setStatus('ready');
      this.emit('onReady', { message: 'Database initialized successfully' });

      // 4. Start periodic sync and backup
      this.startPeriodicSync(30_000);
      this.startPeriodicBackup(300_000);

      // 5. Persist current state
      await this.persistSQLiteToIndexedDb();
    } catch (error) {
      this.setStatus('error');
      this.emit('onError', error);
      throw error;
    }
  }

  private setStatus(status: DatabaseStatus): void {
    this.status = status;
  }

  // --------------------------------------------------------------------------
  // Table Creation from Schemas
  // --------------------------------------------------------------------------

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    for (const schema of TABLE_SCHEMAS) {
      const columnDefs = schema.columns
        .map((col) => {
          const parts = [col.name, col.type];
          if (col.notNull) parts.push('NOT NULL');
          if (col.unique) parts.push('UNIQUE');
          if (col.defaultValue !== undefined) {
            parts.push(`DEFAULT ${typeof col.defaultValue === 'string' ? `'${col.defaultValue}'` : col.defaultValue}`);
          }
          return parts.join(' ');
        })
        .join(', ');

      const pkClause = schema.primaryKey ? `, PRIMARY KEY (${schema.primaryKey})` : '';
      const sql = `CREATE TABLE IF NOT EXISTS ${schema.name} (${columnDefs}${pkClause});`;
      this.db.run(sql);
    }
  }

  // --------------------------------------------------------------------------
  // Seed Data
  // --------------------------------------------------------------------------

  private async seedData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const seedData = generateSeedData();

    for (const [tableName, rows] of Object.entries(seedData)) {
      if (!rows.length) continue;

      const columns = Object.keys(rows[0]);
      const placeholders = columns.map(() => '?').join(', ');
      const sql = `INSERT OR IGNORE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders});`;

      for (const row of rows) {
        const values = columns.map((col) => (row as Record<string, unknown>)[col] ?? null);
        this.db.run(sql, values);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Index Creation
  // --------------------------------------------------------------------------

  private async createIndexes(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    for (const [tableName, indexColumns] of Object.entries(TABLE_INDEXES)) {
      for (const column of indexColumns) {
        const indexName = `idx_${tableName}_${column}`;
        const sql = `CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${column});`;
        this.db.run(sql);
      }
    }
  }

  // --------------------------------------------------------------------------
  // SQLite <-> IndexedDB Persistence
  // --------------------------------------------------------------------------

  private async persistSQLiteToIndexedDb(): Promise<void> {
    if (!this.db || !this.indexedDb) return;

    try {
      const data = this.db.export();
      await this.indexedDb.sqliteStore.put({ key: 'main', value: new Uint8Array(data) });
      await this.indexedDb.metadataStore.put({ key: 'lastSave', value: new Date().toISOString() });
    } catch (error) {
      console.error('Failed to persist SQLite to IndexedDB:', error);
    }
  }

  private async loadSQLiteFromIndexedDb(): Promise<Uint8Array | null> {
    if (!this.indexedDb) return null;

    try {
      const entry = await this.indexedDb.sqliteStore.get('main');
      return entry?.value ?? null;
    } catch {
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // Sync
  // --------------------------------------------------------------------------

  async sync(): Promise<void> {
    if (this.status === 'syncing') return;

    try {
      this.setStatus('syncing');

      // Persist SQLite state to IndexedDB
      await this.persistSQLiteToIndexedDb();

      this.lastSync = new Date();
      this.setStatus('ready');

      this.emit('onSync', {
        timestamp: this.lastSync,
        message: 'Sync completed successfully',
      });
    } catch (error) {
      this.setStatus('error');
      this.emit('onError', error);
      throw error;
    }
  }

  private startPeriodicSync(intervalMs: number): void {
    this.stopPeriodicSync();
    this.syncInterval = setInterval(() => {
      this.sync().catch(console.error);
    }, intervalMs);
  }

  private stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // --------------------------------------------------------------------------
  // Backup & Restore
  // --------------------------------------------------------------------------

  async backup(): Promise<DatabaseBackup> {
    if (!this.db || !this.indexedDb) {
      throw new Error('Database not initialized');
    }

    try {
      const sqliteData = this.db.export();

      const indexedDbData: Record<string, unknown[]> = {};
      for (const storeName of ['metadataStore']) {
        const store = this.indexedDb[storeName as 'metadataStore'];
        const allItems = await store.toArray();
        indexedDbData[storeName] = allItems;
      }

      const backup: DatabaseBackup = {
        version: '1.0.0',
        timestamp: new Date(),
        sqliteData: new Uint8Array(sqliteData),
        indexedDbData,
        metadata: {
          tables: TABLE_SCHEMAS.map((s) => s.name),
          totalRecords: this.countAllRecords(),
        },
      };

      this.lastBackup = new Date();
      this.emit('onBackup', { timestamp: this.lastBackup, message: 'Backup created' });

      return backup;
    } catch (error) {
      this.emit('onError', error);
      throw error;
    }
  }

  async restore(backup: DatabaseBackup): Promise<void> {
    if (!this.sql || !this.indexedDb) {
      throw new Error('Database not initialized');
    }

    try {
      this.setStatus('initializing');

      // Destroy current database
      if (this.db) {
        this.db.close();
      }

      // Restore SQLite from backup
      this.db = new this.sql.Database(backup.sqliteData);

      // Persist to IndexedDB
      await this.persistSQLiteToIndexedDb();

      this.setStatus('ready');
      this.emit('onReady', { message: 'Database restored from backup' });
    } catch (error) {
      this.setStatus('error');
      this.emit('onError', error);
      throw error;
    }
  }

  private startPeriodicBackup(intervalMs: number): void {
    this.stopPeriodicBackup();
    this.backupInterval = setInterval(() => {
      this.backup().catch(console.error);
    }, intervalMs);
  }

  private stopPeriodicBackup(): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
    }
  }

  // --------------------------------------------------------------------------
  // Reset
  // --------------------------------------------------------------------------

  async reset(): Promise<void> {
    try {
      this.stopPeriodicSync();
      this.stopPeriodicBackup();

      if (this.db) {
        this.db.close();
        this.db = null;
      }

      if (this.indexedDb) {
        await this.indexedDb.sqliteStore.clear();
        await this.indexedDb.metadataStore.clear();
        this.indexedDb.close();
        this.indexedDb = null;
      }

      DatabaseManager.resetInstance();
    } catch (error) {
      this.emit('onError', error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // Status & Stats
  // --------------------------------------------------------------------------

  getStatus(): { status: DatabaseStatus; lastSync: Date | null; lastBackup: Date | null } {
    return {
      status: this.status,
      lastSync: this.lastSync,
      lastBackup: this.lastBackup,
    };
  }

  getStats(): DatabaseStats {
    const tables = TABLE_SCHEMAS.map((s) => s.name);
    const records: Record<string, number> = {};
    let totalRecords = 0;

    for (const tableName of tables) {
      const count = this.getTableRecordCount(tableName);
      records[tableName] = count;
      totalRecords += count;
    }

    return {
      tables,
      records,
      totalRecords,
      estimatedSizeKB: this.estimateSizeKB(),
      lastSync: this.lastSync,
      lastBackup: this.lastBackup,
    };
  }

  private getTableRecordCount(tableName: string): number {
    if (!this.db) return 0;
    try {
      const result = this.db.exec(`SELECT COUNT(*) as cnt FROM ${tableName};`);
      if (result.length > 0 && result[0].values.length > 0) {
        return result[0].values[0][0] as number;
      }
    } catch {
      // Table might not exist yet
    }
    return 0;
  }

  private countAllRecords(): number {
    let total = 0;
    for (const schema of TABLE_SCHEMAS) {
      total += this.getTableRecordCount(schema.name);
    }
    return total;
  }

  private estimateSizeKB(): number {
    if (!this.db) return 0;
    try {
      const exported = this.db.export();
      return Math.round(exported.byteLength / 1024);
    } catch {
      return 0;
    }
  }

  // --------------------------------------------------------------------------
  // Getters
  // --------------------------------------------------------------------------

  getSQLite(): Database | null {
    return this.db;
  }

  getIndexedDB(): IndexedDBStore | null {
    return this.indexedDb;
  }

  // --------------------------------------------------------------------------
  // Direct Query Helpers
  // --------------------------------------------------------------------------

  execute(sql: string, params?: unknown[]): unknown[][] {
    if (!this.db) throw new Error('Database not initialized');
    const result = this.db.exec(sql, params as never[]);
    if (result.length === 0) return [];
    return result[0].values;
  }

  executeWithHeaders(sql: string, params?: unknown[]): { columns: string[]; values: unknown[][] } {
    if (!this.db) throw new Error('Database not initialized');
    const result = this.db.exec(sql, params as never[]);
    if (result.length === 0) return { columns: [], values: [] };
    return { columns: result[0].columns, values: result[0].values };
  }

  run(sql: string, params?: unknown[]): void {
    if (!this.db) throw new Error('Database not initialized');
    this.db.run(sql, params as never[]);
  }

  getRow(tableName: string, name: string): Record<string, unknown> | null {
    if (!this.db) throw new Error('Database not initialized');
    const result = this.db.exec(`SELECT * FROM ${tableName} WHERE name = ?;`, [name]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    const columns = result[0].columns;
    const row = result[0].values[0];
    const record: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      record[col] = row[i];
    });
    return record;
  }

  getRows(tableName: string, filters?: Record<string, unknown>): Record<string, unknown>[] {
    if (!this.db) throw new Error('Database not initialized');

    let sql = `SELECT * FROM ${tableName}`;
    const params: unknown[] = [];

    if (filters && Object.keys(filters).length > 0) {
      const conditions = Object.entries(filters).map(([key, value]) => {
        params.push(value);
        return `${key} = ?`;
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ';';

    const result = this.db.exec(sql, params as never[]);
    if (result.length === 0) return [];

    const columns = result[0].columns;
    return result[0].values.map((row) => {
      const record: Record<string, unknown> = {};
      columns.forEach((col, i) => {
        record[col] = row[i];
      });
      return record;
    });
  }

  insertRow(tableName: string, data: Record<string, unknown>): void {
    if (!this.db) throw new Error('Database not initialized');
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders});`;
    this.db.run(sql, values as never[]);
  }

  updateRow(tableName: string, name: string, data: Record<string, unknown>): void {
    if (!this.db) throw new Error('Database not initialized');
    const setClauses = Object.keys(data).map((key) => `${key} = ?`);
    const values = [...Object.values(data), name];
    const sql = `UPDATE ${tableName} SET ${setClauses.join(', ')} WHERE name = ?;`;
    this.db.run(sql, values as never[]);
  }

  deleteRow(tableName: string, name: string): void {
    if (!this.db) throw new Error('Database not initialized');
    this.db.run(`DELETE FROM ${tableName} WHERE name = ?;`, [name]);
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const databaseManager = DatabaseManager.getInstance();
