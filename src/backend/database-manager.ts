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
      { name: 'posting_time', type: 'TEXT' },
      { name: 'user_remark', type: 'TEXT' },
      { name: 'multi_currency', type: 'INTEGER', defaultValue: 0 },
      { name: 'creation', type: 'TEXT' },
      { name: 'modified', type: 'TEXT' },
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
      { name: 'parenttype', type: 'TEXT' },
      { name: 'account', type: 'TEXT', notNull: true },
      { name: 'debit', type: 'REAL', defaultValue: 0 },
      { name: 'credit', type: 'REAL', defaultValue: 0 },
      { name: 'debit_in_account_currency', type: 'REAL', defaultValue: 0 },
      { name: 'credit_in_account_currency', type: 'REAL', defaultValue: 0 },
      { name: 'cost_center', type: 'TEXT' },
      { name: 'party_type', type: 'TEXT' },
      { name: 'party', type: 'TEXT' },
      { name: 'exchange_rate', type: 'REAL', defaultValue: 1 },
      { name: 'account_currency', type: 'TEXT' },
      { name: 'project', type: 'TEXT' },
      { name: 'reference_type', type: 'TEXT' },
      { name: 'reference_name', type: 'TEXT' },
      { name: 'row_id', type: 'TEXT' },
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
      { name: 'party_name', type: 'TEXT' },
      { name: 'posting_time', type: 'TEXT' },
      { name: 'paid_from', type: 'TEXT' },
      { name: 'paid_from_account_currency', type: 'TEXT' },
      { name: 'paid_from_account', type: 'TEXT' },
      { name: 'paid_to', type: 'TEXT' },
      { name: 'paid_to_account_currency', type: 'TEXT' },
      { name: 'paid_to_account', type: 'TEXT' },
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
      { name: 'reference_no', type: 'TEXT' },
      { name: 'reference_date', type: 'TEXT' },
      { name: 'cost_center', type: 'TEXT' },
      { name: 'project', type: 'TEXT' },
      { name: 'creation', type: 'TEXT' },
      { name: 'modified', type: 'TEXT' },
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
      { name: 'account', type: 'TEXT' },
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
      { name: 'docstatus', type: 'INTEGER', defaultValue: 1 },
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
    name: 'quotation',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'quotation_to', type: 'TEXT' },
      { name: 'lead', type: 'TEXT' },
      { name: 'customer', type: 'TEXT' },
      { name: 'company', type: 'TEXT' },
      { name: 'transaction_date', type: 'TEXT' },
      { name: 'currency', type: 'TEXT' },
      { name: 'selling_price_list', type: 'TEXT' },
      { name: 'conversion_rate', type: 'REAL', defaultValue: 1 },
      { name: 'status', type: 'TEXT' },
      { name: 'taxes_and_charges', type: 'TEXT' },
      { name: 'tax_category', type: 'TEXT' },
      { name: 'payment_terms_template', type: 'TEXT' },
      { name: 'grand_total', type: 'REAL', defaultValue: 0 },
      { name: 'net_total', type: 'REAL', defaultValue: 0 },
      { name: 'docstatus', type: 'INTEGER', defaultValue: 0 },
      { name: 'creation', type: 'TEXT' },
      { name: 'modified', type: 'TEXT' },
    ],
  },
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
      { name: 'creation', type: 'TEXT' },
      { name: 'modified', type: 'TEXT' },
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
      { name: 'customer_name', type: 'TEXT' },
      { name: 'order_date', type: 'TEXT', notNull: true },
      { name: 'transaction_date', type: 'TEXT' },
      { name: 'delivery_date', type: 'TEXT' },
      { name: 'company', type: 'TEXT', notNull: true },
      { name: 'currency', type: 'TEXT', notNull: true },
      { name: 'grand_total', type: 'REAL', defaultValue: 0 },
      { name: 'status', type: 'TEXT', defaultValue: 'Draft' },
      { name: 'docstatus', type: 'INTEGER', defaultValue: 0 },
      { name: 'selling_price_list', type: 'TEXT' },
      { name: 'conversion_rate', type: 'REAL', defaultValue: 1 },
      { name: 'base_grand_total', type: 'REAL', defaultValue: 0 },
      { name: 'total_taxes_and_charges', type: 'REAL', defaultValue: 0 },
      { name: 'net_total', type: 'REAL', defaultValue: 0 },
      { name: 'advance_paid', type: 'REAL', defaultValue: 0 },
      { name: 'per_delivered', type: 'REAL', defaultValue: 0 },
      { name: 'per_billed', type: 'REAL', defaultValue: 0 },
      { name: 'taxes_and_charges', type: 'TEXT' },
      { name: 'tax_category', type: 'TEXT' },
      { name: 'payment_terms_template', type: 'TEXT' },
      { name: 'sales_partner', type: 'TEXT' },
      { name: 'commission_rate', type: 'REAL', defaultValue: 0 },
      { name: 'cost_center', type: 'TEXT' },
      { name: 'plc_conversion_rate', type: 'REAL', defaultValue: 1 },
      { name: 'creation', type: 'TEXT' },
      { name: 'modified', type: 'TEXT' },
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
      { name: 'customer_name', type: 'TEXT' },
      { name: 'posting_date', type: 'TEXT', notNull: true },
      { name: 'posting_time', type: 'TEXT' },
      { name: 'due_date', type: 'TEXT' },
      { name: 'company', type: 'TEXT', notNull: true },
      { name: 'currency', type: 'TEXT', notNull: true },
      { name: 'selling_price_list', type: 'TEXT' },
      { name: 'conversion_rate', type: 'REAL', defaultValue: 1 },
      { name: 'plc_conversion_rate', type: 'REAL', defaultValue: 1 },
      { name: 'taxes_and_charges', type: 'TEXT' },
      { name: 'tax_category', type: 'TEXT' },
      { name: 'debit_to', type: 'TEXT' },
      { name: 'grand_total', type: 'REAL', defaultValue: 0 },
      { name: 'base_grand_total', type: 'REAL', defaultValue: 0 },
      { name: 'total_taxes_and_charges', type: 'REAL', defaultValue: 0 },
      { name: 'net_total', type: 'REAL', defaultValue: 0 },
      { name: 'outstanding_amount', type: 'REAL', defaultValue: 0 },
      { name: 'paid_amount', type: 'REAL', defaultValue: 0 },
      { name: 'is_pos', type: 'INTEGER', defaultValue: 0 },
      { name: 'is_paid', type: 'INTEGER', defaultValue: 0 },
      { name: 'is_return', type: 'INTEGER', defaultValue: 0 },
      { name: 'return_against', type: 'TEXT' },
      { name: 'cost_center', type: 'TEXT' },
      { name: 'project', type: 'TEXT' },
      { name: 'status', type: 'TEXT', defaultValue: 'Draft' },
      { name: 'docstatus', type: 'INTEGER', defaultValue: 0 },
      { name: 'creation', type: 'TEXT' },
      { name: 'modified', type: 'TEXT' },
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
      { name: 'country', type: 'TEXT' },
      { name: 'territory', type: 'TEXT' },
      { name: 'default_currency', type: 'TEXT' },
      { name: 'default_price_list', type: 'TEXT' },
      { name: 'tax_id', type: 'TEXT' },
      { name: 'disabled', type: 'INTEGER', defaultValue: 0 },
      { name: 'creation', type: 'TEXT' },
      { name: 'modified', type: 'TEXT' },
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
      { name: 'supplier_name', type: 'TEXT' },
      { name: 'transaction_date', type: 'TEXT', notNull: true },
      { name: 'schedule_date', type: 'TEXT' },
      { name: 'company', type: 'TEXT', notNull: true },
      { name: 'currency', type: 'TEXT', notNull: true },
      { name: 'conversion_rate', type: 'REAL', defaultValue: 1 },
      { name: 'buying_price_list', type: 'TEXT' },
      { name: 'taxes_and_charges', type: 'TEXT' },
      { name: 'tax_category', type: 'TEXT' },
      { name: 'cost_center', type: 'TEXT' },
      { name: 'base_grand_total', type: 'REAL', defaultValue: 0 },
      { name: 'total_taxes_and_charges', type: 'REAL', defaultValue: 0 },
      { name: 'net_total', type: 'REAL', defaultValue: 0 },
      { name: 'grand_total', type: 'REAL', defaultValue: 0 },
      { name: 'status', type: 'TEXT', defaultValue: 'Draft' },
      { name: 'docstatus', type: 'INTEGER', defaultValue: 0 },
      { name: 'creation', type: 'TEXT' },
      { name: 'modified', type: 'TEXT' },
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
      { name: 'supplier_name', type: 'TEXT' },
      { name: 'posting_date', type: 'TEXT', notNull: true },
      { name: 'posting_time', type: 'TEXT' },
      { name: 'due_date', type: 'TEXT' },
      { name: 'company', type: 'TEXT', notNull: true },
      { name: 'currency', type: 'TEXT', notNull: true },
      { name: 'conversion_rate', type: 'REAL', defaultValue: 1 },
      { name: 'buying_price_list', type: 'TEXT' },
      { name: 'taxes_and_charges', type: 'TEXT' },
      { name: 'tax_category', type: 'TEXT' },
      { name: 'credit_to', type: 'TEXT' },
      { name: 'base_grand_total', type: 'REAL', defaultValue: 0 },
      { name: 'total_taxes_and_charges', type: 'REAL', defaultValue: 0 },
      { name: 'net_total', type: 'REAL', defaultValue: 0 },
      { name: 'grand_total', type: 'REAL', defaultValue: 0 },
      { name: 'outstanding_amount', type: 'REAL', defaultValue: 0 },
      { name: 'bill_no', type: 'TEXT' },
      { name: 'bill_date', type: 'TEXT' },
      { name: 'cost_center', type: 'TEXT' },
      { name: 'project', type: 'TEXT' },
      { name: 'status', type: 'TEXT', defaultValue: 'Draft' },
      { name: 'docstatus', type: 'INTEGER', defaultValue: 0 },
      { name: 'is_paid', type: 'INTEGER', defaultValue: 0 },
      { name: 'creation', type: 'TEXT' },
      { name: 'modified', type: 'TEXT' },
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
      { name: 'is_sales_item', type: 'INTEGER', defaultValue: 0 },
      { name: 'is_purchase_item', type: 'INTEGER', defaultValue: 0 },
      { name: 'standard_rate', type: 'REAL', defaultValue: 0 },
      { name: 'valuation_rate', type: 'REAL', defaultValue: 0 },
      { name: 'is_fixed_asset', type: 'INTEGER', defaultValue: 0 },
      { name: 'disabled', type: 'INTEGER', defaultValue: 0 },
      { name: 'description', type: 'TEXT' },
      { name: 'creation', type: 'TEXT' },
      { name: 'modified', type: 'TEXT' },
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
  {
    name: 'warehouse',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'warehouse_name', type: 'TEXT' },
      { name: 'company', type: 'TEXT' },
      { name: 'is_group', type: 'INTEGER', defaultValue: 0 },
      { name: 'parent_warehouse', type: 'TEXT' },
      { name: 'account', type: 'TEXT' },
      { name: 'disabled', type: 'INTEGER', defaultValue: 0 },
      { name: 'is_rejected_warehouse', type: 'INTEGER', defaultValue: 0 },
      { name: 'warehouse_type', type: 'TEXT' },
      { name: 'lft', type: 'INTEGER' },
      { name: 'rgt', type: 'INTEGER' },
      { name: 'creation', type: 'TEXT' },
      { name: 'modified', type: 'TEXT' },
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
      { name: 'creation', type: 'TEXT' },
      { name: 'modified', type: 'TEXT' },
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
  // Bank Transaction Rules
  {
    name: 'bank_transaction_rule',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'rule_name', type: 'TEXT' },
      { name: 'transaction_type', type: 'TEXT', defaultValue: 'Any' },
      { name: 'priority', type: 'INTEGER', defaultValue: 0 },
      { name: 'min_amount', type: 'REAL', defaultValue: 0 },
      { name: 'max_amount', type: 'REAL', defaultValue: 0 },
      { name: 'rule_description', type: 'TEXT' },
      { name: 'company', type: 'TEXT' },
      { name: 'classify_as', type: 'TEXT', defaultValue: 'Bank Entry' },
      { name: 'account', type: 'TEXT' },
      { name: 'bank_entry_type', type: 'TEXT' },
      { name: 'party_type', type: 'TEXT' },
      { name: 'party', type: 'TEXT' },
      { name: 'owner', type: 'TEXT' },
      { name: 'modified_by', type: 'TEXT' },
      { name: 'docstatus', type: 'INTEGER', defaultValue: 0 },
      { name: 'creation', type: 'TEXT' },
      { name: 'modified', type: 'TEXT' },
      { name: 'created_at', type: 'TEXT' },
      { name: 'modified_at', type: 'TEXT' },
      { name: 'description_rules', type: 'TEXT' },
      { name: 'accounts', type: 'TEXT' },
    ],
  },
  // Accounts Settings (Singleton)
  {
    name: 'accounts_settings',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'accounts_frozen_upto', type: 'TEXT' },
      { name: 'allow_cost_center_in_entry_of_sheet', type: 'INTEGER', defaultValue: 0 },
      { name: 'auto_process_incoming_bank_transfers', type: 'INTEGER', defaultValue: 0 },
      { name: 'transfer_match_days', type: 'INTEGER', defaultValue: 0 },
      { name: 'automatically_run_rules_on_unreconciled_transactions', type: 'INTEGER', defaultValue: 0 },
      { name: 'enable_party_matching', type: 'INTEGER', defaultValue: 0 },
      { name: 'enable_fuzzy_matching', type: 'INTEGER', defaultValue: 0 },
      { name: 'modified_at', type: 'TEXT' },
    ],
  },
  // Setup (missing)
  {
    name: 'country',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'country_name', type: 'TEXT' },
      { name: 'code', type: 'TEXT' },
    ],
  },
  {
    name: 'customer_group',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'customer_group_name', type: 'TEXT' },
      { name: 'is_group', type: 'INTEGER', defaultValue: 0 },
      { name: 'parent_customer_group', type: 'TEXT' },
      { name: 'lft', type: 'INTEGER' },
      { name: 'rgt', type: 'INTEGER' },
      { name: 'creation', type: 'TEXT' },
      { name: 'modified', type: 'TEXT' },
    ],
  },
  {
    name: 'item_group',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'item_group_name', type: 'TEXT' },
      { name: 'is_group', type: 'INTEGER', defaultValue: 0 },
      { name: 'parent_item_group', type: 'TEXT' },
      { name: 'lft', type: 'INTEGER' },
      { name: 'rgt', type: 'INTEGER' },
      { name: 'creation', type: 'TEXT' },
      { name: 'modified', type: 'TEXT' },
    ],
  },
  {
    name: 'cost_center',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'cost_center_name', type: 'TEXT' },
      { name: 'company', type: 'TEXT' },
      { name: 'is_group', type: 'INTEGER', defaultValue: 0 },
      { name: 'parent_cost_center', type: 'TEXT' },
      { name: 'lft', type: 'INTEGER' },
      { name: 'rgt', type: 'INTEGER' },
      { name: 'creation', type: 'TEXT' },
      { name: 'modified', type: 'TEXT' },
    ],
  },
  {
    name: 'fiscal_year',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'year_start_date', type: 'TEXT' },
      { name: 'year_end_date', type: 'TEXT' },
      { name: 'disabled', type: 'INTEGER', defaultValue: 0 },
    ],
  },
  // Selling (missing)
  {
    name: 'quotation_item',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'parent', type: 'TEXT', notNull: true },
      { name: 'parenttype', type: 'TEXT' },
      { name: 'item_code', type: 'TEXT' },
      { name: 'item_name', type: 'TEXT' },
      { name: 'description', type: 'TEXT' },
      { name: 'qty', type: 'REAL', defaultValue: 0 },
      { name: 'rate', type: 'REAL', defaultValue: 0 },
      { name: 'amount', type: 'REAL', defaultValue: 0 },
      { name: 'warehouse', type: 'TEXT' },
      { name: 'uom', type: 'TEXT' },
      { name: 'conversion_factor', type: 'REAL', defaultValue: 1 },
      { name: 'cost_center', type: 'TEXT' },
    ],
  },
  {
    name: 'sales_order_item',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'parent', type: 'TEXT', notNull: true },
      { name: 'parenttype', type: 'TEXT' },
      { name: 'item_code', type: 'TEXT' },
      { name: 'item_name', type: 'TEXT' },
      { name: 'description', type: 'TEXT' },
      { name: 'qty', type: 'REAL', defaultValue: 0 },
      { name: 'rate', type: 'REAL', defaultValue: 0 },
      { name: 'amount', type: 'REAL', defaultValue: 0 },
      { name: 'warehouse', type: 'TEXT' },
      { name: 'delivery_date', type: 'TEXT' },
      { name: 'qty_delivered', type: 'REAL', defaultValue: 0 },
      { name: 'qty_billed', type: 'REAL', defaultValue: 0 },
      { name: 'uom', type: 'TEXT' },
      { name: 'conversion_factor', type: 'REAL', defaultValue: 1 },
      { name: 'batch_no', type: 'TEXT' },
      { name: 'serial_no', type: 'TEXT' },
      { name: 'cost_center', type: 'TEXT' },
      { name: 'project', type: 'TEXT' },
      { name: 'row_id', type: 'TEXT' },
    ],
  },
  {
    name: 'sales_invoice_item',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'parent', type: 'TEXT', notNull: true },
      { name: 'parenttype', type: 'TEXT' },
      { name: 'item_code', type: 'TEXT' },
      { name: 'item_name', type: 'TEXT' },
      { name: 'description', type: 'TEXT' },
      { name: 'qty', type: 'REAL', defaultValue: 0 },
      { name: 'rate', type: 'REAL', defaultValue: 0 },
      { name: 'amount', type: 'REAL', defaultValue: 0 },
      { name: 'warehouse', type: 'TEXT' },
      { name: 'delivered_qty', type: 'REAL', defaultValue: 0 },
      { name: 'uom', type: 'TEXT' },
      { name: 'conversion_factor', type: 'REAL', defaultValue: 1 },
      { name: 'batch_no', type: 'TEXT' },
      { name: 'serial_no', type: 'TEXT' },
      { name: 'cost_center', type: 'TEXT' },
      { name: 'project', type: 'TEXT' },
      { name: 'income_account', type: 'TEXT' },
      { name: 'expense_account', type: 'TEXT' },
      { name: 'row_id', type: 'TEXT' },
    ],
  },
  // Buying (missing)
  {
    name: 'purchase_order_item',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'parent', type: 'TEXT', notNull: true },
      { name: 'parenttype', type: 'TEXT' },
      { name: 'item_code', type: 'TEXT' },
      { name: 'item_name', type: 'TEXT' },
      { name: 'description', type: 'TEXT' },
      { name: 'qty', type: 'REAL', defaultValue: 0 },
      { name: 'rate', type: 'REAL', defaultValue: 0 },
      { name: 'amount', type: 'REAL', defaultValue: 0 },
      { name: 'warehouse', type: 'TEXT' },
      { name: 'schedule_date', type: 'TEXT' },
      { name: 'qty_received', type: 'REAL', defaultValue: 0 },
      { name: 'qty_billed', type: 'REAL', defaultValue: 0 },
      { name: 'uom', type: 'TEXT' },
      { name: 'conversion_factor', type: 'REAL', defaultValue: 1 },
      { name: 'batch_no', type: 'TEXT' },
      { name: 'serial_no', type: 'TEXT' },
      { name: 'cost_center', type: 'TEXT' },
      { name: 'project', type: 'TEXT' },
      { name: 'row_id', type: 'TEXT' },
    ],
  },
  {
    name: 'purchase_invoice_item',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'parent', type: 'TEXT', notNull: true },
      { name: 'parenttype', type: 'TEXT' },
      { name: 'item_code', type: 'TEXT' },
      { name: 'item_name', type: 'TEXT' },
      { name: 'description', type: 'TEXT' },
      { name: 'qty', type: 'REAL', defaultValue: 0 },
      { name: 'rate', type: 'REAL', defaultValue: 0 },
      { name: 'amount', type: 'REAL', defaultValue: 0 },
      { name: 'warehouse', type: 'TEXT' },
      { name: 'received_qty', type: 'REAL', defaultValue: 0 },
      { name: 'uom', type: 'TEXT' },
      { name: 'conversion_factor', type: 'REAL', defaultValue: 1 },
      { name: 'batch_no', type: 'TEXT' },
      { name: 'serial_no', type: 'TEXT' },
      { name: 'cost_center', type: 'TEXT' },
      { name: 'project', type: 'TEXT' },
      { name: 'expense_account', type: 'TEXT' },
      { name: 'row_id', type: 'TEXT' },
    ],
  },
  {
    name: 'material_request',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'company', type: 'TEXT' },
      { name: 'material_request_type', type: 'TEXT' },
      { name: 'transaction_date', type: 'TEXT' },
      { name: 'schedule_date', type: 'TEXT' },
      { name: 'status', type: 'TEXT', defaultValue: 'Draft' },
      { name: 'docstatus', type: 'INTEGER', defaultValue: 0 },
      { name: 'creation', type: 'TEXT' },
      { name: 'modified', type: 'TEXT' },
    ],
  },
  {
    name: 'material_request_item',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'parent', type: 'TEXT', notNull: true },
      { name: 'parenttype', type: 'TEXT' },
      { name: 'item_code', type: 'TEXT' },
      { name: 'item_name', type: 'TEXT' },
      { name: 'qty', type: 'REAL', defaultValue: 0 },
      { name: 'warehouse', type: 'TEXT' },
      { name: 'schedule_date', type: 'TEXT' },
      { name: 'project', type: 'TEXT' },
      { name: 'cost_center', type: 'TEXT' },
      { name: 'row_id', type: 'TEXT' },
    ],
  },
  // Stock (missing)
  {
    name: 'stock_ledger_entry',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'item_code', type: 'TEXT' },
      { name: 'warehouse', type: 'TEXT' },
      { name: 'posting_date', type: 'TEXT' },
      { name: 'posting_time', type: 'TEXT' },
      { name: 'actual_qty', type: 'REAL', defaultValue: 0 },
      { name: 'qty_after_transaction', type: 'REAL', defaultValue: 0 },
      { name: 'valuation_rate', type: 'REAL', defaultValue: 0 },
      { name: 'stock_value', type: 'REAL', defaultValue: 0 },
      { name: 'voucher_type', type: 'TEXT' },
      { name: 'voucher_no', type: 'TEXT' },
      { name: 'voucher_detail_no', type: 'TEXT' },
      { name: 'batch_no', type: 'TEXT' },
      { name: 'serial_no', type: 'TEXT' },
      { name: 'company', type: 'TEXT' },
      { name: 'is_cancelled', type: 'INTEGER', defaultValue: 0 },
      { name: 'creation', type: 'TEXT' },
    ],
  },
  {
    name: 'stock_entry',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'stock_entry_type', type: 'TEXT' },
      { name: 'company', type: 'TEXT' },
      { name: 'posting_date', type: 'TEXT' },
      { name: 'posting_time', type: 'TEXT' },
      { name: 'from_warehouse', type: 'TEXT' },
      { name: 'to_warehouse', type: 'TEXT' },
      { name: 'purpose', type: 'TEXT' },
      { name: 'status', type: 'TEXT', defaultValue: 'Draft' },
      { name: 'docstatus', type: 'INTEGER', defaultValue: 0 },
      { name: 'creation', type: 'TEXT' },
      { name: 'modified', type: 'TEXT' },
    ],
  },
  {
    name: 'stock_entry_detail',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'parent', type: 'TEXT', notNull: true },
      { name: 'parenttype', type: 'TEXT' },
      { name: 'item_code', type: 'TEXT' },
      { name: 'item_name', type: 'TEXT' },
      { name: 'qty', type: 'REAL', defaultValue: 0 },
      { name: 's_warehouse', type: 'TEXT' },
      { name: 't_warehouse', type: 'TEXT' },
      { name: 'transfer_qty', type: 'REAL', defaultValue: 0 },
      { name: 'uom', type: 'TEXT' },
      { name: 'conversion_factor', type: 'REAL', defaultValue: 1 },
      { name: 'batch_no', type: 'TEXT' },
      { name: 'serial_no', type: 'TEXT' },
      { name: 'cost_center', type: 'TEXT' },
      { name: 'project', type: 'TEXT' },
      { name: 'row_id', type: 'TEXT' },
    ],
  },
  {
    name: 'batch',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'batch_id', type: 'TEXT' },
      { name: 'item', type: 'TEXT' },
      { name: 'manufacturing_date', type: 'TEXT' },
      { name: 'expiry_date', type: 'TEXT' },
      { name: 'creation', type: 'TEXT' },
    ],
  },
  // Accounts (missing)
  {
    name: 'gl_entry',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'account', type: 'TEXT' },
      { name: 'voucher_type', type: 'TEXT' },
      { name: 'voucher_no', type: 'TEXT' },
      { name: 'posting_date', type: 'TEXT' },
      { name: 'party_type', type: 'TEXT' },
      { name: 'party', type: 'TEXT' },
      { name: 'debit', type: 'REAL', defaultValue: 0 },
      { name: 'credit', type: 'REAL', defaultValue: 0 },
      { name: 'cost_center', type: 'TEXT' },
      { name: 'company', type: 'TEXT' },
      { name: 'is_cancelled', type: 'INTEGER', defaultValue: 0 },
      { name: 'creation', type: 'TEXT' },
    ],
  },
  // CRM
  {
    name: 'lead',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'lead_name', type: 'TEXT' },
      { name: 'lead_owner', type: 'TEXT' },
      { name: 'company_name', type: 'TEXT' },
      { name: 'email_id', type: 'TEXT' },
      { name: 'phone', type: 'TEXT' },
      { name: 'mobile_no', type: 'TEXT' },
      { name: 'source', type: 'TEXT' },
      { name: 'status', type: 'TEXT' },
      { name: 'territory', type: 'TEXT' },
      { name: 'company', type: 'TEXT' },
      { name: 'customer_group', type: 'TEXT' },
      { name: 'creation', type: 'TEXT' },
      { name: 'modified', type: 'TEXT' },
    ],
  },
  {
    name: 'opportunity',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'opportunity_from', type: 'TEXT' },
      { name: 'party_name', type: 'TEXT' },
      { name: 'opportunity_type', type: 'TEXT' },
      { name: 'source', type: 'TEXT' },
      { name: 'status', type: 'TEXT' },
      { name: 'sales_stage', type: 'TEXT' },
      { name: 'expected_closing', type: 'TEXT' },
      { name: 'company', type: 'TEXT' },
      { name: 'territory', type: 'TEXT' },
      { name: 'creation', type: 'TEXT' },
      { name: 'modified', type: 'TEXT' },
    ],
  },
  {
    name: 'opportunity_item',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'parent', type: 'TEXT', notNull: true },
      { name: 'parenttype', type: 'TEXT' },
      { name: 'item_code', type: 'TEXT' },
      { name: 'item_name', type: 'TEXT' },
      { name: 'qty', type: 'REAL', defaultValue: 0 },
      { name: 'rate', type: 'REAL', defaultValue: 0 },
      { name: 'amount', type: 'REAL', defaultValue: 0 },
      { name: 'row_id', type: 'TEXT' },
    ],
  },
  {
    name: 'prospect',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'prospect_name', type: 'TEXT' },
      { name: 'company_name', type: 'TEXT' },
      { name: 'no_of_employees', type: 'INTEGER' },
      { name: 'industry', type: 'TEXT' },
      { name: 'creation', type: 'TEXT' },
      { name: 'modified', type: 'TEXT' },
    ],
  },
  {
    name: 'campaign',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'campaign_name', type: 'TEXT' },
      { name: 'campaign_type', type: 'TEXT' },
      { name: 'start_date', type: 'TEXT' },
      { name: 'end_date', type: 'TEXT' },
      { name: 'description', type: 'TEXT' },
      { name: 'creation', type: 'TEXT' },
      { name: 'modified', type: 'TEXT' },
    ],
  },
  // Projects
  {
    name: 'project',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'project_name', type: 'TEXT' },
      { name: 'company', type: 'TEXT' },
      { name: 'status', type: 'TEXT', defaultValue: 'Draft' },
      { name: 'priority', type: 'TEXT' },
      { name: 'percent_complete', type: 'REAL', defaultValue: 0 },
      { name: 'expected_start_date', type: 'TEXT' },
      { name: 'expected_end_date', type: 'TEXT' },
      { name: 'actual_start_date', type: 'TEXT' },
      { name: 'actual_end_date', type: 'TEXT' },
      { name: 'creation', type: 'TEXT' },
      { name: 'modified', type: 'TEXT' },
    ],
  },
  {
    name: 'task',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'subject', type: 'TEXT' },
      { name: 'project', type: 'TEXT' },
      { name: 'status', type: 'TEXT', defaultValue: 'Open' },
      { name: 'priority', type: 'TEXT' },
      { name: 'exp_start_date', type: 'TEXT' },
      { name: 'exp_end_date', type: 'TEXT' },
      { name: 'begin_date', type: 'TEXT' },
      { name: 'end_date', type: 'TEXT' },
      { name: 'expected_time', type: 'REAL', defaultValue: 0 },
      { name: 'actual_time', type: 'REAL', defaultValue: 0 },
      { name: 'completed_on', type: 'TEXT' },
      { name: 'parent_task', type: 'TEXT' },
      { name: 'is_milestone', type: 'INTEGER', defaultValue: 0 },
      { name: 'creation', type: 'TEXT' },
      { name: 'modified', type: 'TEXT' },
    ],
  },
  // Assets (missing)
  {
    name: 'asset_category',
    primaryKey: 'name',
    columns: [
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'asset_category_name', type: 'TEXT' },
      { name: 'creation', type: 'TEXT' },
      { name: 'modified', type: 'TEXT' },
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
    bank_account: [
      {
        name: '_Test Bank Account',
        account_name: '_Test Bank Account',
        account: '_TC - Bank',
        bank: 'Banco do Brasil',
        bank_account_no: '123456-7',
        iban: 'BR1234567890123456789012345',
        swift_code: 'BRASBRRJ',
        company: '_Test Company',
        account_currency: 'BRL',
        account_type: 'Savings',
        is_default: 1,
        is_company_account: 1,
        balance: 50000.00,
        disabled: 0,
        created_at: now,
        modified_at: now,
      },
      {
        name: '_Test Bank Account - Itau',
        account_name: '_Test Bank Account - Itau',
        account: '_TC - Bank',
        bank: 'Itau Unibanco',
        bank_account_no: '987654-3',
        iban: 'BR9876543210987654321098765',
        swift_code: 'ITAUBRSP',
        company: '_Test Company',
        account_currency: 'BRL',
        account_type: 'Checking',
        is_default: 0,
        is_company_account: 1,
        balance: 25000.00,
        disabled: 0,
        created_at: now,
        modified_at: now,
      },
    ],
    bank_transaction: [
      {
        name: 'BATCH-001',
        date: '2026-07-02',
        bank_account: '_Test Bank Account',
        deposit: 15000.00,
        withdrawal: 0,
        balance: 65000.00,
        currency: 'BRL',
        description: 'Customer Payment - Invoice INV-00001',
        reference_number: 'REF-001',
        status: 'Reconciled',
        docstatus: 1,
        created_at: now,
        modified_at: now,
      },
      {
        name: 'BATCH-002',
        date: '2026-07-05',
        bank_account: '_Test Bank Account',
        deposit: 0,
        withdrawal: 3200.00,
        balance: 61800.00,
        currency: 'BRL',
        description: 'Payment to Supplier - PO-00001',
        reference_number: 'REF-002',
        status: 'Reconciled',
        docstatus: 1,
        created_at: now,
        modified_at: now,
      },
      {
        name: 'BATCH-003',
        date: '2026-07-08',
        bank_account: '_Test Bank Account',
        deposit: 8500.00,
        withdrawal: 0,
        balance: 70300.00,
        currency: 'BRL',
        description: 'Customer Payment - Invoice INV-00002',
        reference_number: 'REF-003',
        status: 'Pending',
        docstatus: 1,
        created_at: now,
        modified_at: now,
      },
      {
        name: 'BATCH-004',
        date: '2026-07-10',
        bank_account: '_Test Bank Account',
        deposit: 0,
        withdrawal: 1500.00,
        balance: 68800.00,
        currency: 'BRL',
        description: 'Office Rent Payment',
        reference_number: 'REF-004',
        status: 'Pending',
        docstatus: 1,
        created_at: now,
        modified_at: now,
      },
      {
        name: 'BATCH-005',
        date: '2026-07-12',
        bank_account: '_Test Bank Account',
        deposit: 22000.00,
        withdrawal: 0,
        balance: 90800.00,
        currency: 'BRL',
        description: 'Customer Payment - Invoice INV-00003',
        reference_number: 'REF-005',
        status: 'Pending',
        docstatus: 1,
        created_at: now,
        modified_at: now,
      },
      {
        name: 'BATCH-006',
        date: '2026-07-15',
        bank_account: '_Test Bank Account',
        deposit: 0,
        withdrawal: 4500.00,
        balance: 86300.00,
        currency: 'BRL',
        description: 'Utility Bills Payment',
        reference_number: 'REF-006',
        status: 'Pending',
        docstatus: 1,
        created_at: now,
        modified_at: now,
      },
      {
        name: 'BATCH-007',
        date: '2026-07-03',
        bank_account: '_Test Bank Account - Itau',
        deposit: 10000.00,
        withdrawal: 0,
        balance: 35000.00,
        currency: 'BRL',
        description: 'Customer Payment - Invoice INV-00004',
        reference_number: 'REF-007',
        status: 'Reconciled',
        docstatus: 1,
        created_at: now,
        modified_at: now,
      },
      {
        name: 'BATCH-008',
        date: '2026-07-06',
        bank_account: '_Test Bank Account - Itau',
        deposit: 0,
        withdrawal: 2500.00,
        balance: 32500.00,
        currency: 'BRL',
        description: 'Office Supplies Purchase',
        reference_number: 'REF-008',
        status: 'Pending',
        docstatus: 1,
        created_at: now,
        modified_at: now,
      },
    ],
    accounts_settings: [
      {
        name: 'Accounts Settings',
        transfer_match_days: 4,
        automatically_run_rules_on_unreconciled_transactions: 0,
        enable_party_matching: 1,
        enable_fuzzy_matching: 0,
      },
    ],
    country: [
      { name: 'Brazil', country_name: 'Brazil', code: 'BR' },
      { name: 'United States', country_name: 'United States', code: 'US' },
      { name: 'Argentina', country_name: 'Argentina', code: 'AR' },
    ],
    customer_group: [
      { name: 'All Customer Groups', customer_group_name: 'All Customer Groups', parent_customer_group: '', is_group: 1, creation: now, modified: now },
      { name: 'Individual', customer_group_name: 'Individual', parent_customer_group: 'All Customer Groups', is_group: 0, creation: now, modified: now },
      { name: 'Commercial', customer_group_name: 'Commercial', parent_customer_group: 'All Customer Groups', is_group: 0, creation: now, modified: now },
    ],
    item_group: [
      { name: 'All Item Groups', item_group_name: 'All Item Groups', parent_item_group: '', is_group: 1, creation: now, modified: now },
      { name: '_Test Item Group', item_group_name: '_Test Item Group', parent_item_group: 'All Item Groups', is_group: 1, creation: now, modified: now },
      { name: '_Test Item Sub Group', item_group_name: '_Test Item Sub Group', parent_item_group: '_Test Item Group', is_group: 0, creation: now, modified: now },
    ],
    customer: [
      { name: 'CUST-00001', customer_name: 'João Silva', customer_type: 'Individual', customer_group: 'All Customer Groups', territory: 'All Territories', default_currency: 'BRL', disabled: 0, creation: now, modified: now },
      { name: 'CUST-00002', customer_name: 'Maria Oliveira', customer_type: 'Individual', customer_group: 'All Customer Groups', territory: 'All Territories', default_currency: 'BRL', disabled: 0, creation: now, modified: now },
      { name: 'CUST-00003', customer_name: 'Pedro Souza Ltda', customer_type: 'Company', customer_group: 'All Customer Groups', territory: 'All Territories', default_currency: 'BRL', disabled: 0, creation: now, modified: now },
    ],
    supplier: [
      { name: 'SUPP-00001', supplier_name: 'Acme Supply Co.', supplier_type: 'Company', supplier_group: 'All Supplier Groups', country: 'Brazil', default_currency: 'BRL', disabled: 0, creation: now, modified: now },
      { name: 'SUPP-00002', supplier_name: 'Global Materials Ltd.', supplier_type: 'Company', supplier_group: 'All Supplier Groups', country: 'Brazil', default_currency: 'BRL', disabled: 0, creation: now, modified: now },
      { name: 'SUPP-00003', supplier_name: 'Regional Distributors Inc.', supplier_type: 'Company', supplier_group: 'All Supplier Groups', country: 'Brazil', default_currency: 'BRL', disabled: 0, creation: now, modified: now },
    ],
    item: [
      { name: 'ITEM-00001', item_code: 'ITEM-00001', item_name: '_Test Raw Material A', item_group: '_Test Item Group', stock_uom: 'Nos', is_stock_item: 1, is_sales_item: 0, is_purchase_item: 1, standard_rate: 0, valuation_rate: 100, description: 'Test raw material A', creation: now, modified: now },
      { name: 'ITEM-00002', item_code: 'ITEM-00002', item_name: '_Test Raw Material B', item_group: '_Test Item Group', stock_uom: 'Nos', is_stock_item: 1, is_sales_item: 0, is_purchase_item: 1, standard_rate: 0, valuation_rate: 250, description: 'Test raw material B', creation: now, modified: now },
      { name: 'ITEM-00003', item_code: 'ITEM-00003', item_name: '_Test Finished Good X', item_group: '_Test Item Sub Group', stock_uom: 'Nos', is_stock_item: 1, is_sales_item: 1, is_purchase_item: 0, standard_rate: 500, valuation_rate: 350, description: 'Test finished good X', creation: now, modified: now },
      { name: 'ITEM-00004', item_code: 'ITEM-00004', item_name: '_Test Finished Good Y', item_group: '_Test Item Sub Group', stock_uom: 'Nos', is_stock_item: 1, is_sales_item: 1, is_purchase_item: 0, standard_rate: 750, valuation_rate: 500, description: 'Test finished good Y', creation: now, modified: now },
      { name: 'ITEM-00005', item_code: 'ITEM-00005', item_name: '_Test Consumable C', item_group: '_Test Item Group', stock_uom: 'Nos', is_stock_item: 1, is_sales_item: 0, is_purchase_item: 1, standard_rate: 0, valuation_rate: 50, description: 'Test consumable C', creation: now, modified: now },
    ],
    warehouse: [
      { name: '_Test Warehouse - _TC', warehouse_name: '_Test Warehouse', company: '_Test Company', is_group: 0, parent_warehouse: '', disabled: 0, creation: now, modified: now },
      { name: '_Test Warehouse 2 - _TC', warehouse_name: '_Test Warehouse 2', company: '_Test Company', is_group: 0, parent_warehouse: '', disabled: 0, creation: now, modified: now },
    ],
    quotation: [
      { name: 'QUO-2026-00001', quotation_to: 'Customer', customer: 'CUST-00001', company: '_Test Company', transaction_date: '2026-07-05', currency: 'BRL', selling_price_list: 'Standard Selling', status: 'Draft', grand_total: 1500.00, net_total: 1500.00, docstatus: 0, creation: now, modified: now },
      { name: 'QUO-2026-00002', quotation_to: 'Customer', customer: 'CUST-00002', company: '_Test Company', transaction_date: '2026-07-08', currency: 'BRL', selling_price_list: 'Standard Selling', status: 'Submitted', grand_total: 3200.00, net_total: 3200.00, docstatus: 1, creation: now, modified: now },
    ],
    quotation_item: [
      { parent: 'QUO-2026-00001', parenttype: 'Quotation', item_code: 'ITEM-00001', item_name: 'Widget A', qty: 5, rate: 300.00, amount: 1500.00, uom: 'Nos' },
      { parent: 'QUO-2026-00002', parenttype: 'Quotation', item_code: 'ITEM-00002', item_name: 'Gadget B', qty: 4, rate: 400.00, amount: 1600.00, uom: 'Nos' },
      { parent: 'QUO-2026-00002', parenttype: 'Quotation', item_code: 'ITEM-00003', item_name: 'Component C', qty: 20, rate: 80.00, amount: 1600.00, uom: 'Nos' },
    ],
    sales_order: [
      { name: 'SAL-ORD-2026-00001', customer: 'CUST-00001', customer_name: 'João Silva', company: '_Test Company', transaction_date: '2026-07-10', delivery_date: '2026-07-20', currency: 'BRL', selling_price_list: 'Standard Selling', status: 'Completed', grand_total: 4500.00, net_total: 4500.00, docstatus: 1, creation: now, modified: now },
      { name: 'SAL-ORD-2026-00002', customer: 'CUST-00003', customer_name: 'Pedro Souza Ltda', company: '_Test Company', transaction_date: '2026-07-12', delivery_date: '2026-07-22', currency: 'BRL', selling_price_list: 'Standard Selling', status: 'Open', grand_total: 7800.00, net_total: 7800.00, docstatus: 1, creation: now, modified: now },
    ],
    sales_order_item: [
      { parent: 'SAL-ORD-2026-00001', parenttype: 'Sales Order', item_code: 'ITEM-00001', item_name: 'Widget A', qty: 10, rate: 300.00, amount: 3000.00, uom: 'Nos' },
      { parent: 'SAL-ORD-2026-00001', parenttype: 'Sales Order', item_code: 'ITEM-00002', item_name: 'Gadget B', qty: 5, rate: 300.00, amount: 1500.00, uom: 'Nos' },
      { parent: 'SAL-ORD-2026-00002', parenttype: 'Sales Order', item_code: 'ITEM-00003', item_name: 'Component C', qty: 50, rate: 156.00, amount: 7800.00, uom: 'Nos' },
    ],
    sales_invoice: [
      { name: 'SAL-INV-2026-00001', customer: 'CUST-00001', customer_name: 'João Silva', company: '_Test Company', posting_date: '2026-07-15', due_date: '2026-08-14', currency: 'BRL', selling_price_list: 'Standard Selling', status: 'Paid', grand_total: 4500.00, net_total: 4500.00, outstanding_amount: 0, paid_amount: 4500.00, docstatus: 1, creation: now, modified: now },
      { name: 'SAL-INV-2026-00002', customer: 'CUST-00003', customer_name: 'Pedro Souza Ltda', company: '_Test Company', posting_date: '2026-07-18', due_date: '2026-08-17', currency: 'BRL', selling_price_list: 'Standard Selling', status: 'Open', grand_total: 7800.00, net_total: 7800.00, outstanding_amount: 7800.00, paid_amount: 0, docstatus: 1, creation: now, modified: now },
    ],
    sales_invoice_item: [
      { parent: 'SAL-INV-2026-00001', parenttype: 'Sales Invoice', item_code: 'ITEM-00001', item_name: 'Widget A', qty: 10, rate: 300.00, amount: 3000.00, uom: 'Nos' },
      { parent: 'SAL-INV-2026-00001', parenttype: 'Sales Invoice', item_code: 'ITEM-00002', item_name: 'Gadget B', qty: 5, rate: 300.00, amount: 1500.00, uom: 'Nos' },
      { parent: 'SAL-INV-2026-00002', parenttype: 'Sales Invoice', item_code: 'ITEM-00003', item_name: 'Component C', qty: 50, rate: 156.00, amount: 7800.00, uom: 'Nos' },
    ],
    purchase_order: [
      { name: 'PO-00001', supplier: 'SUPP-00001', supplier_name: 'Acme Supply Co.', company: '_Test Company', transaction_date: '2026-07-05', schedule_date: '2026-07-15', currency: 'BRL', buying_price_list: 'Standard Buying', status: 'Completed', grand_total: 1500.0, net_total: 1500.0, docstatus: 1, creation: now, modified: now },
      { name: 'PO-00002', supplier: 'SUPP-00002', supplier_name: 'Global Materials Ltd.', company: '_Test Company', transaction_date: '2026-07-08', schedule_date: '2026-07-20', currency: 'BRL', buying_price_list: 'Standard Buying', status: 'Open', grand_total: 3200.5, net_total: 3200.5, docstatus: 1, creation: now, modified: now },
    ],
    purchase_order_item: [
      { parent: 'PO-00001', parenttype: 'Purchase Order', item_code: 'ITEM-00001', item_name: 'Raw Material A', qty: 10, rate: 100.0, amount: 1000.0, uom: 'Nos' },
      { parent: 'PO-00001', parenttype: 'Purchase Order', item_code: 'ITEM-00002', item_name: 'Raw Material B', qty: 5, rate: 100.0, amount: 500.0, uom: 'Nos' },
      { parent: 'PO-00002', parenttype: 'Purchase Order', item_code: 'ITEM-00003', item_name: 'Packaging Material', qty: 20, rate: 160.025, amount: 3200.5, uom: 'Kg' },
    ],
    purchase_invoice: [
      { name: 'PINV-00001', supplier: 'SUPP-00001', supplier_name: 'Acme Supply Co.', company: '_Test Company', posting_date: '2026-07-10', due_date: '2026-08-09', currency: 'BRL', buying_price_list: 'Standard Buying', status: 'Paid', grand_total: 1500.0, net_total: 1500.0, outstanding_amount: 0, docstatus: 1, creation: now, modified: now },
      { name: 'PINV-00002', supplier: 'SUPP-00002', supplier_name: 'Global Materials Ltd.', company: '_Test Company', posting_date: '2026-07-12', due_date: '2026-08-11', currency: 'BRL', buying_price_list: 'Standard Buying', status: 'Unpaid', grand_total: 3200.5, net_total: 3200.5, outstanding_amount: 3200.5, docstatus: 1, creation: now, modified: now },
    ],
    purchase_invoice_item: [
      { parent: 'PINV-00001', parenttype: 'Purchase Invoice', item_code: 'ITEM-00001', item_name: 'Raw Material A', qty: 10, rate: 100.0, amount: 1000.0, uom: 'Nos' },
      { parent: 'PINV-00001', parenttype: 'Purchase Invoice', item_code: 'ITEM-00002', item_name: 'Raw Material B', qty: 5, rate: 100.0, amount: 500.0, uom: 'Nos' },
      { parent: 'PINV-00002', parenttype: 'Purchase Invoice', item_code: 'ITEM-00003', item_name: 'Packaging Material', qty: 20, rate: 160.025, amount: 3200.5, uom: 'Kg' },
    ],
    material_request: [
      { name: 'MAT-REQ-00001', company: '_Test Company', material_request_type: 'Purchase', transaction_date: '2026-07-01', schedule_date: '2026-07-10', status: 'Completed', docstatus: 1, creation: now, modified: now },
      { name: 'MAT-REQ-00002', company: '_Test Company', material_request_type: 'Purchase', transaction_date: '2026-07-06', schedule_date: '2026-07-18', status: 'Partially Received', docstatus: 1, creation: now, modified: now },
    ],
    material_request_item: [
      { parent: 'MAT-REQ-00001', parenttype: 'Material Request', item_code: 'ITEM-00001', item_name: 'Raw Material A', qty: 15, warehouse: '_Test Warehouse - _TC', schedule_date: '2026-07-10' },
      { parent: 'MAT-REQ-00002', parenttype: 'Material Request', item_code: 'ITEM-00003', item_name: 'Packaging Material', qty: 25, warehouse: '_Test Warehouse - _TC', schedule_date: '2026-07-18' },
    ],
    stock_entry: [
      { name: 'STOCK-ENTRY-000001', company: '_Test Company', stock_entry_type: 'Material Transfer', posting_date: '2026-07-05', posting_time: '10:00:00', from_warehouse: '_Test Warehouse - _TC', to_warehouse: '_Test Warehouse 2 - _TC', status: 'Submitted', docstatus: 1, creation: now, modified: now },
      { name: 'STOCK-ENTRY-000002', company: '_Test Company', stock_entry_type: 'Material Receipt', posting_date: '2026-07-10', posting_time: '14:00:00', from_warehouse: '', to_warehouse: '_Test Warehouse - _TC', status: 'Draft', docstatus: 0, creation: now, modified: now },
    ],
    stock_entry_detail: [
      { parent: 'STOCK-ENTRY-000001', parenttype: 'Stock Entry', item_code: 'ITEM-00001', item_name: '_Test Raw Material A', qty: 50, s_warehouse: '_Test Warehouse - _TC', t_warehouse: '_Test Warehouse 2 - _TC', uom: 'Nos' },
      { parent: 'STOCK-ENTRY-000001', parenttype: 'Stock Entry', item_code: 'ITEM-00002', item_name: '_Test Raw Material B', qty: 25, s_warehouse: '_Test Warehouse - _TC', t_warehouse: '_Test Warehouse 2 - _TC', uom: 'Nos' },
      { parent: 'STOCK-ENTRY-000002', parenttype: 'Stock Entry', item_code: 'ITEM-00005', item_name: '_Test Consumable C', qty: 100, s_warehouse: '', t_warehouse: '_Test Warehouse - _TC', uom: 'Nos' },
    ],
    stock_ledger_entry: [
      { name: 'STE000001', item_code: 'ITEM-00001', warehouse: '_Test Warehouse - _TC', posting_date: '2026-07-05', posting_time: '10:00:00', actual_qty: -50, qty_after_transaction: 0, stock_value: -5000, voucher_type: 'Stock Entry', voucher_no: 'STOCK-ENTRY-000001', company: '_Test Company', creation: now },
      { name: 'STE000002', item_code: 'ITEM-00001', warehouse: '_Test Warehouse 2 - _TC', posting_date: '2026-07-05', posting_time: '10:00:00', actual_qty: 50, qty_after_transaction: 50, stock_value: 5000, voucher_type: 'Stock Entry', voucher_no: 'STOCK-ENTRY-000001', company: '_Test Company', creation: now },
      { name: 'STE000003', item_code: 'ITEM-00002', warehouse: '_Test Warehouse - _TC', posting_date: '2026-07-05', posting_time: '10:00:00', actual_qty: -25, qty_after_transaction: 0, stock_value: -6250, voucher_type: 'Stock Entry', voucher_no: 'STOCK-ENTRY-000001', company: '_Test Company', creation: now },
      { name: 'STE000004', item_code: 'ITEM-00002', warehouse: '_Test Warehouse 2 - _TC', posting_date: '2026-07-05', posting_time: '10:00:00', actual_qty: 25, qty_after_transaction: 25, stock_value: 6250, voucher_type: 'Stock Entry', voucher_no: 'STOCK-ENTRY-000001', company: '_Test Company', creation: now },
    ],
    batch: [
      { name: 'BATCH-00001', batch_id: 'BATCH-00001', item: 'ITEM-00003', manufacturing_date: '2026-07-01', expiry_date: '2027-07-01', creation: now },
      { name: 'BATCH-00002', batch_id: 'BATCH-00002', item: 'ITEM-00004', manufacturing_date: '2026-07-05', expiry_date: '2027-07-05', creation: now },
    ],
    journal_entry: [
      { name: 'JV-00001', voucher_type: 'Journal Entry', company: '_Test Company', posting_date: '2026-07-05', posting_time: '10:00:00', total_debit: 5000.0, total_credit: 5000.0, user_remark: 'Initial capital contribution', docstatus: 1, creation: now, modified: now },
      { name: 'JV-00002', voucher_type: 'Journal Entry', company: '_Test Company', posting_date: '2026-07-10', posting_time: '14:30:00', total_debit: 2500.0, total_credit: 2500.0, user_remark: 'Revenue recognition adjustment', docstatus: 1, creation: now, modified: now },
      { name: 'JV-00003', voucher_type: 'Journal Entry', company: '_Test Company', posting_date: '2026-07-15', posting_time: '09:15:00', total_debit: 1200.0, total_credit: 1200.0, user_remark: 'Expense allocation', docstatus: 0, creation: now, modified: now },
    ],
    journal_entry_account: [
      { parent: 'JV-00001', parenttype: 'Journal Entry', account: '_TC - Bank', debit: 5000.0, credit: 0.0, party_type: '', party: '', cost_center: 'Main - _TC' },
      { parent: 'JV-00001', parenttype: 'Journal Entry', account: '_TC - Equity', debit: 0.0, credit: 5000.0, party_type: '', party: '', cost_center: 'Main - _TC' },
      { parent: 'JV-00002', parenttype: 'Journal Entry', account: '_TC - Receivable', debit: 2500.0, credit: 0.0, party_type: 'Customer', party: 'CUST-00001', cost_center: 'Main - _TC' },
      { parent: 'JV-00002', parenttype: 'Journal Entry', account: '_TC - Sales', debit: 0.0, credit: 2500.0, party_type: '', party: '', cost_center: 'Main - _TC' },
      { parent: 'JV-00003', parenttype: 'Journal Entry', account: '_TC - Cost of Goods Sold', debit: 1200.0, credit: 0.0, party_type: '', party: '', cost_center: 'Main - _TC' },
      { parent: 'JV-00003', parenttype: 'Journal Entry', account: '_TC - Payable', debit: 0.0, credit: 1200.0, party_type: 'Supplier', party: 'SUPP-00001', cost_center: 'Main - _TC' },
    ],
    payment_entry: [
      { name: 'PE-00001', payment_type: 'Pay', party_type: 'Supplier', party: 'SUPP-00001', party_name: 'Acme Supply Co.', company: '_Test Company', posting_date: '2026-07-08', posting_time: '11:00:00', paid_amount: 3000.0, paid_from_account_currency: 'BRL', paid_to_account_currency: 'BRL', paid_from_account: '_TC - Bank', paid_to_account: '_TC - Payable', reference_no: 'REF-2026-001', reference_date: '2026-07-08', docstatus: 1, creation: now, modified: now },
      { name: 'PE-00002', payment_type: 'Receive', party_type: 'Customer', party: 'CUST-00001', party_name: 'João Silva', company: '_Test Company', posting_date: '2026-07-12', posting_time: '16:45:00', paid_amount: 1800.0, paid_from_account_currency: 'BRL', paid_to_account_currency: 'BRL', paid_from_account: '_TC - Receivable', paid_to_account: '_TC - Bank', reference_no: 'REF-2026-002', reference_date: '2026-07-12', docstatus: 1, creation: now, modified: now },
    ],
    gl_entry: [
      { name: 'GL-00001', account: '_TC - Bank', voucher_type: 'Journal Entry', voucher_no: 'JV-00001', posting_date: '2026-07-05', party_type: '', party: '', debit: 5000.0, credit: 0.0, company: '_Test Company', creation: now },
      { name: 'GL-00002', account: '_TC - Equity', voucher_type: 'Journal Entry', voucher_no: 'JV-00001', posting_date: '2026-07-05', party_type: '', party: '', debit: 0.0, credit: 5000.0, company: '_Test Company', creation: now },
      { name: 'GL-00003', account: '_TC - Bank', voucher_type: 'Payment Entry', voucher_no: 'PE-00001', posting_date: '2026-07-08', party_type: '', party: '', debit: 0.0, credit: 3000.0, company: '_Test Company', creation: now },
      { name: 'GL-00004', account: '_TC - Payable', voucher_type: 'Payment Entry', voucher_no: 'PE-00001', posting_date: '2026-07-08', party_type: 'Supplier', party: 'SUPP-00001', debit: 3000.0, credit: 0.0, company: '_Test Company', creation: now },
      { name: 'GL-00005', account: '_TC - Bank', voucher_type: 'Payment Entry', voucher_no: 'PE-00002', posting_date: '2026-07-12', party_type: '', party: '', debit: 1800.0, credit: 0.0, company: '_Test Company', creation: now },
      { name: 'GL-00006', account: '_TC - Receivable', voucher_type: 'Payment Entry', voucher_no: 'PE-00002', posting_date: '2026-07-12', party_type: 'Customer', party: 'CUST-00001', debit: 0.0, credit: 1800.0, company: '_Test Company', creation: now },
      { name: 'GL-00007', account: '_TC - Receivable', voucher_type: 'Journal Entry', voucher_no: 'JV-00002', posting_date: '2026-07-10', party_type: 'Customer', party: 'CUST-00001', debit: 2500.0, credit: 0.0, company: '_Test Company', creation: now },
      { name: 'GL-00008', account: '_TC - Sales', voucher_type: 'Journal Entry', voucher_no: 'JV-00002', posting_date: '2026-07-10', party_type: '', party: '', debit: 0.0, credit: 2500.0, company: '_Test Company', creation: now },
    ],
    fiscal_year: [
      { name: '2026', year_start_date: '2026-01-01', year_end_date: '2026-12-31', disabled: 0 },
    ],
    cost_center: [
      { name: 'Main - _TC', cost_center_name: 'Main', company: '_Test Company', is_group: 0, parent_cost_center: '', creation: now, modified: now },
      { name: 'IT Department - _TC', cost_center_name: 'IT Department', company: '_Test Company', is_group: 0, parent_cost_center: 'Main - _TC', creation: now, modified: now },
    ],
    lead: [
      { name: 'LEAD-00001', lead_name: 'John Smith', lead_owner: 'Sales Team', status: 'Lead', source: 'Website', company: '_Test Company', territory: 'All Territories', creation: now, modified: now },
      { name: 'LEAD-00002', lead_name: 'Jane Doe', lead_owner: 'Marketing Team', status: 'Open', source: 'Campaign', company: '_Test Company', territory: 'All Territories', creation: now, modified: now },
      { name: 'LEAD-00003', lead_name: 'Bob Johnson', lead_owner: 'Sales Team', status: 'Converted', source: 'Referral', company: '_Test Company', territory: 'All Territories', creation: now, modified: now },
    ],
    opportunity: [
      { name: 'OPP-2026-00001', party_name: 'John Smith', opportunity_type: 'Sales', source: 'Website', status: 'Open', company: '_Test Company', expected_closing: '2026-08-15', creation: now, modified: now },
      { name: 'OPP-2026-00002', party_name: 'Jane Doe', opportunity_type: 'Service', source: 'Campaign', status: 'Closed', company: '_Test Company', expected_closing: '2026-07-30', creation: now, modified: now },
    ],
    opportunity_item: [
      { parent: 'OPP-2026-00001', parenttype: 'Opportunity', item_code: 'ITEM-00003', item_name: 'Software License', qty: 10, rate: 500, amount: 5000 },
      { parent: 'OPP-2026-00002', parenttype: 'Opportunity', item_code: 'ITEM-00004', item_name: 'Support Package', qty: 5, rate: 200, amount: 1000 },
    ],
    prospect: [
      { name: 'PROSPECT-00001', prospect_name: 'Acme Corporation', company_name: 'Acme Corp', no_of_employees: 250, industry: 'Technology', creation: now, modified: now },
      { name: 'PROSPECT-00002', prospect_name: 'Global Industries', company_name: 'Global Industries', no_of_employees: 500, industry: 'Manufacturing', creation: now, modified: now },
    ],
    campaign: [
      { name: 'CAMP-2026-00001', campaign_name: 'Summer Promotion', campaign_type: 'Email', description: 'Annual summer promotional campaign', start_date: '2026-07-01', end_date: '2026-07-31', creation: now, modified: now },
      { name: 'CAMP-2026-00002', campaign_name: 'Product Launch', campaign_type: 'Webinar', description: 'Webinar series for new product launch', start_date: '2026-07-15', end_date: '2026-08-15', creation: now, modified: now },
    ],
    project: [
      { name: 'PRJ-2026-00001', project_name: 'Website Redesign', company: '_Test Company', status: 'Working', percent_complete: 35, expected_start_date: '2026-07-01', expected_end_date: '2026-09-30', creation: now, modified: now },
      { name: 'PRJ-2026-00002', project_name: 'Mobile App Development', company: '_Test Company', status: 'Draft', percent_complete: 0, expected_start_date: '2026-07-15', expected_end_date: '2026-12-31', creation: now, modified: now },
    ],
    task: [
      { name: 'TASK-00001', subject: 'Design Mockups', project: 'PRJ-2026-00001', status: 'Working', priority: 'High', exp_start_date: '2026-07-05', exp_end_date: '2026-07-15', creation: now, modified: now },
      { name: 'TASK-00002', subject: 'Frontend Development', project: 'PRJ-2026-00001', status: 'Pending', priority: 'High', exp_start_date: '2026-07-16', exp_end_date: '2026-08-15', creation: now, modified: now },
      { name: 'TASK-00003', subject: 'Requirements Gathering', project: 'PRJ-2026-00002', status: 'Completed', priority: 'Medium', exp_start_date: '2026-07-10', exp_end_date: '2026-07-20', creation: now, modified: now },
      { name: 'TASK-00004', subject: 'API Development', project: 'PRJ-2026-00002', status: 'Open', priority: 'Low', exp_start_date: '2026-07-25', exp_end_date: '2026-08-30', creation: now, modified: now },
    ],
    asset: [
      { name: 'ASSET-00001', asset_name: 'Dell Laptop XPS 15', asset_category: 'IT Equipment', company: '_Test Company', location: 'Office - Floor 2', status: 'Available', gross_purchase_amount: 1800, purchase_date: '2026-07-01', creation: now, modified: now },
      { name: 'ASSET-00002', asset_name: 'HP Laser Printer', asset_category: 'Office Equipment', company: '_Test Company', location: 'Office - Floor 1', status: 'In Use', gross_purchase_amount: 450, purchase_date: '2026-07-05', creation: now, modified: now },
    ],
    asset_category: [
      { name: 'IT Equipment', asset_category_name: 'IT Equipment', creation: now, modified: now },
      { name: 'Office Equipment', asset_category_name: 'Office Equipment', creation: now, modified: now },
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

        // Check schema version — recreate if outdated
        try {
          const result = this.db.exec("SELECT value FROM _schema_meta WHERE key = 'version'");
          const savedVersion = result.length > 0 ? parseInt(result[0].values[0][0] as string, 10) : 0;
          const currentVersion = getSchemaVersion();
          if (savedVersion < currentVersion) {
            console.log(`Schema version mismatch (saved: ${savedVersion}, current: ${currentVersion}). Recreating database...`);
            this.db.close();
            this.db = new this.sql.Database();
            await this.createTables();
            await this.seedData();
            await this.createIndexes();
          }
        } catch {
          // _schema_meta table doesn't exist — fresh DB needed
          console.log('No schema version found. Recreating database...');
          this.db.close();
          this.db = new this.sql.Database();
          await this.createTables();
          await this.seedData();
          await this.createIndexes();
        }
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
          const parts = [`"${col.name}"`, col.type];
          if (col.notNull) parts.push('NOT NULL');
          if (col.unique) parts.push('UNIQUE');
          if (col.defaultValue !== undefined) {
            parts.push(`DEFAULT ${typeof col.defaultValue === 'string' ? `'${col.defaultValue}'` : col.defaultValue}`);
          }
          return parts.join(' ');
        })
        .join(', ');

      const pkClause = schema.primaryKey ? `, PRIMARY KEY ("${schema.primaryKey}")` : '';
      const sql = `CREATE TABLE IF NOT EXISTS "${schema.name}" (${columnDefs}${pkClause});`;
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

      // Get schema for this table to fill in required NOT NULL columns
      const schema = TABLE_SCHEMAS.find(s => s.name === tableName);
      const notNullCols = schema?.columns.filter(c => c.notNull) || [];

      // Merge seed data with required defaults
      const mergedRows = rows.map(row => {
        const merged = { ...row };
        for (const col of notNullCols) {
          if (merged[col.name] === undefined || merged[col.name] === null) {
            merged[col.name] = col.defaultValue ?? new Date().toISOString();
          }
        }
        return merged;
      });

      const columns = Object.keys(mergedRows[0]);
      const quotedColumns = columns.map(c => `"${c}"`);
      const placeholders = columns.map(() => '?').join(', ');
      const sql = `INSERT OR IGNORE INTO "${tableName}" (${quotedColumns.join(', ')}) VALUES (${placeholders});`;

      for (const row of mergedRows) {
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
        const sql = `CREATE INDEX IF NOT EXISTS "${indexName}" ON "${tableName}" ("${column}");`;
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
      const result = this.db.exec(`SELECT COUNT(*) as cnt FROM "${tableName}";`);
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
    const result = this.db.exec(`SELECT * FROM "${tableName}" WHERE name = ?;`, [name]);
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

    let sql = `SELECT * FROM "${tableName}"`;
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
    const quotedColumns = columns.map(c => `"${c}"`);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO "${tableName}" (${quotedColumns.join(', ')}) VALUES (${placeholders});`;
    this.db.run(sql, values as never[]);
  }

  updateRow(tableName: string, name: string, data: Record<string, unknown>): void {
    if (!this.db) throw new Error('Database not initialized');
    const setClauses = Object.keys(data).map((key) => `"${key}" = ?`);
    const values = [...Object.values(data), name];
    const sql = `UPDATE "${tableName}" SET ${setClauses.join(', ')} WHERE name = ?;`;
    this.db.run(sql, values as never[]);
  }

  deleteRow(tableName: string, name: string): void {
    if (!this.db) throw new Error('Database not initialized');
    this.db.run(`DELETE FROM "${tableName}" WHERE name = ?;`, [name]);
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const databaseManager = DatabaseManager.getInstance();
