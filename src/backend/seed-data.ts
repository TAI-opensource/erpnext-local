import { DatabaseManager } from './database-manager';

// ============================================================================
// Types
// ============================================================================

export interface SeedDataRecord {
  [key: string]: unknown;
}

export interface SeedDataCollection {
  [tableName: string]: SeedDataRecord[];
}

export interface SeedStats {
  tablesPopulated: number;
  totalRecords: number;
  recordsByTable: Record<string, number>;
  timestamp: string;
}

// ============================================================================
// Seed Data
// ============================================================================

export function getSeedData(): SeedDataCollection {
  const now = new Date().toISOString();

  return {
    // ==========================================================================
    // 1. CONFIGURACAO BASE
    // ==========================================================================

    company: [
      {
        name: '_Test Company',
        company_name: '_Test Company',
        abbr: '_TC',
        default_currency: 'BRL',
        country: 'Brazil',
        domain: 'Accounting',
        chart_of_accounts: 'Standard',
        creation: now,
        modified: now,
      },
    ],

    account: [
      // Assets
      { name: 'Root Assets', account_name: 'Root Assets', account_type: '', root_type: 'Asset', company: '_Test Company', is_group: 1, is_system_account: 1, currency: 'BRL', balance: 0, creation: now, modified: now },
      { name: '_TC - Bank', account_name: 'Bank', account_type: 'Bank', root_type: 'Asset', company: '_Test Company', parent_account: 'Root Assets', is_group: 0, is_system_account: 1, currency: 'BRL', balance: 150000.00, creation: now, modified: now },
      { name: '_TC - Cash', account_name: 'Cash', account_type: 'Cash', root_type: 'Asset', company: '_Test Company', parent_account: 'Root Assets', is_group: 0, is_system_account: 1, currency: 'BRL', balance: 25000.00, creation: now, modified: now },
      { name: '_TC - Accounts Receivable', account_name: 'Accounts Receivable', account_type: 'Receivable', root_type: 'Asset', company: '_Test Company', parent_account: 'Root Assets', is_group: 0, is_system_account: 1, currency: 'BRL', balance: 45000.00, creation: now, modified: now },
      { name: '_TC - Stock Assets', account_name: 'Stock Assets', account_type: 'Stock', root_type: 'Asset', company: '_Test Company', parent_account: 'Root Assets', is_group: 0, is_system_account: 1, currency: 'BRL', balance: 200000.00, creation: now, modified: now },
      // Liabilities
      { name: 'Root Liabilities', account_name: 'Root Liabilities', account_type: '', root_type: 'Liability', company: '_Test Company', is_group: 1, is_system_account: 1, currency: 'BRL', balance: 0, creation: now, modified: now },
      { name: '_TC - Accounts Payable', account_name: 'Accounts Payable', account_type: 'Payable', root_type: 'Liability', company: '_Test Company', parent_account: 'Root Liabilities', is_group: 0, is_system_account: 1, currency: 'BRL', balance: 35000.00, creation: now, modified: now },
      { name: '_TC - Credit Card', account_name: 'Credit Card', account_type: 'Credit Card', root_type: 'Liability', company: '_Test Company', parent_account: 'Root Liabilities', is_group: 0, is_system_account: 1, currency: 'BRL', balance: 8000.00, creation: now, modified: now },
      // Equity
      { name: 'Root Equity', account_name: 'Root Equity', account_type: '', root_type: 'Equity', company: '_Test Company', is_group: 1, is_system_account: 1, currency: 'BRL', balance: 0, creation: now, modified: now },
      { name: '_TC - Equity', account_name: 'Equity', account_type: '', root_type: 'Equity', company: '_Test Company', parent_account: 'Root Equity', is_group: 0, is_system_account: 1, currency: 'BRL', balance: 500000.00, creation: now, modified: now },
      { name: '_TC - Retained Earnings', account_name: 'Retained Earnings', account_type: '', root_type: 'Equity', company: '_Test Company', parent_account: 'Root Equity', is_group: 0, is_system_account: 1, currency: 'BRL', balance: 120000.00, creation: now, modified: now },
      // Income
      { name: 'Root Income', account_name: 'Root Income', account_type: '', root_type: 'Income', company: '_Test Company', is_group: 1, is_system_account: 1, currency: 'BRL', balance: 0, creation: now, modified: now },
      { name: '_TC - Sales', account_name: 'Sales', account_type: '', root_type: 'Income', company: '_Test Company', parent_account: 'Root Income', is_group: 0, is_system_account: 1, currency: 'BRL', balance: 85000.00, creation: now, modified: now },
      { name: '_TC - Other Income', account_name: 'Other Income', account_type: '', root_type: 'Income', company: '_Test Company', parent_account: 'Root Income', is_group: 0, is_system_account: 1, currency: 'BRL', balance: 5000.00, creation: now, modified: now },
      // Expense
      { name: 'Root Expense', account_name: 'Root Expense', account_type: '', root_type: 'Expense', company: '_Test Company', is_group: 1, is_system_account: 1, currency: 'BRL', balance: 0, creation: now, modified: now },
      { name: '_TC - Cost of Goods Sold', account_name: 'Cost of Goods Sold', account_type: '', root_type: 'Expense', company: '_Test Company', parent_account: 'Root Expense', is_group: 0, is_system_account: 1, currency: 'BRL', balance: 42000.00, creation: now, modified: now },
      { name: '_TC - Operating Expenses', account_name: 'Operating Expenses', account_type: '', root_type: 'Expense', company: '_Test Company', parent_account: 'Root Expense', is_group: 0, is_system_account: 1, currency: 'BRL', balance: 18000.00, creation: now, modified: now },
      { name: '_TC - Depreciation', account_name: 'Depreciation', account_type: '', root_type: 'Expense', company: '_Test Company', parent_account: 'Root Expense', is_group: 0, is_system_account: 1, currency: 'BRL', balance: 3500.00, creation: now, modified: now },
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
      { name: 'Ton', uom_name: 'Ton', enabled: 1, must_be_whole_number: 0 },
      { name: 'Dozen', uom_name: 'Dozen', enabled: 1, must_be_whole_number: 1 },
      { name: 'Roll', uom_name: 'Roll', enabled: 1, must_be_whole_number: 1 },
      { name: 'Bag', uom_name: 'Bag', enabled: 1, must_be_whole_number: 1 },
      { name: 'Piece', uom_name: 'Piece', enabled: 1, must_be_whole_number: 1 },
      { name: 'Sqft', uom_name: 'Sqft', enabled: 1, must_be_whole_number: 0 },
      { name: 'Rft', uom_name: 'Rft', enabled: 1, must_be_whole_number: 0 },
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

    country: [
      { name: 'Brazil', code: 'BR' },
      { name: 'United States', code: 'US' },
      { name: 'United Kingdom', code: 'GB' },
      { name: 'Germany', code: 'DE' },
      { name: 'France', code: 'FR' },
      { name: 'Japan', code: 'JP' },
      { name: 'Argentina', code: 'AR' },
      { name: 'Chile', code: 'CL' },
      { name: 'Colombia', code: 'CO' },
      { name: 'Canada', code: 'CA' },
      { name: 'Australia', code: 'AU' },
      { name: 'Mexico', code: 'MX' },
    ],

    cost_center: [
      { name: '_TC - All Cost Centers', cost_center_name: 'All Cost Centers', company: '_Test Company', is_group: 1, parent_cost_center: '', lft: 1, rgt: 8 },
      { name: '_TC - CC', cost_center_name: '_Test Cost Center - CC', company: '_Test Company', is_group: 0, parent_cost_center: '_TC - All Cost Centers', lft: 2, rgt: 3 },
      { name: '_TC - Marketing', cost_center_name: 'Marketing', company: '_Test Company', is_group: 0, parent_cost_center: '_TC - All Cost Centers', lft: 4, rgt: 5 },
      { name: '_TC - Operations', cost_center_name: 'Operations', company: '_Test Company', is_group: 0, parent_cost_center: '_TC - All Cost Centers', lft: 6, rgt: 7 },
    ],

    price_list: [
      { name: 'Standard Selling', price_list_name: 'Standard Selling', enabled: 1, currency: 'BRL', selling: 1, buying: 0 },
      { name: 'Standard Buying', price_list_name: 'Standard Buying', enabled: 1, currency: 'BRL', selling: 0, buying: 1 },
    ],

    brand: [
      { name: 'Samsung', brand_name: 'Samsung' },
      { name: 'Apple', brand_name: 'Apple' },
      { name: 'Sony', brand_name: 'Sony' },
      { name: 'LG', brand_name: 'LG' },
      { name: 'Dell', brand_name: 'Dell' },
      { name: 'HP', brand_name: 'HP' },
      { name: 'Lenovo', brand_name: 'Lenovo' },
      { name: 'Asus', brand_name: 'Asus' },
      { name: 'Acer', brand_name: 'Acer' },
      { name: 'Xiaomi', brand_name: 'Xiaomi' },
    ],

    // ==========================================================================
    // 2. DADOS DE VENDAS
    // ==========================================================================

    customer_group: [
      { name: 'All Customer Groups', customer_group_name: 'All Customer Groups', is_group: 1, parent_customer_group: '', lft: 1, rgt: 10 },
      { name: 'Commercial', customer_group_name: 'Commercial', is_group: 0, parent_customer_group: 'All Customer Groups', lft: 2, rgt: 3 },
      { name: 'Government', customer_group_name: 'Government', is_group: 0, parent_customer_group: 'All Customer Groups', lft: 4, rgt: 5 },
      { name: 'Individual', customer_group_name: 'Individual', is_group: 0, parent_customer_group: 'All Customer Groups', lft: 6, rgt: 7 },
      { name: 'Non Profit', customer_group_name: 'Non Profit', is_group: 0, parent_customer_group: 'All Customer Groups', lft: 8, rgt: 9 },
    ],

    territory: [
      { name: 'All Territories', territory_name: 'All Territories', is_group: 1, parent_territory: '', lft: 1, rgt: 20 },
      { name: 'Brazil', territory_name: 'Brazil', is_group: 1, parent_territory: 'All Territories', lft: 2, rgt: 15 },
      { name: 'S\u00E3o Paulo', territory_name: 'S\u00E3o Paulo', is_group: 0, parent_territory: 'Brazil', lft: 3, rgt: 4 },
      { name: 'Rio de Janeiro', territory_name: 'Rio de Janeiro', is_group: 0, parent_territory: 'Brazil', lft: 5, rgt: 6 },
      { name: 'Minas Gerais', territory_name: 'Minas Gerais', is_group: 0, parent_territory: 'Brazil', lft: 7, rgt: 8 },
      { name: 'Bahia', territory_name: 'Bahia', is_group: 0, parent_territory: 'Brazil', lft: 9, rgt: 10 },
      { name: 'Paran\u00E1', territory_name: 'Paran\u00E1', is_group: 0, parent_territory: 'Brazil', lft: 11, rgt: 12 },
      { name: 'Rio Grande do Sul', territory_name: 'Rio Grande do Sul', is_group: 0, parent_territory: 'Brazil', lft: 13, rgt: 14 },
      { name: 'North America', territory_name: 'North America', is_group: 1, parent_territory: 'All Territories', lft: 16, rgt: 17 },
      { name: 'Europe', territory_name: 'Europe', is_group: 1, parent_territory: 'All Territories', lft: 18, rgt: 19 },
    ],

    customer: [
      {
        name: '_Test Customer',
        customer_name: '_Test Customer',
        customer_type: 'Individual',
        customer_group: 'Individual',
        territory: 'Brazil',
        default_currency: 'BRL',
        default_price_list: 'Standard Selling',
        tax_id: '123.456.789-00',
        disabled: 0,
        creation: now,
        modified: now,
      },
      {
        name: 'ABC Corporation',
        customer_name: 'ABC Corporation',
        customer_type: 'Company',
        customer_group: 'Commercial',
        territory: 'S\u00E3o Paulo',
        default_currency: 'BRL',
        default_price_list: 'Standard Selling',
        tax_id: '12.345.678/0001-90',
        disabled: 0,
        creation: now,
        modified: now,
      },
      {
        name: 'XYZ Industries',
        customer_name: 'XYZ Industries',
        customer_type: 'Company',
        customer_group: 'Commercial',
        territory: 'Rio de Janeiro',
        default_currency: 'BRL',
        default_price_list: 'Standard Selling',
        tax_id: '98.765.432/0001-10',
        disabled: 0,
        creation: now,
        modified: now,
      },
      {
        name: 'Global Tech Ltda',
        customer_name: 'Global Tech Ltda',
        customer_type: 'Company',
        customer_group: 'Commercial',
        territory: 'Minas Gerais',
        default_currency: 'BRL',
        default_price_list: 'Standard Selling',
        tax_id: '11.223.344/0001-55',
        disabled: 0,
        creation: now,
        modified: now,
      },
      {
        name: 'Beta Solutions',
        customer_name: 'Beta Solutions',
        customer_type: 'Company',
        customer_group: 'Government',
        territory: 'Bahia',
        default_currency: 'BRL',
        default_price_list: 'Standard Selling',
        tax_id: '55.667.788/0001-33',
        disabled: 0,
        creation: now,
        modified: now,
      },
      {
        name: 'Maria Silva',
        customer_name: 'Maria Silva',
        customer_type: 'Individual',
        customer_group: 'Individual',
        territory: 'Paran\u00E1',
        default_currency: 'BRL',
        default_price_list: 'Standard Selling',
        tax_id: '999.888.777-66',
        disabled: 0,
        creation: now,
        modified: now,
      },
      {
        name: 'Gamma Enterprises',
        customer_name: 'Gamma Enterprises',
        customer_type: 'Company',
        customer_group: 'Commercial',
        territory: 'Rio Grande do Sul',
        default_currency: 'BRL',
        default_price_list: 'Standard Selling',
        tax_id: '77.888.999/0001-22',
        disabled: 0,
        creation: now,
        modified: now,
      },
    ],

    // ==========================================================================
    // 3. DADOS DE COMPRAS
    // ==========================================================================

    supplier_group: [
      { name: 'All Supplier Groups', supplier_group_name: 'All Supplier Groups', is_group: 1, parent_supplier_group: '', lft: 1, rgt: 10 },
      { name: 'Raw Material', supplier_group_name: 'Raw Material', is_group: 0, parent_supplier_group: 'All Supplier Groups', lft: 2, rgt: 3 },
      { name: 'Sub Assemblies', supplier_group_name: 'Sub Assemblies', is_group: 0, parent_supplier_group: 'All Supplier Groups', lft: 4, rgt: 5 },
      { name: 'Consumable', supplier_group_name: 'Consumable', is_group: 0, parent_supplier_group: 'All Supplier Groups', lft: 6, rgt: 7 },
      { name: 'Capital Equipment', supplier_group_name: 'Capital Equipment', is_group: 0, parent_supplier_group: 'All Supplier Groups', lft: 8, rgt: 9 },
    ],

    supplier: [
      {
        name: '_Test Supplier',
        supplier_name: '_Test Supplier',
        supplier_type: 'Company',
        supplier_group: 'Raw Material',
        country: 'Brazil',
        default_currency: 'BRL',
        default_price_list: 'Standard Buying',
        tax_id: '11.111.111/0001-11',
        disabled: 0,
        on_hold: 0,
        creation: now,
        modified: now,
      },
      {
        name: 'DEF Suppliers',
        supplier_name: 'DEF Suppliers',
        supplier_type: 'Company',
        supplier_group: 'Raw Material',
        country: 'Brazil',
        default_currency: 'BRL',
        default_price_list: 'Standard Buying',
        tax_id: '22.222.222/0001-22',
        disabled: 0,
        on_hold: 0,
        creation: now,
        modified: now,
      },
      {
        name: 'GHI Materials',
        supplier_name: 'GHI Materials',
        supplier_type: 'Company',
        supplier_group: 'Sub Assemblies',
        country: 'Brazil',
        default_currency: 'BRL',
        default_price_list: 'Standard Buying',
        tax_id: '33.333.333/0001-33',
        disabled: 0,
        on_hold: 0,
        creation: now,
        modified: now,
      },
      {
        name: 'JKL Parts',
        supplier_name: 'JKL Parts',
        supplier_type: 'Company',
        supplier_group: 'Consumable',
        country: 'Brazil',
        default_currency: 'BRL',
        default_price_list: 'Standard Buying',
        tax_id: '44.444.444/0001-44',
        disabled: 0,
        on_hold: 0,
        creation: now,
        modified: now,
      },
      {
        name: 'MNO Tech',
        supplier_name: 'MNO Tech',
        supplier_type: 'Company',
        supplier_group: 'Capital Equipment',
        country: 'Brazil',
        default_currency: 'BRL',
        default_price_list: 'Standard Buying',
        tax_id: '55.555.555/0001-55',
        disabled: 0,
        on_hold: 0,
        creation: now,
        modified: now,
      },
      {
        name: 'PQR International',
        supplier_name: 'PQR International',
        supplier_type: 'Company',
        supplier_group: 'Raw Material',
        country: 'United States',
        default_currency: 'USD',
        default_price_list: 'Standard Buying',
        tax_id: 'US-123456789',
        disabled: 0,
        on_hold: 0,
        creation: now,
        modified: now,
      },
    ],

    // ==========================================================================
    // 4. DADOS DE ESTOQUE
    // ==========================================================================

    item_group: [
      { name: 'All Item Groups', item_group_name: 'All Item Groups', is_group: 1, parent_item_group: '', lft: 1, rgt: 12 },
      { name: 'Products', item_group_name: 'Products', is_group: 0, parent_item_group: 'All Item Groups', lft: 2, rgt: 3 },
      { name: 'Raw Material', item_group_name: 'Raw Material', is_group: 0, parent_item_group: 'All Item Groups', lft: 4, rgt: 5 },
      { name: 'Sub Assemblies', item_group_name: 'Sub Assemblies', is_group: 0, parent_item_group: 'All Item Groups', lft: 6, rgt: 7 },
      { name: 'Consumable', item_group_name: 'Consumable', is_group: 0, parent_item_group: 'All Item Groups', lft: 8, rgt: 9 },
      { name: 'Capital Equipment', item_group_name: 'Capital Equipment', is_group: 0, parent_item_group: 'All Item Groups', lft: 10, rgt: 11 },
    ],

    warehouse: [
      { name: 'Stores - _TC', warehouse_name: 'Stores - _TC', company: '_Test Company', is_group: 0, parent_warehouse: 'All Warehouses - _TC', account: '_TC - Stock Assets', disabled: 0, is_rejected_warehouse: 0, warehouse_type: '', lft: 1, rgt: 2, creation: now, modified: now },
      { name: 'Finished Goods - _TC', warehouse_name: 'Finished Goods - _TC', company: '_Test Company', is_group: 0, parent_warehouse: 'All Warehouses - _TC', account: '_TC - Stock Assets', disabled: 0, is_rejected_warehouse: 0, warehouse_type: '', lft: 3, rgt: 4, creation: now, modified: now },
      { name: 'Work In Progress - _TC', warehouse_name: 'Work In Progress - _TC', company: '_Test Company', is_group: 0, parent_warehouse: 'All Warehouses - _TC', account: '_TC - Stock Assets', disabled: 0, is_rejected_warehouse: 0, warehouse_type: '', lft: 5, rgt: 6, creation: now, modified: now },
      { name: 'Raw Materials - _TC', warehouse_name: 'Raw Materials - _TC', company: '_Test Company', is_group: 0, parent_warehouse: 'All Warehouses - _TC', account: '_TC - Stock Assets', disabled: 0, is_rejected_warehouse: 0, warehouse_type: '', lft: 7, rgt: 8, creation: now, modified: now },
      { name: 'Dispatch - _TC', warehouse_name: 'Dispatch - _TC', company: '_Test Company', is_group: 0, parent_warehouse: 'All Warehouses - _TC', account: '_TC - Stock Assets', disabled: 0, is_rejected_warehouse: 0, warehouse_type: '', lft: 9, rgt: 10, creation: now, modified: now },
      { name: 'Transit - _TC', warehouse_name: 'Transit - _TC', company: '_Test Company', is_group: 0, parent_warehouse: 'All Warehouses - _TC', account: '_TC - Stock Assets', disabled: 0, is_rejected_warehouse: 0, warehouse_type: 'Transit', lft: 11, rgt: 12, creation: now, modified: now },
      { name: 'Rejected Goods - _TC', warehouse_name: 'Rejected Goods - _TC', company: '_Test Company', is_group: 0, parent_warehouse: 'All Warehouses - _TC', account: '_TC - Stock Assets', disabled: 0, is_rejected_warehouse: 1, warehouse_type: '', lft: 13, rgt: 14, creation: now, modified: now },
    ],

    item: [
      {
        name: '_Test Item',
        item_code: '_Test Item',
        item_name: '_Test Item',
        item_group: 'Products',
        stock_uom: 'Unit',
        is_stock_item: 1,
        is_sales_item: 1,
        is_purchase_item: 1,
        is_fixed_asset: 0,
        has_variants: 0,
        variant_of: '',
        disabled: 0,
        standard_rate: 150.00,
        valuation_rate: 100.00,
        has_batch_no: 0,
        has_serial_no: 0,
        brand: 'Samsung',
        description: 'Test item for ERPNext banking module',
        creation: now,
        modified: now,
      },
      {
        name: 'WDG00001',
        item_code: 'WDG00001',
        item_name: 'Widget Alpha',
        item_group: 'Products',
        stock_uom: 'Unit',
        is_stock_item: 1,
        is_sales_item: 1,
        is_purchase_item: 1,
        is_fixed_asset: 0,
        has_variants: 0,
        variant_of: '',
        disabled: 0,
        standard_rate: 250.00,
        valuation_rate: 180.00,
        has_batch_no: 0,
        has_serial_no: 0,
        brand: 'Samsung',
        description: 'Widget Alpha - high precision component',
        creation: now,
        modified: now,
      },
      {
        name: 'WDG00002',
        item_code: 'WDG00002',
        item_name: 'Widget Beta',
        item_group: 'Products',
        stock_uom: 'Unit',
        is_stock_item: 1,
        is_sales_item: 1,
        is_purchase_item: 1,
        is_fixed_asset: 0,
        has_variants: 0,
        variant_of: '',
        disabled: 0,
        standard_rate: 320.00,
        valuation_rate: 220.00,
        has_batch_no: 0,
        has_serial_no: 0,
        brand: 'Apple',
        description: 'Widget Beta - premium component',
        creation: now,
        modified: now,
      },
      {
        name: 'WDG00003',
        item_code: 'WDG00003',
        item_name: 'Widget Gamma',
        item_group: 'Products',
        stock_uom: 'Unit',
        is_stock_item: 1,
        is_sales_item: 1,
        is_purchase_item: 1,
        is_fixed_asset: 0,
        has_variants: 0,
        variant_of: '',
        disabled: 0,
        standard_rate: 175.00,
        valuation_rate: 120.00,
        has_batch_no: 0,
        has_serial_no: 0,
        brand: 'Sony',
        description: 'Widget Gamma - standard component',
        creation: now,
        modified: now,
      },
      {
        name: 'WDG00004',
        item_code: 'WDG00004',
        item_name: 'Widget Delta',
        item_group: 'Products',
        stock_uom: 'Unit',
        is_stock_item: 1,
        is_sales_item: 1,
        is_purchase_item: 1,
        is_fixed_asset: 0,
        has_variants: 0,
        variant_of: '',
        disabled: 0,
        standard_rate: 450.00,
        valuation_rate: 300.00,
        has_batch_no: 0,
        has_serial_no: 0,
        brand: 'LG',
        description: 'Widget Delta - advanced component',
        creation: now,
        modified: now,
      },
      {
        name: 'WDG00005',
        item_code: 'WDG00005',
        item_name: 'Widget Epsilon',
        item_group: 'Raw Material',
        stock_uom: 'Kg',
        is_stock_item: 1,
        is_sales_item: 0,
        is_purchase_item: 1,
        is_fixed_asset: 0,
        has_variants: 0,
        variant_of: '',
        disabled: 0,
        standard_rate: 45.00,
        valuation_rate: 30.00,
        has_batch_no: 0,
        has_serial_no: 0,
        brand: 'Dell',
        description: 'Widget Epsilon - raw material component',
        creation: now,
        modified: now,
      },
      {
        name: 'WDG00006',
        item_code: 'WDG00006',
        item_name: 'Widget Zeta',
        item_group: 'Consumable',
        stock_uom: 'Box',
        is_stock_item: 1,
        is_sales_item: 0,
        is_purchase_item: 1,
        is_fixed_asset: 0,
        has_variants: 0,
        variant_of: '',
        disabled: 0,
        standard_rate: 80.00,
        valuation_rate: 55.00,
        has_batch_no: 0,
        has_serial_no: 0,
        brand: 'HP',
        description: 'Widget Zeta - consumable part',
        creation: now,
        modified: now,
      },
      {
        name: 'WDG00007',
        item_code: 'WDG00007',
        item_name: 'Widget Eta',
        item_group: 'Sub Assemblies',
        stock_uom: 'Set',
        is_stock_item: 1,
        is_sales_item: 1,
        is_purchase_item: 1,
        is_fixed_asset: 0,
        has_variants: 0,
        variant_of: '',
        disabled: 0,
        standard_rate: 580.00,
        valuation_rate: 400.00,
        has_batch_no: 0,
        has_serial_no: 0,
        brand: 'Lenovo',
        description: 'Widget Eta - sub-assembly unit',
        creation: now,
        modified: now,
      },
      {
        name: 'WDG00008',
        item_code: 'WDG00008',
        item_name: 'Widget Theta',
        item_group: 'Products',
        stock_uom: 'Unit',
        is_stock_item: 1,
        is_sales_item: 1,
        is_purchase_item: 1,
        is_fixed_asset: 0,
        has_variants: 0,
        variant_of: '',
        disabled: 0,
        standard_rate: 720.00,
        valuation_rate: 480.00,
        has_batch_no: 0,
        has_serial_no: 0,
        brand: 'Asus',
        description: 'Widget Theta - premium finished product',
        creation: now,
        modified: now,
      },
      {
        name: 'WDG00009',
        item_code: 'WDG00009',
        item_name: 'Widget Iota',
        item_group: 'Raw Material',
        stock_uom: 'Ltr',
        is_stock_item: 1,
        is_sales_item: 0,
        is_purchase_item: 1,
        is_fixed_asset: 0,
        has_variants: 0,
        variant_of: '',
        disabled: 0,
        standard_rate: 25.00,
        valuation_rate: 18.00,
        has_batch_no: 1,
        has_serial_no: 0,
        brand: 'Acer',
        description: 'Widget Iota - liquid raw material',
        creation: now,
        modified: now,
      },
      {
        name: 'WDG00010',
        item_code: 'WDG00010',
        item_name: 'Widget Kappa',
        item_group: 'Products',
        stock_uom: 'Unit',
        is_stock_item: 1,
        is_sales_item: 1,
        is_purchase_item: 1,
        is_fixed_asset: 0,
        has_variants: 0,
        variant_of: '',
        disabled: 0,
        standard_rate: 950.00,
        valuation_rate: 650.00,
        has_batch_no: 0,
        has_serial_no: 1,
        brand: 'Xiaomi',
        description: 'Widget Kappa - serialized premium product',
        creation: now,
        modified: now,
      },
      {
        name: 'WDG00011',
        item_code: 'WDG00011',
        item_name: 'Widget Lambda',
        item_group: 'Products',
        stock_uom: 'Unit',
        is_stock_item: 1,
        is_sales_item: 1,
        is_purchase_item: 1,
        is_fixed_asset: 0,
        has_variants: 0,
        variant_of: '',
        disabled: 0,
        standard_rate: 1200.00,
        valuation_rate: 800.00,
        has_batch_no: 0,
        has_serial_no: 0,
        brand: 'Samsung',
        description: 'Widget Lambda - enterprise grade product',
        creation: now,
        modified: now,
      },
      {
        name: 'WDG00012',
        item_code: 'WDG00012',
        item_name: 'Widget Mu',
        item_group: 'Capital Equipment',
        stock_uom: 'Unit',
        is_stock_item: 1,
        is_sales_item: 1,
        is_purchase_item: 1,
        is_fixed_asset: 1,
        has_variants: 0,
        variant_of: '',
        disabled: 0,
        standard_rate: 15000.00,
        valuation_rate: 12000.00,
        has_batch_no: 0,
        has_serial_no: 1,
        brand: 'Dell',
        description: 'Widget Mu - capital equipment item',
        creation: now,
        modified: now,
      },
    ],

    item_price: [
      { name: '_Test Item-Standard Selling', item_code: '_Test Item', price_list: 'Standard Selling', price_list_rate: 150.00, currency: 'BRL', uom: 'Unit', valid_from: now.split('T')[0], disable: 0 },
      { name: '_Test Item-Standard Buying', item_code: '_Test Item', price_list: 'Standard Buying', price_list_rate: 100.00, currency: 'BRL', uom: 'Unit', valid_from: now.split('T')[0], disable: 0 },
      { name: 'WDG00001-Standard Selling', item_code: 'WDG00001', price_list: 'Standard Selling', price_list_rate: 250.00, currency: 'BRL', uom: 'Unit', valid_from: now.split('T')[0], disable: 0 },
      { name: 'WDG00001-Standard Buying', item_code: 'WDG00001', price_list: 'Standard Buying', price_list_rate: 180.00, currency: 'BRL', uom: 'Unit', valid_from: now.split('T')[0], disable: 0 },
      { name: 'WDG00002-Standard Selling', item_code: 'WDG00002', price_list: 'Standard Selling', price_list_rate: 320.00, currency: 'BRL', uom: 'Unit', valid_from: now.split('T')[0], disable: 0 },
      { name: 'WDG00002-Standard Buying', item_code: 'WDG00002', price_list: 'Standard Buying', price_list_rate: 220.00, currency: 'BRL', uom: 'Unit', valid_from: now.split('T')[0], disable: 0 },
      { name: 'WDG00003-Standard Selling', item_code: 'WDG00003', price_list: 'Standard Selling', price_list_rate: 175.00, currency: 'BRL', uom: 'Unit', valid_from: now.split('T')[0], disable: 0 },
      { name: 'WDG00003-Standard Buying', item_code: 'WDG00003', price_list: 'Standard Buying', price_list_rate: 120.00, currency: 'BRL', uom: 'Unit', valid_from: now.split('T')[0], disable: 0 },
      { name: 'WDG00004-Standard Selling', item_code: 'WDG00004', price_list: 'Standard Selling', price_list_rate: 450.00, currency: 'BRL', uom: 'Unit', valid_from: now.split('T')[0], disable: 0 },
      { name: 'WDG00004-Standard Buying', item_code: 'WDG00004', price_list: 'Standard Buying', price_list_rate: 300.00, currency: 'BRL', uom: 'Unit', valid_from: now.split('T')[0], disable: 0 },
      { name: 'WDG00005-Standard Buying', item_code: 'WDG00005', price_list: 'Standard Buying', price_list_rate: 30.00, currency: 'BRL', uom: 'Kg', valid_from: now.split('T')[0], disable: 0 },
      { name: 'WDG00006-Standard Buying', item_code: 'WDG00006', price_list: 'Standard Buying', price_list_rate: 55.00, currency: 'BRL', uom: 'Box', valid_from: now.split('T')[0], disable: 0 },
      { name: 'WDG00007-Standard Selling', item_code: 'WDG00007', price_list: 'Standard Selling', price_list_rate: 580.00, currency: 'BRL', uom: 'Set', valid_from: now.split('T')[0], disable: 0 },
      { name: 'WDG00007-Standard Buying', item_code: 'WDG00007', price_list: 'Standard Buying', price_list_rate: 400.00, currency: 'BRL', uom: 'Set', valid_from: now.split('T')[0], disable: 0 },
      { name: 'WDG00008-Standard Selling', item_code: 'WDG00008', price_list: 'Standard Selling', price_list_rate: 720.00, currency: 'BRL', uom: 'Unit', valid_from: now.split('T')[0], disable: 0 },
      { name: 'WDG00008-Standard Buying', item_code: 'WDG00008', price_list: 'Standard Buying', price_list_rate: 480.00, currency: 'BRL', uom: 'Unit', valid_from: now.split('T')[0], disable: 0 },
      { name: 'WDG00009-Standard Buying', item_code: 'WDG00009', price_list: 'Standard Buying', price_list_rate: 18.00, currency: 'BRL', uom: 'Ltr', valid_from: now.split('T')[0], disable: 0 },
      { name: 'WDG00010-Standard Selling', item_code: 'WDG00010', price_list: 'Standard Selling', price_list_rate: 950.00, currency: 'BRL', uom: 'Unit', valid_from: now.split('T')[0], disable: 0 },
      { name: 'WDG00010-Standard Buying', item_code: 'WDG00010', price_list: 'Standard Buying', price_list_rate: 650.00, currency: 'BRL', uom: 'Unit', valid_from: now.split('T')[0], disable: 0 },
      { name: 'WDG00011-Standard Selling', item_code: 'WDG00011', price_list: 'Standard Selling', price_list_rate: 1200.00, currency: 'BRL', uom: 'Unit', valid_from: now.split('T')[0], disable: 0 },
      { name: 'WDG00011-Standard Buying', item_code: 'WDG00011', price_list: 'Standard Buying', price_list_rate: 800.00, currency: 'BRL', uom: 'Unit', valid_from: now.split('T')[0], disable: 0 },
      { name: 'WDG00012-Standard Selling', item_code: 'WDG00012', price_list: 'Standard Selling', price_list_rate: 15000.00, currency: 'BRL', uom: 'Unit', valid_from: now.split('T')[0], disable: 0 },
      { name: 'WDG00012-Standard Buying', item_code: 'WDG00012', price_list: 'Standard Buying', price_list_rate: 12000.00, currency: 'BRL', uom: 'Unit', valid_from: now.split('T')[0], disable: 0 },
    ],

    // ==========================================================================
    // 5. DADOS FINANCEIROS
    // ==========================================================================

    tax_category: [
      { name: 'Regular', valid_for_country: 'Brazil' },
      { name: 'Exempt', valid_for_country: 'Brazil' },
      { name: 'Export', valid_for_country: 'Brazil' },
    ],

    sales_taxes_and_charges_template: [
      { name: 'GST 5%', company: '_Test Company', tax_category: 'Regular' },
      { name: 'GST 12%', company: '_Test Company', tax_category: 'Regular' },
      { name: 'GST 18%', company: '_Test Company', tax_category: 'Regular' },
      { name: 'GST 28%', company: '_Test Company', tax_category: 'Regular' },
    ],

    purchase_taxes_and_charges_template: [
      { name: 'GST 5% - PURCHASE', company: '_Test Company', tax_category: 'Regular' },
      { name: 'GST 12% - PURCHASE', company: '_Test Company', tax_category: 'Regular' },
      { name: 'GST 18% - PURCHASE', company: '_Test Company', tax_category: 'Regular' },
      { name: 'GST 28% - PURCHASE', company: '_Test Company', tax_category: 'Regular' },
    ],

    payment_terms_template: [
      { name: 'Net 30', template_name: 'Net 30' },
      { name: 'Net 60', template_name: 'Net 60' },
      { name: 'Net 90', template_name: 'Net 90' },
      { name: '30 Days', template_name: '30 Days' },
      { name: '15 Days', template_name: '15 Days' },
      { name: 'Due on Receipt', template_name: 'Due on Receipt' },
    ],

    mode_of_payment: [
      { name: 'Cash', mode_of_payment: 'Cash', type: 'Cash' },
      { name: 'Bank Transfer', mode_of_payment: 'Bank Transfer', type: 'Bank' },
      { name: 'Credit Card', mode_of_payment: 'Credit Card', type: 'Bank' },
      { name: 'Debit Card', mode_of_payment: 'Debit Card', type: 'Bank' },
      { name: 'Check', mode_of_payment: 'Check', type: 'Bank' },
      { name: 'PIX', mode_of_payment: 'PIX', type: 'Bank' },
      { name: 'Boleto', mode_of_payment: 'Boleto', type: 'Bank' },
    ],

    // ==========================================================================
    // 6. DADOS DE BANCO
    // ==========================================================================

    bank: [
      { name: 'Banco do Brasil', bank_name: 'Banco do Brasil', swift_number: 'BRASBRRJ', country: 'Brazil', website: 'https://www.bb.com.br' },
      { name: 'Itau Unibanco', bank_name: 'Itau Unibanco', swift_number: 'ITAUBRSP', country: 'Brazil', website: 'https://www.itau.com.br' },
      { name: 'Bradesco', bank_name: 'Bradesco', swift_number: 'BRDEBRSP', country: 'Brazil', website: 'https://www.bradesco.com.br' },
      { name: 'Santander', bank_name: 'Santander', swift_number: 'BSCHBRSP', country: 'Brazil', website: 'https://www.santander.com.br' },
      { name: 'Caixa Economica Federal', bank_name: 'Caixa Economica Federal', swift_number: 'CEABRRJR', country: 'Brazil', website: 'https://www.caixa.gov.br' },
      { name: 'Banco Inter', bank_name: 'Banco Inter', swift_number: 'BCORBRMT', country: 'Brazil', website: 'https://www.inter.co' },
      { name: 'Nubank', bank_name: 'Nubank', swift_number: 'NuBankBR', country: 'Brazil', website: 'https://nubank.com.br' },
    ],

    bank_account: [
      {
        name: '_Test Bank Account',
        account_name: '_Test Bank Account',
        account_type: 'Savings',
        bank: 'Banco do Brasil',
        account_no: '123456-7',
        iban: 'BR1234567890123456789012345',
        swift_code: 'BRASBRRJ',
        branch: '0001',
        company: '_Test Company',
        is_default: 1,
        disabled: 0,
        creation: now,
      },
      {
        name: '_Test Bank Account - Itau',
        account_name: '_Test Bank Account - Itau',
        account_type: 'Savings',
        bank: 'Itau Unibanco',
        account_no: '987654-3',
        iban: 'BR9876543210987654321098765',
        swift_code: 'ITAUBRSP',
        branch: '0002',
        company: '_Test Company',
        is_default: 0,
        disabled: 0,
        creation: now,
      },
    ],

    // ==========================================================================
    // 7. DADOS DE USUARIO
    // ==========================================================================

    user: [
      {
        name: 'Administrator',
        email: 'administrator@erpnext.local',
        full_name: 'Administrator',
        role_profile: 'System Manager',
        enabled: 1,
        last_active: now,
        user_type: 'System User',
      },
      {
        name: 'user@erpnext.local',
        email: 'user@erpnext.local',
        full_name: 'Test User',
        role_profile: 'Sales User',
        enabled: 1,
        last_active: now,
        user_type: 'System User',
      },
    ],

    // ==========================================================================
    // 8. DADOS DE MANUFACTURA
    // ==========================================================================

    workstation: [
      {
        name: '_Test Workstation',
        workstation_name: '_Test Workstation',
        workstation_type: 'Manufacturing',
        company: '_Test Company',
        warehouse: 'Work In Progress - _TC',
        cost_center: '_TC - CC',
        creation: now,
        modified: now,
      },
    ],

    operation: [
      {
        name: '_Test Operation',
        operation_name: '_Test Operation',
        workstation_type: 'Manufacturing',
        company: '_Test Company',
        description: 'Test manufacturing operation for ERPNext banking module',
      },
    ],

    // ==========================================================================
    // 9. DADOS DE CRM
    // ==========================================================================

    campaign: [
      {
        name: '_Test Campaign',
        campaign_name: '_Test Campaign',
        campaign_type: 'Campaign',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        description: 'Test campaign for ERPNext banking module',
        creation: now,
        modified: now,
      },
    ],

    lead: [
      {
        name: 'LEAD-001',
        lead_name: 'John Doe',
        lead_owner: 'Administrator',
        company_name: 'Doe Enterprises',
        email_id: 'john.doe@example.com',
        phone: '+55-11-99999-0001',
        mobile_no: '+55-11-98888-0001',
        source: 'Campaign',
        status: 'Lead',
        territory: 'S\u00E3o Paulo',
        customer_group: 'Commercial',
        creation: now,
        modified: now,
      },
      {
        name: 'LEAD-002',
        lead_name: 'Jane Smith',
        lead_owner: 'Administrator',
        company_name: 'Smith Corp',
        email_id: 'jane.smith@example.com',
        phone: '+55-21-99999-0002',
        mobile_no: '+55-21-98888-0002',
        source: 'Cold Call',
        status: 'Lead',
        territory: 'Rio de Janeiro',
        customer_group: 'Commercial',
        creation: now,
        modified: now,
      },
      {
        name: 'LEAD-003',
        lead_name: 'Pedro Santos',
        lead_owner: 'Administrator',
        company_name: 'Santos Ltda',
        email_id: 'pedro.santos@example.com',
        phone: '+55-31-99999-0003',
        mobile_no: '+55-31-98888-0003',
        source: 'Website',
        status: 'Lead',
        territory: 'Minas Gerais',
        customer_group: 'Individual',
        creation: now,
        modified: now,
      },
    ],

    // ==========================================================================
    // 10. DADOS DE PROJETOS
    // ==========================================================================

    activity_type: [
      {
        name: 'Planning',
        activity_type: 'Planning',
        costing_rate: 50.00,
        billing_rate: 75.00,
        creation: now,
        modified: now,
      },
      {
        name: 'Execution',
        activity_type: 'Execution',
        costing_rate: 80.00,
        billing_rate: 120.00,
        creation: now,
        modified: now,
      },
      {
        name: 'Testing',
        activity_type: 'Testing',
        costing_rate: 70.00,
        billing_rate: 100.00,
        creation: now,
        modified: now,
      },
    ],

    // ==========================================================================
    // 11. DADOS DE QUALIDADE
    // ==========================================================================

    quality_inspection_template: [
      {
        name: '_Test QI Template',
        template_name: '_Test QI Template',
        creation: now,
        modified: now,
      },
    ],

    // ==========================================================================
    // 12. DADOS DE SUPORTE
    // ==========================================================================

    issue_type: [
      { name: 'Bug', issue_type_name: 'Bug', parent_issue_type: '', is_group: 0, lft: 1, rgt: 2 },
      { name: 'Feature Request', issue_type_name: 'Feature Request', parent_issue_type: '', is_group: 0, lft: 3, rgt: 4 },
      { name: 'Question', issue_type_name: 'Question', parent_issue_type: '', is_group: 0, lft: 5, rgt: 6 },
      { name: 'Enhancement', issue_type_name: 'Enhancement', parent_issue_type: '', is_group: 0, lft: 7, rgt: 8 },
    ],
  };
}

// ============================================================================
// Seed Database Function
// ============================================================================

export function seedDatabase(db: DatabaseManager): SeedStats {
  const seedData = getSeedData();
  const recordsByTable: Record<string, number> = {};
  let totalRecords = 0;

  for (const [tableName, rows] of Object.entries(seedData)) {
    if (!rows.length) continue;

    const columns = Object.keys(rows[0]);
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT OR IGNORE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders});`;

    for (const row of rows) {
      const values = columns.map((col) => (row as Record<string, unknown>)[col] ?? null);
      db.run(sql, values);
    }

    recordsByTable[tableName] = rows.length;
    totalRecords += rows.length;
  }

  return {
    tablesPopulated: Object.keys(recordsByTable).length,
    totalRecords,
    recordsByTable,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// Clear Seed Data Function
// ============================================================================

export function clearSeedData(db: DatabaseManager): void {
  const seedData = getSeedData();
  const tableNames = Object.keys(seedData);

  // Clear in reverse dependency order
  const childTables = [
    'item_price', 'item', 'item_group', 'brand',
    'warehouse',
    'customer', 'customer_group',
    'supplier', 'supplier_group',
    'territory',
    'price_list',
    'bank_account', 'bank',
    'user',
    'workstation', 'operation',
    'campaign', 'lead',
    'activity_type',
    'quality_inspection_template',
    'issue_type',
    'tax_category', 'sales_taxes_and_charges_template', 'purchase_taxes_and_charges_template',
    'payment_terms_template', 'mode_of_payment',
    'account', 'company',
    'cost_center',
    'currency', 'country', 'uom',
  ];

  for (const tableName of childTables) {
    if (tableNames.includes(tableName)) {
      db.run(`DELETE FROM ${tableName};`);
    }
  }
}

// ============================================================================
// Full Table List for reference
// ============================================================================

export const ALL_SEED_TABLES = [
  // Base
  'company', 'account', 'uom', 'currency', 'country', 'cost_center', 'price_list', 'brand',
  // Selling
  'customer_group', 'territory', 'customer',
  // Buying
  'supplier_group', 'supplier',
  // Stock
  'item_group', 'warehouse', 'item', 'item_price',
  // Financial
  'tax_category', 'sales_taxes_and_charges_template', 'purchase_taxes_and_charges_template',
  'payment_terms_template', 'mode_of_payment',
  // Banking
  'bank', 'bank_account',
  // User
  'user',
  // Manufacturing
  'workstation', 'operation',
  // CRM
  'campaign', 'lead',
  // Projects
  'activity_type',
  // Quality
  'quality_inspection_template',
  // Support
  'issue_type',
];
