// ============================================================================
// Real API Handlers - Consultas SQLite Locais
// ============================================================================

import { getBackend } from './index';

// ============================================================================
// Helper Functions
// ============================================================================

function generateName(): string {
  return `DOC-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

function formatCurrency(amount: number, currency: string = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(amount);
}

// ============================================================================
// Stock Handlers - Item Details
// ============================================================================

export async function handleGetItemDetails(args: any): Promise<any> {
  const backend = getBackend();
  const { item_code, company, customer, warehouse, quantity } = args;

  // Buscar item
  const items = backend.db.getRows('item', { item_code });
  const item = items[0];
  if (!item) return { message: {} };

  // Buscar preço
  const priceList = customer ? 'Standard Selling' : 'Standard Buying';
  const prices = backend.db.getRows('item_price', { item_code, price_list: priceList });
  const itemPrice = prices[0];

  // Buscar contas padrão (via company defaults)
  const companies = backend.db.getRows('company', { name: company });
  const companyData = companies[0];

  return {
    message: {
      item_code: item.item_code,
      item_name: item.item_name,
      item_group: item.item_group,
      stock_uom: item.stock_uom,
      description: item.description,
      standard_rate: 0,
      price_list_rate: itemPrice?.price_list_rate || 0,
      price_list_currency: itemPrice?.currency || companyData?.default_currency || 'BRL',
      currency: companyData?.default_currency || 'BRL',
      income_account: companyData?.default_bank_account,
      expense_account: companyData?.default_bank_account,
      warehouse: warehouse || companyData?.default_cost_center,
      has_batch_no: 0,
      has_serial_no: 0,
      is_stock_item: item.is_stock_item,
      is_fixed_asset: item.is_fixed_asset,
      conversion_factor: 1,
      actual_qty: 0,
      projected_qty: 0,
      reserved_qty: 0,
      ordered_qty: 0,
    },
  };
}

export async function handleGetItemTaxTemplate(args: any): Promise<any> {
  const backend = getBackend();
  const { item_code, company, tax_category } = args;

  const templates = backend.db.getRows('tax_template', { company });
  const template = templates[0];

  return {
    message: template
      ? {
          tax_template: template.name,
          taxes: JSON.parse((template.taxes as string) || '[]'),
        }
      : null,
  };
}

export async function handleGetConversionFactor(args: any): Promise<any> {
  const { item_code, uom } = args;
  return {
    message: {
      conversion_factor: 1,
      uom: uom || 'Nos',
    },
  };
}

export async function handleGetBinDetails(args: any): Promise<any> {
  const { item_code, warehouse } = args;
  return {
    message: {
      actual_qty: 0,
      projected_qty: 0,
      reserved_qty: 0,
      ordered_qty: 0,
      reserved_qty_for_production: 0,
      warehouse,
    },
  };
}

export async function handleGetDefaultBOM(args: any): Promise<any> {
  const { item_code } = args;
  return {
    message: null,
  };
}

export async function handleApplyPriceList(args: any): Promise<any> {
  const backend = getBackend();
  const { item_code, price_list, qty, uom } = args;

  const prices = backend.db.getRows('item_price', {
    item_code,
    price_list: price_list || 'Standard Selling',
  });
  const price = prices[0];

  return {
    message: {
      price_list_rate: price?.price_list_rate || 0,
      currency: price?.currency || 'BRL',
      price_list_uom: price?.uom || 'Nos',
      conversion_factor: 1,
    },
  };
}

// ============================================================================
// Party Handlers
// ============================================================================

export async function handleGetPartyAccount(args: any): Promise<any> {
  const backend = getBackend();
  const { party_type, party, company } = args;

  // Buscar conta padrão baseada no tipo de partido
  let account = null;

  if (party_type === 'Customer') {
    const customers = backend.db.getRows('customer', { name: party });
    if (customers.length > 0) {
      // Buscar conta de receita padrão para a empresa
      const accounts = backend.db.getRows('account', {
        company,
        account_type: 'Receivable',
      });
      if (accounts.length > 0) {
        account = accounts[0].name;
      }
    }
  } else if (party_type === 'Supplier') {
    const suppliers = backend.db.getRows('supplier', { name: party });
    if (suppliers.length > 0) {
      // Buscar conta de despesa padrão para a empresa
      const accounts = backend.db.getRows('account', {
        company,
        account_type: 'Payable',
      });
      if (accounts.length > 0) {
        account = accounts[0].name;
      }
    }
  }

  return { message: account };
}

export async function handleGetPartyBalance(args: any): Promise<any> {
  const backend = getBackend();
  const { party_type, party, company } = args;

  // Buscar saldo via GL entries
  const result = backend.db.executeWithHeaders(
    `
    SELECT 
      COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) as balance
    FROM gl_entry
    WHERE party_type = ?
    AND party = ?
    AND company = ?
    AND is_cancelled = 0
  `,
    [party_type, party, company]
  );

  const balance = result.values.length > 0 ? (result.values[0][0] as number) || 0 : 0;

  return {
    message: {
      balance,
      currency: 'BRL',
    },
  };
}

export async function handleGetPartyDetails(args: any): Promise<any> {
  const backend = getBackend();
  const { party_type, party, company } = args;

  let partyData: Record<string, unknown> = {};

  if (party_type === 'Customer') {
    const customers = backend.db.getRows('customer', { name: party });
    if (customers.length > 0) {
      partyData = customers[0];
    }
  } else if (party_type === 'Supplier') {
    const suppliers = backend.db.getRows('supplier', { name: party });
    if (suppliers.length > 0) {
      partyData = suppliers[0];
    }
  }

  const companies = backend.db.getRows('company', { name: company });
  const companyData = companies[0];

  return {
    message: {
      party_name: (partyData.customer_name as string) || (partyData.supplier_name as string) || '',
      party_type,
      territory: partyData.territory || '',
      default_currency: partyData.default_currency || companyData?.default_currency || 'BRL',
      default_bank_account: companyData?.default_bank_account || '',
      default_income_account: '',
      default_expense_account: '',
      default_cost_center: companyData?.default_cost_center || '',
      primary_address: '',
      primary_contact: '',
    },
  };
}

export async function handleSetTaxes(args: any): Promise<any> {
  const backend = getBackend();
  const { party_type, party, company, tax_category } = args;

  const templates = backend.db.getRows('tax_template', { company });
  const template = templates[0];

  if (!template) {
    return {
      message: {
        taxes: [],
        tax_template: '',
      },
    };
  }

  const taxes = JSON.parse((template.taxes as string) || '[]');

  return {
    message: {
      taxes,
      tax_template: template.name,
    },
  };
}

export async function handleGetDueDate(args: any): Promise<any> {
  const { payment_terms_template, posting_date } = args;

  // Padrão: 30 dias
  const baseDate = new Date(posting_date || new Date());
  baseDate.setDate(baseDate.getDate() + 30);

  return {
    message: baseDate.toISOString().split('T')[0],
  };
}

export async function handleGetAddressTaxCategory(args: any): Promise<any> {
  return {
    message: 'Domestic',
  };
}

// ============================================================================
// Banking Handlers
// ============================================================================

export async function handleGetBankTransactions(args: any): Promise<any> {
  const backend = getBackend();
  const { bank_account, from_date, to_date, all_transactions } = args;

  let sql = `
    SELECT bt.*, ba.account_name, ba.bank
    FROM bank_transaction bt
    LEFT JOIN bank_account ba ON bt.bank_account = ba.name
    WHERE bt.bank_account = ?
  `;
  const params: unknown[] = [bank_account];

  if (from_date) {
    sql += ' AND bt.date >= ?';
    params.push(from_date);
  }

  if (to_date) {
    sql += ' AND bt.date <= ?';
    params.push(to_date);
  }

  if (!all_transactions) {
    sql += " AND bt.status != 'Reconciled'";
  }

  sql += ' ORDER BY bt.date DESC';

  const result = backend.db.executeWithHeaders(sql, params);

  const transactions = result.values.map((row) => {
    const record: Record<string, unknown> = {};
    result.columns.forEach((col, i) => {
      record[col] = row[i];
    });
    return record;
  });

  return { message: transactions };
}

export async function handleGetLinkedPayments(args: any): Promise<any> {
  const backend = getBackend();
  const { bank_transaction_name, document_types, from_date, to_date, filter_by_reference_date } = args;

  // Buscar vouchers não reconciliados (Payment Entries e Journal Entries)
  let sql = `
    SELECT pe.name, pe.party_type, pe.party, pe.paid_amount as amount, 
           pe.posting_date, pe.reference_doctype, pe.reference_name, pe.paid_to,
           'Payment Entry' as doctype
    FROM payment_entry pe
    WHERE pe.docstatus = 1
    AND pe.status != 'Reconciled'
  `;
  const params: unknown[] = [];

  if (from_date && filter_by_reference_date) {
    sql += ' AND pe.posting_date >= ?';
    params.push(from_date);
  }

  if (to_date && filter_by_reference_date) {
    sql += ' AND pe.posting_date <= ?';
    params.push(to_date);
  }

  // Filtrar por tipos de documento se especificado
  if (document_types && document_types.length > 0) {
    const docTypes = document_types.map(() => '?').join(',');
    sql += ` AND 'Payment Entry' IN (${docTypes})`;
    params.push(...document_types);
  }

  sql += ' ORDER BY pe.posting_date DESC';

  const result = backend.db.executeWithHeaders(sql, params);

  const payments = result.values.map((row) => {
    const record: Record<string, unknown> = {};
    result.columns.forEach((col, i) => {
      record[col] = row[i];
    });
    return record;
  });

  return { message: payments };
}

export async function handleReconcileVouchers(args: any): Promise<any> {
  const backend = getBackend();
  const { bank_transaction_name, vouchers } = args;

  // Marcar transação como reconciliada
  backend.db.run(
    "UPDATE bank_transaction SET status = 'Reconciled', modified_at = ? WHERE name = ?",
    [new Date().toISOString(), bank_transaction_name]
  );

  // Atualizar linked vouchers se fornecidos
  if (vouchers) {
    const voucherList = typeof vouchers === 'string' ? JSON.parse(vouchers) : vouchers;

    for (const voucher of voucherList) {
      // Criar registro de reconciliação
      const reconName = generateName();
      backend.db.insertRow('bank_reconciliation', {
        name: reconName,
        bank_account: '',
        bank_transaction: bank_transaction_name,
        reference_doctype: voucher.payment_doctype || 'Payment Entry',
        reference_name: voucher.payment_name,
        allocated_amount: voucher.amount || 0,
        status: 'Reconciled',
        reconciled_by: 'Administrator',
        reconciled_on: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });

      // Atualizar status do Payment Entry se existir
      if (voucher.payment_name) {
        backend.db.run(
          "UPDATE payment_entry SET status = 'Reconciled', modified_at = ? WHERE name = ?",
          [new Date().toISOString(), voucher.payment_name]
        );
      }
    }
  }

  return {
    message: {
      status: 'Reconciled',
      bank_transaction: bank_transaction_name,
    },
  };
}

export async function handleGetAccountBalance(args: any): Promise<any> {
  const backend = getBackend();
  const { bank_account, company, till_date } = args;
  const cutoff = till_date || new Date().toISOString().split('T')[0];

  console.log('[DEBUG] handleGetAccountBalance called:', { bank_account, company, cutoff });

  // 1. Try GL entries first
  const glResult = backend.db.executeWithHeaders(
    `
    SELECT 
      COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) as balance
    FROM gl_entry
    WHERE account = ?
    AND posting_date <= ?
    AND is_cancelled = 0
  `,
    [bank_account, cutoff]
  );
  const glBalance = glResult.values.length > 0 ? (glResult.values[0][0] as number) || 0 : 0;
  console.log('[DEBUG] GL balance:', glBalance, 'glResult:', glResult.values);
  if (glBalance !== 0) {
    return { message: glBalance };
  }

  // 2. Try last bank_transaction balance before cutoff
  const btResult = backend.db.executeWithHeaders(
    `SELECT balance FROM bank_transaction WHERE bank_account = ? AND date <= ? ORDER BY date DESC, created_at DESC LIMIT 1`,
    [bank_account, cutoff]
  );
  console.log('[DEBUG] BT balance:', btResult.values, 'bank_account:', bank_account);
  if (btResult.values.length > 0 && btResult.values[0][0] != null) {
    return { message: btResult.values[0][0] };
  }

  // 3. Fallback: use bank_account's stored balance (opening balance for new accounts)
  const acctResult = backend.db.executeWithHeaders(
    `SELECT balance FROM bank_account WHERE name = ?`,
    [bank_account]
  );
  console.log('[DEBUG] Acct balance fallback:', acctResult.values, 'bank_account:', bank_account);
  const acctBalance = acctResult.values.length > 0 ? (acctResult.values[0][0] as number) || 0 : 0;
  return { message: acctBalance };
}

export async function handleGetOlderUnreconciledTransactions(args: any): Promise<any> {
  const backend = getBackend();
  const { bank_account, from_date } = args;

  let sql = `
    SELECT COUNT(*) as count, MIN(date) as oldest_date
    FROM bank_transaction
    WHERE bank_account = ?
    AND status != 'Reconciled'
  `;
  const params: unknown[] = [bank_account];

  if (from_date) {
    sql += ' AND date < ?';
    params.push(from_date);
  }

  const result = backend.db.executeWithHeaders(sql, params);

  const data = result.values.length > 0
    ? { count: result.values[0][0] || 0, oldest_date: result.values[0][1] || '' }
    : { count: 0, oldest_date: '' };

  return { message: data };
}

export async function handleGetBankAccountList(args: any): Promise<any> {
  const backend = getBackend();
  const { company } = args;

  let accounts;
  if (company) {
    accounts = backend.db.getRows('bank_account', { company, disabled: 0 });
  } else {
    accounts = backend.db.getRows('bank_account', { disabled: 0 });
  }

  return { message: accounts };
}

export async function handleGetClosingBalance(args: any): Promise<any> {
  const backend = getBackend();
  const { bank_account, date } = args;

  // Buscar última transação até a data especificada
  const result = backend.db.executeWithHeaders(
    `
    SELECT balance
    FROM bank_transaction
    WHERE bank_account = ?
    AND date <= ?
    ORDER BY date DESC, created_at DESC
    LIMIT 1
  `,
    [bank_account, date]
  );

  const balance = result.values.length > 0 ? result.values[0][0] : 0;

  return {
    message: {
      balance: balance || 0,
      date,
    },
  };
}

// ============================================================================
// Accounts Utils Handlers
// ============================================================================

export async function handleGetFiscalYear(args: any): Promise<any> {
  const { date, company } = args;

  const targetDate = new Date(date || new Date());
  const year = targetDate.getFullYear();

  // Fiscal year padrão: janeiro a dezembro
  return {
    message: {
      name: `${year}-${company || 'All'}`,
      year: `${year}`,
      year_start_date: `${year}-01-01`,
      year_end_date: `${year}-12-31`,
      company: company || '',
    },
  };
}

export async function handleGetCOA(args: any): Promise<any> {
  const backend = getBackend();
  const { company, parent_account } = args;

  let sql = 'SELECT * FROM account WHERE company = ?';
  const params: unknown[] = [company];

  if (parent_account) {
    sql += ' AND parent_account = ?';
    params.push(parent_account);
  } else {
    sql += ' AND parent_account IS NULL';
  }

  sql += ' ORDER BY name';

  const result = backend.db.executeWithHeaders(sql, params);

  const accounts = result.values.map((row) => {
    const record: Record<string, unknown> = {};
    result.columns.forEach((col, i) => {
      record[col] = row[i];
    });
    return record;
  });

  return { message: accounts };
}

// ============================================================================
// Stock Utils Handlers
// ============================================================================

export async function handleGetIncomingRate(args: any): Promise<any> {
  const { item_code, warehouse, posting_date, voucher_type, voucher_no } = args;

  // Taxa de entrada padrão (seria calculada baseado em últimas entradas)
  return {
    message: 0,
  };
}

export async function handleGetSerialBatchData(args: any): Promise<any> {
  const { item_code, warehouse, qty, type_of_transaction } = args;

  return {
    message: {
      batch_data: [],
      serial_data: [],
    },
  };
}

// ============================================================================
// Manufacturing Handlers
// ============================================================================

export async function handleGetShopFloorContext(args: any): Promise<any> {
  const backend = getBackend();
  const { company } = args;

  // Buscar work orders em andamento
  const result = backend.db.executeWithHeaders(
    `
    SELECT wo.name, wo.production_item, wo.company, wo.status,
           wo.qty, wo.produced_qty, wo.planned_start_date
    FROM work_order wo
    WHERE wo.company = ?
    AND wo.status IN ('In Process', 'Not Started')
    ORDER BY wo.planned_start_date ASC
    LIMIT 50
  `,
    [company]
  );

  const workOrders = result.values.map((row) => {
    const record: Record<string, unknown> = {};
    result.columns.forEach((col, i) => {
      record[col] = row[i];
    });
    return record;
  });

  return {
    message: {
      work_orders: workOrders,
      company,
    },
  };
}

export async function handleGetWorkOrders(args: any): Promise<any> {
  const backend = getBackend();
  const { company, status } = args;

  let sql = 'SELECT * FROM work_order WHERE company = ?';
  const params: unknown[] = [company];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  sql += ' ORDER BY name DESC';

  const result = backend.db.executeWithHeaders(sql, params);

  const workOrders = result.values.map((row) => {
    const record: Record<string, unknown> = {};
    result.columns.forEach((col, i) => {
      record[col] = row[i];
    });
    return record;
  });

  return { message: workOrders };
}

// ============================================================================
// Accounts Controller Handlers
// ============================================================================

export async function handleGetDefaultTaxes(args: any): Promise<any> {
  const backend = getBackend();
  const { company } = args;

  const templates = backend.db.getRows('tax_template', { company });

  if (templates.length === 0) {
    return { message: { taxes_and_charges: '', taxes: [] } };
  }

  const template = templates[0];
  const taxes = JSON.parse((template.taxes as string) || '[]');

  return {
    message: {
      taxes_and_charges: template.name,
      taxes,
    },
  };
}

export async function handleGetTaxRate(args: any): Promise<any> {
  const backend = getBackend();
  const { tax_template, use_for_shopping_cart } = args;

  if (!tax_template) {
    return { message: [] };
  }

  const templates = backend.db.getRows('tax_template', { name: tax_template });

  if (templates.length === 0) {
    return { message: [] };
  }

  const taxes = JSON.parse((templates[0].taxes as string) || '[]');

  return { message: taxes };
}

export async function handleGetTaxesAndCharges(args: any): Promise<any> {
  const backend = getBackend();
  const { taxes_and_charges } = args;

  if (!taxes_and_charges) {
    return { message: [] };
  }

  const templates = backend.db.getRows('tax_template', { name: taxes_and_charges });

  if (templates.length === 0) {
    return { message: [] };
  }

  const taxes = JSON.parse((templates[0].taxes as string) || '[]');

  return { message: taxes };
}

export async function handleGetPaymentTerms(args: any): Promise<any> {
  const { terms_template, grand_total, posting_date } = args;

  // Padrão: pagamento à vista
  const baseDate = new Date(posting_date || new Date());

  return {
    message: [
      {
        payment_term: 'Net 30',
        due_date: new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        invoice_portion: 100,
        amount: grand_total,
      },
    ],
  };
}

// ============================================================================
// Frappe Client Handlers - CRUD Operations
// ============================================================================

export async function handleFrappeClientGet(args: any): Promise<any> {
  const backend = getBackend();
  const { doctype, filters, fields, limit, start, order_by } = args;

  // Converter tabela doctype para nome da tabela no SQLite
  const tableName = doctype.toLowerCase().replace(/ /g, '_');

  let sql = 'SELECT * FROM ' + tableName;
  const params: unknown[] = [];
  const conditions: string[] = [];

  if (filters) {
    if (typeof filters === 'string') {
      // Filtro simples: name = value
      conditions.push('name = ?');
      params.push(filters);
    } else if (Array.isArray(filters)) {
      // Array de filtros
      for (const filter of filters) {
        if (filter.length === 3) {
          const [field, op, value] = filter;
          if (op === '=') {
            conditions.push(`${field} = ?`);
            params.push(value);
          } else if (op === '!=') {
            conditions.push(`${field} != ?`);
            params.push(value);
          } else if (op === 'like') {
            conditions.push(`${field} LIKE ?`);
            params.push(value);
          } else if (op === 'in') {
            conditions.push(`${field} IN (${value.map(() => '?').join(',')})`);
            params.push(...value);
          }
        }
      }
    } else {
      // Objeto de filtros
      for (const [key, value] of Object.entries(filters)) {
        if (value !== null && value !== undefined) {
          conditions.push(`${key} = ?`);
          params.push(value);
        }
      }
    }
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  if (order_by) {
    sql += ' ORDER BY ' + order_by;
  } else {
    sql += ' ORDER BY name';
  }

  if (limit) {
    sql += ' LIMIT ' + limit;
  }

  if (start) {
    sql += ' OFFSET ' + start;
  }

  try {
    const result = backend.db.executeWithHeaders(sql, params);

    const records = result.values.map((row) => {
      const record: Record<string, unknown> = {};
      result.columns.forEach((col, i) => {
        record[col] = row[i];
      });

      // Filtrar campos se especificado
      if (fields && fields.length > 0) {
        const filtered: Record<string, unknown> = {};
        for (const field of fields) {
          if (field in record) {
            filtered[field] = record[field];
          }
        }
        return filtered;
      }

      return record;
    });

    return { message: records };
  } catch (error) {
    // Tabela pode não existir
    return { message: [] };
  }
}

export async function handleFrappeClientGetCount(args: any): Promise<any> {
  const backend = getBackend();
  const { doctype, filters } = args;

  const tableName = doctype.toLowerCase().replace(/ /g, '_');

  let sql = 'SELECT COUNT(*) as count FROM ' + tableName;
  const params: unknown[] = [];
  const conditions: string[] = [];

  if (filters) {
    if (typeof filters === 'string') {
      conditions.push('name = ?');
      params.push(filters);
    } else if (typeof filters === 'object' && !Array.isArray(filters)) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== null && value !== undefined) {
          conditions.push(`${key} = ?`);
          params.push(value);
        }
      }
    }
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  try {
    const result = backend.db.executeWithHeaders(sql, params);
    const count = result.values.length > 0 ? result.values[0][0] : 0;
    return { message: count };
  } catch {
    return { message: 0 };
  }
}

export async function handleFrappeClientGetValue(args: any): Promise<any> {
  const backend = getBackend();
  const { doctype, filters, fieldname } = args;

  const tableName = doctype.toLowerCase().replace(/ /g, '_');

  let sql = 'SELECT * FROM ' + tableName;
  const params: unknown[] = [];
  const conditions: string[] = [];

  if (filters) {
    if (typeof filters === 'string') {
      conditions.push('name = ?');
      params.push(filters);
    } else if (typeof filters === 'object' && !Array.isArray(filters)) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== null && value !== undefined) {
          conditions.push(`${key} = ?`);
          params.push(value);
        }
      }
    }
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' LIMIT 1';

  try {
    const result = backend.db.executeWithHeaders(sql, params);

    if (result.values.length === 0) {
      return { message: null };
    }

    const record: Record<string, unknown> = {};
    result.columns.forEach((col, i) => {
      record[col] = result.values[0][i];
    });

    if (fieldname) {
      return { message: record[fieldname] };
    }

    return { message: record };
  } catch {
    return { message: null };
  }
}

export async function handleFrappeClientInsert(args: any): Promise<any> {
  const backend = getBackend();
  const { doc } = args;

  if (!doc || !doc.doctype) {
    throw new Error('Invalid document: doctype is required');
  }

  const tableName = doc.doctype.toLowerCase().replace(/ /g, '_');
  const now = new Date().toISOString();

  // Preparar dados
  const data: Record<string, unknown> = {
    ...doc,
    name: doc.name || generateName(),
    created_at: doc.created_at || now,
    modified_at: now,
  };

  // Remover campos não existentes na tabela
  delete data.doctype;

  try {
    backend.db.insertRow(tableName, data);
    return { message: data };
  } catch (error) {
    throw new Error(`Failed to insert ${doc.doctype}: ${(error as Error).message}`);
  }
}

export async function handleFrappeClientSave(args: any): Promise<any> {
  const backend = getBackend();
  const { doctype, name, doc } = args;

  if (!doctype || !name) {
    throw new Error('Invalid arguments: doctype and name are required');
  }

  const tableName = doctype.toLowerCase().replace(/ /g, '_');
  const now = new Date().toISOString();

  // Preparar dados
  const data: Record<string, unknown> = {
    ...(doc as Record<string, unknown>),
    modified_at: now,
  };

  try {
    backend.db.updateRow(tableName, name, data);
    return { message: { name, ...data } };
  } catch (error) {
    throw new Error(`Failed to save ${doctype}: ${(error as Error).message}`);
  }
}

export async function handleFrappeClientDelete(args: any): Promise<any> {
  const backend = getBackend();
  const { doctype, name } = args;

  if (!doctype || !name) {
    throw new Error('Invalid arguments: doctype and name are required');
  }

  const tableName = doctype.toLowerCase().replace(/ /g, '_');

  try {
    backend.db.deleteRow(tableName, name);
    return { message: 'ok' };
  } catch (error) {
    throw new Error(`Failed to delete ${doctype}: ${(error as Error).message}`);
  }
}

export async function handleFrappeClientSubmit(args: any): Promise<any> {
  const backend = getBackend();
  const { doc } = args;

  if (!doc || !doc.doctype) {
    throw new Error('Invalid document: doctype is required');
  }

  const tableName = doc.doctype.toLowerCase().replace(/ /g, '_');
  const now = new Date().toISOString();

  // Preparar dados com docstatus = 1 (submitted)
  const data: Record<string, unknown> = {
    ...doc,
    name: doc.name || generateName(),
    docstatus: 1,
    status: 'Submitted',
    created_at: doc.created_at || now,
    modified_at: now,
  };

  delete data.doctype;

  try {
    backend.db.insertRow(tableName, data);
    return { message: data };
  } catch (error) {
    throw new Error(`Failed to submit ${doc.doctype}: ${(error as Error).message}`);
  }
}

export async function handleFrappeClientCancel(args: any): Promise<any> {
  const backend = getBackend();
  const { doctype, name } = args;

  if (!doctype || !name) {
    throw new Error('Invalid arguments: doctype and name are required');
  }

  const tableName = doctype.toLowerCase().replace(/ /g, '_');
  const now = new Date().toISOString();

  try {
    backend.db.updateRow(tableName, name, {
      docstatus: 2,
      status: 'Cancelled',
      modified_at: now,
    });
    return { message: 'ok' };
  } catch (error) {
    throw new Error(`Failed to cancel ${doctype}: ${(error as Error).message}`);
  }
}

export async function handleFrappeClientSetValue(args: any): Promise<any> {
  const backend = getBackend();
  const { doctype, name, fieldname, value } = args;

  if (!doctype || !name || !fieldname) {
    throw new Error('Invalid arguments: doctype, name, and fieldname are required');
  }

  const tableName = doctype.toLowerCase().replace(/ /g, '_');
  const now = new Date().toISOString();

  try {
    backend.db.updateRow(tableName, name, {
      [fieldname]: value,
      modified_at: now,
    });
    return { message: { doctype, name, fieldname, value } };
  } catch (error) {
    throw new Error(`Failed to set value for ${doctype}: ${(error as Error).message}`);
  }
}

// ============================================================================
// Handler Registry
// ============================================================================

export const realHandlers: Record<string, (args: any) => Promise<any>> = {
  // Stock - Item Details
  'erpnext.stock.get_item_details.get_item_details': handleGetItemDetails,
  'erpnext.stock.get_item_details.get_item_tax_template': handleGetItemTaxTemplate,
  'erpnext.stock.get_item_details.get_conversion_factor': handleGetConversionFactor,
  'erpnext.stock.get_item_details.get_bin_details': handleGetBinDetails,
  'erpnext.stock.get_item_details.get_default_bom': handleGetDefaultBOM,
  'erpnext.stock.get_item_details.apply_price_list': handleApplyPriceList,

  // Party
  'erpnext.accounts.party.get_party_account': handleGetPartyAccount,
  'erpnext.accounts.party.get_party_balance': handleGetPartyBalance,
  'erpnext.accounts.party.get_party_details': handleGetPartyDetails,
  'erpnext.accounts.party.set_taxes': handleSetTaxes,
  'erpnext.accounts.party.get_due_date': handleGetDueDate,
  'erpnext.accounts.party.get_address_tax_category': handleGetAddressTaxCategory,

  // Accounts Controller
  'erpnext.controllers.accounts_controller.get_default_taxes_and_charges': handleGetDefaultTaxes,
  'erpnext.controllers.accounts_controller.get_tax_rate': handleGetTaxRate,
  'erpnext.controllers.accounts_controller.get_taxes_and_charges': handleGetTaxesAndCharges,
  'erpnext.controllers.accounts_controller.get_payment_terms': handleGetPaymentTerms,

  // Banking - Reconciliation
  'erpnext.accounts.doctype.bank_reconciliation_tool.bank_reconciliation_tool.get_bank_transactions': handleGetBankTransactions,
  'erpnext.accounts.doctype.bank_reconciliation_tool.bank_reconciliation_tool.get_linked_payments': handleGetLinkedPayments,
  'erpnext.accounts.doctype.bank_reconciliation_tool.bank_reconciliation_tool.reconcile_vouchers': handleReconcileVouchers,
  'erpnext.accounts.doctype.bank_reconciliation_tool.bank_reconciliation_tool.get_account_balance': handleGetAccountBalance,
  'erpnext.accounts.doctype.bank_reconciliation_tool.bank_reconciliation_tool.get_older_unreconciled_transactions': handleGetOlderUnreconciledTransactions,

  // Banking - Bank Account
  'erpnext.accounts.doctype.bank_account.bank_account.get_list': handleGetBankAccountList,
  'erpnext.accounts.doctype.bank_account.bank_account.get_closing_balance_as_per_statement': handleGetClosingBalance,

  // Accounts Utils
  'erpnext.accounts.utils.get_fiscal_year': handleGetFiscalYear,
  'erpnext.accounts.utils.get_coa': handleGetCOA,

  // Stock Utils
  'erpnext.stock.utils.get_incoming_rate': handleGetIncomingRate,
  'erpnext.stock.doctype.serial_and_batch_bundle.serial_and_batch_bundle.get_auto_data': handleGetSerialBatchData,

  // Manufacturing
  'erpnext.manufacturing.page.shop_floor.shop_floor.get_shop_floor_context': handleGetShopFloorContext,
  'erpnext.manufacturing.page.shop_floor.shop_floor.get_work_orders': handleGetWorkOrders,

  // Frappe Client - CRUD
  'frappe.client.get': handleFrappeClientGet,
  'frappe.client.get_list': handleFrappeClientGet,
  'frappe.client.get_count': handleFrappeClientGetCount,
  'frappe.client.get_value': handleFrappeClientGetValue,
  'frappe.client.insert': handleFrappeClientInsert,
  'frappe.client.save': handleFrappeClientSave,
  'frappe.client.delete': handleFrappeClientDelete,
  'frappe.client.submit': handleFrappeClientSubmit,
  'frappe.client.cancel': handleFrappeClientCancel,
  'frappe.client.set_value': handleFrappeClientSetValue,
};

// ============================================================================
// Export Helper
// ============================================================================

export function getRealHandler(method: string): ((args: any) => Promise<any>) | undefined {
  return realHandlers[method];
}

export function hasRealHandler(method: string): boolean {
  return method in realHandlers;
}
