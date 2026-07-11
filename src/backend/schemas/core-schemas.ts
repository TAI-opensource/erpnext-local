export function createCoreSchemas(): string {
  return `
-- ============================================================
-- ERPNext Core Schemas (SQLite)
-- Modules: Setup, Selling, Buying, Stock, Accounts
-- ============================================================

-- ============================================================
-- SETUP MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS company (
  name TEXT PRIMARY KEY,
  company_name TEXT,
  abbr TEXT,
  default_currency TEXT,
  country TEXT,
  is_group INTEGER DEFAULT 0,
  parent_company TEXT,
  tax_id TEXT,
  domain TEXT,
  valuation_method TEXT,
  enable_perpetual_inventory INTEGER DEFAULT 0,
  creation TEXT,
  modified TEXT
);
CREATE INDEX IF NOT EXISTS idx_company_company_name ON company(company_name);

CREATE TABLE IF NOT EXISTS account (
  name TEXT PRIMARY KEY,
  account_name TEXT,
  account_number TEXT,
  company TEXT,
  is_group INTEGER DEFAULT 0,
  root_type TEXT,
  report_type TEXT,
  account_type TEXT,
  tax_rate REAL,
  parent_account TEXT,
  account_currency TEXT,
  lft INTEGER,
  rgt INTEGER,
  disabled INTEGER DEFAULT 0,
  creation TEXT,
  modified TEXT
);
CREATE INDEX IF NOT EXISTS idx_account_company ON account(company);
CREATE INDEX IF NOT EXISTS idx_account_root_type ON account(root_type);
CREATE INDEX IF NOT EXISTS idx_account_parent_account ON account(parent_account);

CREATE TABLE IF NOT EXISTS uom (
  name TEXT PRIMARY KEY,
  enabled INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS currency (
  name TEXT PRIMARY KEY,
  enabled INTEGER DEFAULT 1,
  fraction TEXT
);

CREATE TABLE IF NOT EXISTS country (
  name TEXT PRIMARY KEY,
  code TEXT
);

CREATE TABLE IF NOT EXISTS cost_center (
  name TEXT PRIMARY KEY,
  cost_center_name TEXT,
  company TEXT,
  is_group INTEGER DEFAULT 0,
  parent_cost_center TEXT,
  lft INTEGER,
  rgt INTEGER
);

CREATE TABLE IF NOT EXISTS customer_group (
  name TEXT PRIMARY KEY,
  customer_group_name TEXT,
  is_group INTEGER DEFAULT 0,
  parent_customer_group TEXT,
  lft INTEGER,
  rgt INTEGER
);

CREATE TABLE IF NOT EXISTS territory (
  name TEXT PRIMARY KEY,
  territory_name TEXT,
  is_group INTEGER DEFAULT 0,
  parent_territory TEXT,
  lft INTEGER,
  rgt INTEGER
);

CREATE TABLE IF NOT EXISTS supplier_group (
  name TEXT PRIMARY KEY,
  supplier_group_name TEXT,
  is_group INTEGER DEFAULT 0,
  parent_supplier_group TEXT,
  lft INTEGER,
  rgt INTEGER
);

CREATE TABLE IF NOT EXISTS item_group (
  name TEXT PRIMARY KEY,
  item_group_name TEXT,
  is_group INTEGER DEFAULT 0,
  parent_item_group TEXT,
  lft INTEGER,
  rgt INTEGER
);

CREATE TABLE IF NOT EXISTS brand (
  name TEXT PRIMARY KEY,
  brand_name TEXT
);

CREATE TABLE IF NOT EXISTS price_list (
  name TEXT PRIMARY KEY,
  selling INTEGER DEFAULT 0,
  buying INTEGER DEFAULT 0,
  currency TEXT,
  enabled INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS item_price (
  name TEXT PRIMARY KEY,
  item_code TEXT,
  price_list TEXT,
  price_list_rate REAL,
  currency TEXT,
  uom TEXT,
  min_qty REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tax_category (
  name TEXT PRIMARY KEY,
  valid_for_country TEXT
);

CREATE TABLE IF NOT EXISTS sales_taxes_and_charges_template (
  name TEXT PRIMARY KEY,
  company TEXT,
  tax_category TEXT
);

CREATE TABLE IF NOT EXISTS purchase_taxes_and_charges_template (
  name TEXT PRIMARY KEY,
  company TEXT,
  tax_category TEXT
);

CREATE TABLE IF NOT EXISTS payment_terms_template (
  name TEXT PRIMARY KEY,
  template_name TEXT
);

CREATE TABLE IF NOT EXISTS terms_and_conditions (
  name TEXT PRIMARY KEY,
  terms TEXT
);

CREATE TABLE IF NOT EXISTS letter_head (
  name TEXT PRIMARY KEY,
  letter_head_name TEXT,
  is_default INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS mode_of_payment (
  name TEXT PRIMARY KEY,
  mode_of_payment TEXT,
  type TEXT
);

-- ============================================================
-- SELLING MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS customer (
  name TEXT PRIMARY KEY,
  customer_name TEXT,
  customer_type TEXT,
  customer_group TEXT,
  territory TEXT,
  default_currency TEXT,
  default_price_list TEXT,
  tax_id TEXT,
  tax_category TEXT,
  payment_terms TEXT,
  loyalty_program TEXT,
  is_internal_customer INTEGER DEFAULT 0,
  represents_company TEXT,
  disabled INTEGER DEFAULT 0,
  creation TEXT,
  modified TEXT
);
CREATE INDEX IF NOT EXISTS idx_customer_customer_group ON customer(customer_group);
CREATE INDEX IF NOT EXISTS idx_customer_territory ON customer(territory);

CREATE TABLE IF NOT EXISTS customer_account (
  parent TEXT,
  parenttype TEXT,
  company TEXT,
  account TEXT
);

CREATE TABLE IF NOT EXISTS customer_credit_limit (
  parent TEXT,
  parenttype TEXT,
  company TEXT,
  credit_limit REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sales_team (
  parent TEXT,
  parenttype TEXT,
  sales_person TEXT,
  allocated_percentage REAL,
  allocated_amount REAL,
  incentive_amount REAL
);

CREATE TABLE IF NOT EXISTS quotation (
  name TEXT PRIMARY KEY,
  quotation_to TEXT,
  lead TEXT,
  customer TEXT,
  company TEXT,
  transaction_date TEXT,
  currency TEXT,
  selling_price_list TEXT,
  conversion_rate REAL DEFAULT 1,
  status TEXT,
  taxes_and_charges TEXT,
  tax_category TEXT,
  payment_terms_template TEXT,
  grand_total REAL DEFAULT 0,
  net_total REAL DEFAULT 0,
  docstatus INTEGER DEFAULT 0,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS quotation_item (
  parent TEXT,
  parenttype TEXT,
  item_code TEXT,
  item_name TEXT,
  description TEXT,
  qty REAL DEFAULT 0,
  rate REAL DEFAULT 0,
  amount REAL DEFAULT 0,
  warehouse TEXT,
  uom TEXT,
  conversion_factor REAL DEFAULT 1,
  cost_center TEXT
);

CREATE TABLE IF NOT EXISTS sales_order (
  name TEXT PRIMARY KEY,
  customer TEXT,
  customer_name TEXT,
  company TEXT,
  transaction_date TEXT,
  delivery_date TEXT,
  currency TEXT,
  selling_price_list TEXT,
  conversion_rate REAL DEFAULT 1,
  plc_conversion_rate REAL DEFAULT 1,
  status TEXT,
  taxes_and_charges TEXT,
  tax_category TEXT,
  payment_terms_template TEXT,
  sales_partner TEXT,
  commission_rate REAL DEFAULT 0,
  cost_center TEXT,
  grand_total REAL DEFAULT 0,
  base_grand_total REAL DEFAULT 0,
  total_taxes_and_charges REAL DEFAULT 0,
  net_total REAL DEFAULT 0,
  advance_paid REAL DEFAULT 0,
  per_delivered REAL DEFAULT 0,
  per_billed REAL DEFAULT 0,
  docstatus INTEGER DEFAULT 0,
  creation TEXT,
  modified TEXT
);
CREATE INDEX IF NOT EXISTS idx_sales_order_customer ON sales_order(customer);
CREATE INDEX IF NOT EXISTS idx_sales_order_company ON sales_order(company);
CREATE INDEX IF NOT EXISTS idx_sales_order_status ON sales_order(status);
CREATE INDEX IF NOT EXISTS idx_sales_order_docstatus ON sales_order(docstatus);
CREATE INDEX IF NOT EXISTS idx_sales_order_transaction_date ON sales_order(transaction_date);

CREATE TABLE IF NOT EXISTS sales_order_item (
  parent TEXT,
  parenttype TEXT,
  item_code TEXT,
  item_name TEXT,
  description TEXT,
  qty REAL DEFAULT 0,
  rate REAL DEFAULT 0,
  amount REAL DEFAULT 0,
  warehouse TEXT,
  delivery_date TEXT,
  qty_delivered REAL DEFAULT 0,
  qty_billed REAL DEFAULT 0,
  uom TEXT,
  conversion_factor REAL DEFAULT 1,
  batch_no TEXT,
  serial_no TEXT,
  cost_center TEXT,
  project TEXT,
  row_id TEXT
);

CREATE TABLE IF NOT EXISTS selling_settings (
  name TEXT PRIMARY KEY,
  blank_order_if_no_item INTEGER DEFAULT 0,
  allow_blank_order_item INTEGER DEFAULT 0,
  disable_rounded_total INTEGER DEFAULT 0,
  customer_group TEXT,
  territory TEXT,
  price_list TEXT
);

-- ============================================================
-- BUYING MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS supplier (
  name TEXT PRIMARY KEY,
  supplier_name TEXT,
  supplier_type TEXT,
  supplier_group TEXT,
  country TEXT,
  default_currency TEXT,
  default_price_list TEXT,
  tax_id TEXT,
  tax_category TEXT,
  payment_terms TEXT,
  is_internal_supplier INTEGER DEFAULT 0,
  represents_company TEXT,
  disabled INTEGER DEFAULT 0,
  on_hold INTEGER DEFAULT 0,
  creation TEXT,
  modified TEXT
);
CREATE INDEX IF NOT EXISTS idx_supplier_supplier_group ON supplier(supplier_group);

CREATE TABLE IF NOT EXISTS supplier_account (
  parent TEXT,
  parenttype TEXT,
  company TEXT,
  account TEXT
);

CREATE TABLE IF NOT EXISTS purchase_order (
  name TEXT PRIMARY KEY,
  supplier TEXT,
  supplier_name TEXT,
  company TEXT,
  transaction_date TEXT,
  schedule_date TEXT,
  currency TEXT,
  buying_price_list TEXT,
  conversion_rate REAL DEFAULT 1,
  status TEXT,
  taxes_and_charges TEXT,
  tax_category TEXT,
  cost_center TEXT,
  grand_total REAL DEFAULT 0,
  base_grand_total REAL DEFAULT 0,
  total_taxes_and_charges REAL DEFAULT 0,
  net_total REAL DEFAULT 0,
  docstatus INTEGER DEFAULT 0,
  creation TEXT,
  modified TEXT
);
CREATE INDEX IF NOT EXISTS idx_purchase_order_supplier ON purchase_order(supplier);
CREATE INDEX IF NOT EXISTS idx_purchase_order_company ON purchase_order(company);
CREATE INDEX IF NOT EXISTS idx_purchase_order_status ON purchase_order(status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_docstatus ON purchase_order(docstatus);

CREATE TABLE IF NOT EXISTS purchase_order_item (
  parent TEXT,
  parenttype TEXT,
  item_code TEXT,
  item_name TEXT,
  description TEXT,
  qty REAL DEFAULT 0,
  rate REAL DEFAULT 0,
  amount REAL DEFAULT 0,
  warehouse TEXT,
  schedule_date TEXT,
  qty_received REAL DEFAULT 0,
  qty_billed REAL DEFAULT 0,
  uom TEXT,
  conversion_factor REAL DEFAULT 1,
  batch_no TEXT,
  serial_no TEXT,
  cost_center TEXT,
  project TEXT,
  row_id TEXT
);

CREATE TABLE IF NOT EXISTS buying_settings (
  name TEXT PRIMARY KEY,
  allow_blank_purchase_order INTEGER DEFAULT 0,
  blank_order_if_no_item INTEGER DEFAULT 0,
  disable_rounded_total INTEGER DEFAULT 0
);

-- ============================================================
-- STOCK MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS item (
  name TEXT PRIMARY KEY,
  item_code TEXT,
  item_name TEXT,
  item_group TEXT,
  stock_uom TEXT,
  is_stock_item INTEGER DEFAULT 0,
  is_sales_item INTEGER DEFAULT 0,
  is_purchase_item INTEGER DEFAULT 0,
  is_fixed_asset INTEGER DEFAULT 0,
  has_variants INTEGER DEFAULT 0,
  variant_of TEXT,
  disabled INTEGER DEFAULT 0,
  standard_rate REAL DEFAULT 0,
  valuation_rate REAL DEFAULT 0,
  valuation_method TEXT,
  has_batch_no INTEGER DEFAULT 0,
  has_serial_no INTEGER DEFAULT 0,
  brand TEXT,
  description TEXT,
  default_bom TEXT,
  image TEXT,
  creation TEXT,
  modified TEXT
);
CREATE INDEX IF NOT EXISTS idx_item_item_group ON item(item_group);
CREATE INDEX IF NOT EXISTS idx_item_stock_uom ON item(stock_uom);
CREATE INDEX IF NOT EXISTS idx_item_brand ON item(brand);
CREATE INDEX IF NOT EXISTS idx_item_is_stock_item ON item(is_stock_item);

CREATE TABLE IF NOT EXISTS item_uom (
  parent TEXT,
  parenttype TEXT,
  uom TEXT,
  conversion_factor REAL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS item_default (
  parent TEXT,
  parenttype TEXT,
  company TEXT,
  default_warehouse TEXT,
  default_income_account TEXT,
  default_expense_account TEXT,
  default_cost_center TEXT
);

CREATE TABLE IF NOT EXISTS item_barcode (
  parent TEXT,
  parenttype TEXT,
  barcode TEXT
);

CREATE TABLE IF NOT EXISTS item_supplier (
  parent TEXT,
  parenttype TEXT,
  supplier TEXT,
  supplier_code TEXT
);

CREATE TABLE IF NOT EXISTS item_tax (
  parent TEXT,
  parenttype TEXT,
  tax_type TEXT,
  tax_rate REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS item_variant_attribute (
  parent TEXT,
  parenttype TEXT,
  attribute TEXT,
  attribute_value TEXT
);

CREATE TABLE IF NOT EXISTS warehouse (
  name TEXT PRIMARY KEY,
  warehouse_name TEXT,
  company TEXT,
  is_group INTEGER DEFAULT 0,
  parent_warehouse TEXT,
  account TEXT,
  disabled INTEGER DEFAULT 0,
  is_rejected_warehouse INTEGER DEFAULT 0,
  warehouse_type TEXT,
  lft INTEGER,
  rgt INTEGER,
  creation TEXT,
  modified TEXT
);
CREATE INDEX IF NOT EXISTS idx_warehouse_company ON warehouse(company);
CREATE INDEX IF NOT EXISTS idx_warehouse_parent_warehouse ON warehouse(parent_warehouse);

CREATE TABLE IF NOT EXISTS warehouse_type (
  name TEXT PRIMARY KEY,
  warehouse_type_name TEXT
);

CREATE TABLE IF NOT EXISTS stock_ledger_entry (
  name TEXT PRIMARY KEY,
  item_code TEXT,
  warehouse TEXT,
  posting_date TEXT,
  posting_time TEXT,
  actual_qty REAL DEFAULT 0,
  qty_after_transaction REAL DEFAULT 0,
  valuation_rate REAL DEFAULT 0,
  stock_value REAL DEFAULT 0,
  voucher_type TEXT,
  voucher_no TEXT,
  voucher_detail_no TEXT,
  batch_no TEXT,
  serial_no TEXT,
  is_cancelled INTEGER DEFAULT 0,
  creation TEXT
);
CREATE INDEX IF NOT EXISTS idx_sle_item_code ON stock_ledger_entry(item_code);
CREATE INDEX IF NOT EXISTS idx_sle_warehouse ON stock_ledger_entry(warehouse);
CREATE INDEX IF NOT EXISTS idx_sle_posting_date ON stock_ledger_entry(posting_date);
CREATE INDEX IF NOT EXISTS idx_sle_voucher_type ON stock_ledger_entry(voucher_type);

CREATE TABLE IF NOT EXISTS stock_entry (
  name TEXT PRIMARY KEY,
  stock_entry_type TEXT,
  company TEXT,
  posting_date TEXT,
  posting_time TEXT,
  from_warehouse TEXT,
  to_warehouse TEXT,
  purpose TEXT,
  docstatus INTEGER DEFAULT 0,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS stock_entry_detail (
  parent TEXT,
  parenttype TEXT,
  item_code TEXT,
  item_name TEXT,
  qty REAL DEFAULT 0,
  s_warehouse TEXT,
  t_warehouse TEXT,
  transfer_qty REAL DEFAULT 0,
  uom TEXT,
  conversion_factor REAL DEFAULT 1,
  batch_no TEXT,
  serial_no TEXT,
  cost_center TEXT,
  project TEXT,
  row_id TEXT
);

CREATE TABLE IF NOT EXISTS delivery_note (
  name TEXT PRIMARY KEY,
  customer TEXT,
  customer_name TEXT,
  company TEXT,
  posting_date TEXT,
  posting_time TEXT,
  currency TEXT,
  selling_price_list TEXT,
  conversion_rate REAL DEFAULT 1,
  status TEXT,
  taxes_and_charges TEXT,
  grand_total REAL DEFAULT 0,
  net_total REAL DEFAULT 0,
  docstatus INTEGER DEFAULT 0,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS delivery_note_item (
  parent TEXT,
  parenttype TEXT,
  item_code TEXT,
  item_name TEXT,
  qty REAL DEFAULT 0,
  rate REAL DEFAULT 0,
  amount REAL DEFAULT 0,
  warehouse TEXT,
  delivered_qty REAL DEFAULT 0,
  uom TEXT,
  conversion_factor REAL DEFAULT 1,
  batch_no TEXT,
  serial_no TEXT,
  cost_center TEXT,
  project TEXT,
  row_id TEXT
);

CREATE TABLE IF NOT EXISTS purchase_receipt (
  name TEXT PRIMARY KEY,
  supplier TEXT,
  supplier_name TEXT,
  company TEXT,
  posting_date TEXT,
  posting_time TEXT,
  currency TEXT,
  buying_price_list TEXT,
  conversion_rate REAL DEFAULT 1,
  status TEXT,
  taxes_and_charges TEXT,
  grand_total REAL DEFAULT 0,
  net_total REAL DEFAULT 0,
  docstatus INTEGER DEFAULT 0,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS purchase_receipt_item (
  parent TEXT,
  parenttype TEXT,
  item_code TEXT,
  item_name TEXT,
  qty REAL DEFAULT 0,
  rate REAL DEFAULT 0,
  amount REAL DEFAULT 0,
  warehouse TEXT,
  received_qty REAL DEFAULT 0,
  uom TEXT,
  conversion_factor REAL DEFAULT 1,
  batch_no TEXT,
  serial_no TEXT,
  cost_center TEXT,
  project TEXT,
  row_id TEXT
);

CREATE TABLE IF NOT EXISTS material_request (
  name TEXT PRIMARY KEY,
  company TEXT,
  material_request_type TEXT,
  transaction_date TEXT,
  schedule_date TEXT,
  status TEXT,
  docstatus INTEGER DEFAULT 0,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS material_request_item (
  parent TEXT,
  parenttype TEXT,
  item_code TEXT,
  item_name TEXT,
  qty REAL DEFAULT 0,
  warehouse TEXT,
  schedule_date TEXT,
  project TEXT,
  cost_center TEXT,
  row_id TEXT
);

CREATE TABLE IF NOT EXISTS serial_no (
  name TEXT PRIMARY KEY,
  serial_no TEXT,
  item_code TEXT,
  warehouse TEXT,
  purchase_document_type TEXT,
  purchase_document_no TEXT,
  purchase_date TEXT,
  batch_no TEXT,
  status TEXT,
  creation TEXT
);

CREATE TABLE IF NOT EXISTS batch (
  name TEXT PRIMARY KEY,
  batch_id TEXT,
  item TEXT,
  manufacturing_date TEXT,
  expiry_date TEXT,
  creation TEXT
);

CREATE TABLE IF NOT EXISTS stock_settings (
  name TEXT PRIMARY KEY,
  item_naming_by TEXT,
  valuation_method TEXT,
  auto_create_serial_no_and_batch_entry INTEGER DEFAULT 0,
  disable_serial_no_and_batch_transaction INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS stock_reservation_entry (
  name TEXT PRIMARY KEY,
  voucher_type TEXT,
  voucher_no TEXT,
  voucher_detail_no TEXT,
  item_code TEXT,
  warehouse TEXT,
  qty REAL DEFAULT 0,
  reserved_qty REAL DEFAULT 0,
  creation TEXT
);

-- ============================================================
-- ACCOUNTS MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS sales_invoice (
  name TEXT PRIMARY KEY,
  customer TEXT,
  customer_name TEXT,
  company TEXT,
  posting_date TEXT,
  posting_time TEXT,
  due_date TEXT,
  currency TEXT,
  selling_price_list TEXT,
  conversion_rate REAL DEFAULT 1,
  plc_conversion_rate REAL DEFAULT 1,
  status TEXT,
  taxes_and_charges TEXT,
  tax_category TEXT,
  debit_to TEXT,
  outstanding_amount REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  base_grand_total REAL DEFAULT 0,
  total_taxes_and_charges REAL DEFAULT 0,
  net_total REAL DEFAULT 0,
  paid_amount REAL DEFAULT 0,
  is_pos INTEGER DEFAULT 0,
  is_return INTEGER DEFAULT 0,
  return_against TEXT,
  cost_center TEXT,
  project TEXT,
  docstatus INTEGER DEFAULT 0,
  creation TEXT,
  modified TEXT
);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_customer ON sales_invoice(customer);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_company ON sales_invoice(company);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_status ON sales_invoice(status);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_docstatus ON sales_invoice(docstatus);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_posting_date ON sales_invoice(posting_date);

CREATE TABLE IF NOT EXISTS sales_invoice_item (
  parent TEXT,
  parenttype TEXT,
  item_code TEXT,
  item_name TEXT,
  description TEXT,
  qty REAL DEFAULT 0,
  rate REAL DEFAULT 0,
  amount REAL DEFAULT 0,
  warehouse TEXT,
  delivered_qty REAL DEFAULT 0,
  uom TEXT,
  conversion_factor REAL DEFAULT 1,
  batch_no TEXT,
  serial_no TEXT,
  cost_center TEXT,
  project TEXT,
  income_account TEXT,
  expense_account TEXT,
  row_id TEXT
);

CREATE TABLE IF NOT EXISTS sales_invoice_payment (
  parent TEXT,
  parenttype TEXT,
  mode_of_payment TEXT,
  amount REAL DEFAULT 0,
  account TEXT,
  row_id TEXT
);

CREATE TABLE IF NOT EXISTS sales_invoice_advance (
  parent TEXT,
  parenttype TEXT,
  reference_name TEXT,
  reference_type TEXT,
  allocated_amount REAL DEFAULT 0,
  advance_amount REAL DEFAULT 0,
  row_id TEXT
);

CREATE TABLE IF NOT EXISTS purchase_invoice (
  name TEXT PRIMARY KEY,
  supplier TEXT,
  supplier_name TEXT,
  company TEXT,
  posting_date TEXT,
  posting_time TEXT,
  due_date TEXT,
  currency TEXT,
  buying_price_list TEXT,
  conversion_rate REAL DEFAULT 1,
  status TEXT,
  taxes_and_charges TEXT,
  tax_category TEXT,
  credit_to TEXT,
  outstanding_amount REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  base_grand_total REAL DEFAULT 0,
  total_taxes_and_charges REAL DEFAULT 0,
  net_total REAL DEFAULT 0,
  bill_no TEXT,
  bill_date TEXT,
  cost_center TEXT,
  project TEXT,
  docstatus INTEGER DEFAULT 0,
  creation TEXT,
  modified TEXT
);
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_supplier ON purchase_invoice(supplier);
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_company ON purchase_invoice(company);
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_status ON purchase_invoice(status);
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_docstatus ON purchase_invoice(docstatus);

CREATE TABLE IF NOT EXISTS purchase_invoice_item (
  parent TEXT,
  parenttype TEXT,
  item_code TEXT,
  item_name TEXT,
  description TEXT,
  qty REAL DEFAULT 0,
  rate REAL DEFAULT 0,
  amount REAL DEFAULT 0,
  warehouse TEXT,
  received_qty REAL DEFAULT 0,
  uom TEXT,
  conversion_factor REAL DEFAULT 1,
  batch_no TEXT,
  serial_no TEXT,
  cost_center TEXT,
  project TEXT,
  expense_account TEXT,
  row_id TEXT
);

CREATE TABLE IF NOT EXISTS payment_entry (
  name TEXT PRIMARY KEY,
  payment_type TEXT,
  party_type TEXT,
  party TEXT,
  party_name TEXT,
  company TEXT,
  posting_date TEXT,
  posting_time TEXT,
  paid_amount REAL DEFAULT 0,
  paid_from_account_currency TEXT,
  paid_to_account_currency TEXT,
  source_exchange_rate REAL DEFAULT 1,
  target_exchange_rate REAL DEFAULT 1,
  received_amount REAL DEFAULT 0,
  paid_from_account TEXT,
  paid_to_account TEXT,
  reference_no TEXT,
  reference_date TEXT,
  cost_center TEXT,
  project TEXT,
  docstatus INTEGER DEFAULT 0,
  creation TEXT,
  modified TEXT
);
CREATE INDEX IF NOT EXISTS idx_payment_entry_party ON payment_entry(party);
CREATE INDEX IF NOT EXISTS idx_payment_entry_company ON payment_entry(company);
CREATE INDEX IF NOT EXISTS idx_payment_entry_payment_type ON payment_entry(payment_type);
CREATE INDEX IF NOT EXISTS idx_payment_entry_docstatus ON payment_entry(docstatus);

CREATE TABLE IF NOT EXISTS journal_entry (
  name TEXT PRIMARY KEY,
  voucher_type TEXT,
  company TEXT,
  posting_date TEXT,
  posting_time TEXT,
  total_debit REAL DEFAULT 0,
  total_credit REAL DEFAULT 0,
  user_remark TEXT,
  multi_currency INTEGER DEFAULT 0,
  docstatus INTEGER DEFAULT 0,
  creation TEXT,
  modified TEXT
);
CREATE INDEX IF NOT EXISTS idx_journal_entry_company ON journal_entry(company);
CREATE INDEX IF NOT EXISTS idx_journal_entry_docstatus ON journal_entry(docstatus);
CREATE INDEX IF NOT EXISTS idx_journal_entry_posting_date ON journal_entry(posting_date);

CREATE TABLE IF NOT EXISTS journal_entry_account (
  parent TEXT,
  parenttype TEXT,
  account TEXT,
  debit REAL DEFAULT 0,
  credit REAL DEFAULT 0,
  exchange_rate REAL DEFAULT 1,
  account_currency TEXT,
  party_type TEXT,
  party TEXT,
  cost_center TEXT,
  project TEXT,
  reference_type TEXT,
  reference_name TEXT,
  row_id TEXT
);

CREATE TABLE IF NOT EXISTS payment_request (
  name TEXT PRIMARY KEY,
  payment_request_type TEXT,
  party_type TEXT,
  party TEXT,
  mode_of_payment TEXT,
  amount REAL DEFAULT 0,
  currency TEXT,
  reference_doctype TEXT,
  reference_name TEXT,
  status TEXT,
  docstatus INTEGER DEFAULT 0,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS payment_reconciliation (
  name TEXT PRIMARY KEY,
  company TEXT,
  party_type TEXT,
  party TEXT,
  reference_name TEXT,
  docstatus INTEGER DEFAULT 0,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS gl_entry (
  name TEXT PRIMARY KEY,
  account TEXT,
  voucher_type TEXT,
  voucher_no TEXT,
  posting_date TEXT,
  party_type TEXT,
  party TEXT,
  debit REAL DEFAULT 0,
  credit REAL DEFAULT 0,
  cost_center TEXT,
  company TEXT,
  is_cancelled INTEGER DEFAULT 0,
  creation TEXT
);

CREATE TABLE IF NOT EXISTS payment_ledger_entry (
  name TEXT PRIMARY KEY,
  voucher_type TEXT,
  voucher_no TEXT,
  account TEXT,
  party_type TEXT,
  party TEXT,
  amount REAL DEFAULT 0,
  is_cancelled INTEGER DEFAULT 0,
  posting_date TEXT,
  creation TEXT
);

CREATE TABLE IF NOT EXISTS accounts_settings (
  name TEXT PRIMARY KEY,
  accounts_frozen_upto TEXT,
  allow_cost_center_in_entry_of_sheet INTEGER DEFAULT 0,
  auto_process_incoming_bank_transfers INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cost_center_allocation (
  name TEXT PRIMARY KEY,
  company TEXT,
  default_cost_center TEXT,
  percentage REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS fiscal_year (
  name TEXT PRIMARY KEY,
  year_start_date TEXT,
  year_end_date TEXT,
  disabled INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS accounting_dimension (
  name TEXT PRIMARY KEY,
  document_type TEXT,
  disabled INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pos_profile (
  name TEXT PRIMARY KEY,
  company TEXT,
  customer TEXT,
  warehouse TEXT,
  selling_price_list TEXT,
  payment_methods TEXT
);

CREATE TABLE IF NOT EXISTS pos_settings (
  name TEXT PRIMARY KEY,
  update_stock_level INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bank_account (
  name TEXT PRIMARY KEY,
  account_name TEXT,
  account_type TEXT,
  bank TEXT,
  account_no TEXT,
  iban TEXT,
  swift_code TEXT,
  branch TEXT,
  company TEXT,
  is_default INTEGER DEFAULT 0,
  is_company_account INTEGER DEFAULT 0,
  disabled INTEGER DEFAULT 0,
  balance REAL DEFAULT 0,
  creation TEXT,
  created_at TEXT,
  modified_at TEXT
);

CREATE TABLE IF NOT EXISTS bank_transaction (
  name TEXT PRIMARY KEY,
  date TEXT,
  status TEXT,
  bank_account TEXT,
  account TEXT,
  deposit REAL DEFAULT 0,
  withdrawal REAL DEFAULT 0,
  balance REAL DEFAULT 0,
  currency TEXT,
  description TEXT,
  reference_number TEXT,
  allocated_amount REAL DEFAULT 0,
  unallocated_amount REAL DEFAULT 0,
  company TEXT,
  docstatus INTEGER DEFAULT 1,
  creation TEXT,
  created_at TEXT,
  modified_at TEXT
);

CREATE TABLE IF NOT EXISTS bank_reconciliation_tool (
  name TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS bank_statement_import_log (
  name TEXT PRIMARY KEY,
  company TEXT,
  bank_account TEXT,
  file_name TEXT,
  status TEXT,
  data TEXT,
  column_mapping TEXT,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS bank_transaction_rule (
  name TEXT PRIMARY KEY,
  company TEXT,
  bank_account TEXT,
  text_or_pattern TEXT,
  match_type TEXT,
  posting_date TEXT,
  mode_of_payment TEXT,
  party_type TEXT,
  party TEXT,
  creation TEXT
);

CREATE TABLE IF NOT EXISTS pricing_rule (
  name TEXT PRIMARY KEY,
  item_code TEXT,
  item_group TEXT,
  customer TEXT,
  supplier TEXT,
  price_list TEXT,
  selling INTEGER DEFAULT 0,
  buying INTEGER DEFAULT 0,
  rate REAL DEFAULT 0,
  discount_percentage REAL DEFAULT 0,
  min_qty REAL DEFAULT 0,
  max_qty REAL DEFAULT 0,
  valid_from TEXT,
  valid_upto TEXT,
  company TEXT,
  disable INTEGER DEFAULT 0,
  docstatus INTEGER DEFAULT 0,
  creation TEXT,
  modified TEXT
);
`;
}
