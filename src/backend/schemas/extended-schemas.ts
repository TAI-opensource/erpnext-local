export function createExtendedSchemas(): string {
  return `
-- ============================================================
-- MANUFACTURING MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS bom (
  name TEXT PRIMARY KEY,
  item TEXT,
  company TEXT,
  quantity REAL,
  uom TEXT,
  with_operations INTEGER,
  is_active INTEGER,
  is_default INTEGER,
  currency TEXT,
  conversion_rate REAL,
  rm_cost_as_per TEXT,
  buying_price_list TEXT,
  raw_material_cost REAL,
  operating_cost REAL,
  total_cost REAL,
  docstatus INTEGER,
  creation TEXT,
  modified TEXT
);

CREATE INDEX IF NOT EXISTS idx_bom_item ON bom(item);
CREATE INDEX IF NOT EXISTS idx_bom_company ON bom(company);

CREATE TABLE IF NOT EXISTS bom_item (
  parent TEXT,
  parenttype TEXT,
  item_code TEXT,
  item_name TEXT,
  qty REAL,
  rate REAL,
  amount REAL,
  uom TEXT,
  conversion_factor REAL,
  warehouse TEXT,
  row_id TEXT,
  PRIMARY KEY (parent, row_id)
);

CREATE TABLE IF NOT EXISTS bom_operation (
  parent TEXT,
  parenttype TEXT,
  operation TEXT,
  workstation TEXT,
  time_in_mins REAL,
  operating_cost REAL,
  row_id TEXT,
  PRIMARY KEY (parent, row_id)
);

CREATE TABLE IF NOT EXISTS bom_exploded_item (
  parent TEXT,
  parenttype TEXT,
  item_code TEXT,
  item_name TEXT,
  quantity REAL,
  rate REAL,
  amount REAL,
  uom TEXT,
  warehouse TEXT,
  row_id TEXT,
  PRIMARY KEY (parent, row_id)
);

CREATE TABLE IF NOT EXISTS work_order (
  name TEXT PRIMARY KEY,
  production_item TEXT,
  item_name TEXT,
  bom_no TEXT,
  company TEXT,
  qty REAL,
  produced_qty REAL,
  material_transferred_for_manufacturing REAL,
  started_manufacturing INTEGER,
  source_warehouse TEXT,
  wip_warehouse TEXT,
  fg_warehouse TEXT,
  scrap_warehouse TEXT,
  status TEXT,
  project TEXT,
  expected_start_date TEXT,
  expected_end_date TEXT,
  actual_start_date TEXT,
  actual_end_date TEXT,
  docstatus INTEGER,
  creation TEXT,
  modified TEXT
);

CREATE INDEX IF NOT EXISTS idx_work_order_production_item ON work_order(production_item);
CREATE INDEX IF NOT EXISTS idx_work_order_company ON work_order(company);
CREATE INDEX IF NOT EXISTS idx_work_order_status ON work_order(status);

CREATE TABLE IF NOT EXISTS work_order_item (
  parent TEXT,
  parenttype TEXT,
  item_code TEXT,
  qty REAL,
  warehouse TEXT,
  required_qty REAL,
  consumed_qty REAL,
  row_id TEXT,
  PRIMARY KEY (parent, row_id)
);

CREATE TABLE IF NOT EXISTS job_card (
  name TEXT PRIMARY KEY,
  work_order TEXT,
  operation TEXT,
  workstation TEXT,
  operation_id TEXT,
  company TEXT,
  status TEXT,
  for_quantity REAL,
  time_required REAL,
  docstatus INTEGER,
  creation TEXT,
  modified TEXT
);

CREATE INDEX IF NOT EXISTS idx_job_card_work_order ON job_card(work_order);
CREATE INDEX IF NOT EXISTS idx_job_card_status ON job_card(status);

CREATE TABLE IF NOT EXISTS job_card_item (
  parent TEXT,
  parenttype TEXT,
  item_code TEXT,
  qty REAL,
  warehouse TEXT,
  source_warehouse TEXT,
  row_id TEXT,
  PRIMARY KEY (parent, row_id)
);

CREATE TABLE IF NOT EXISTS job_card_time_log (
  parent TEXT,
  parenttype TEXT,
  from_time TEXT,
  to_time TEXT,
  time_in_mins REAL,
  completed_qty REAL,
  operation TEXT,
  workstation TEXT,
  row_id TEXT,
  PRIMARY KEY (parent, row_id)
);

CREATE TABLE IF NOT EXISTS operation (
  name TEXT PRIMARY KEY,
  operation_name TEXT,
  workstation_type TEXT,
  company TEXT,
  description TEXT
);

CREATE TABLE IF NOT EXISTS workstation (
  name TEXT PRIMARY KEY,
  workstation_name TEXT,
  workstation_type TEXT,
  company TEXT,
  warehouse TEXT,
  cost_center TEXT,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS routing (
  name TEXT PRIMARY KEY,
  routing_name TEXT,
  company TEXT,
  docstatus INTEGER,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS production_plan (
  name TEXT PRIMARY KEY,
  company TEXT,
  customer TEXT,
  sales_order TEXT,
  status TEXT,
  docstatus INTEGER,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS production_plan_item (
  parent TEXT,
  parenttype TEXT,
  item_code TEXT,
  bom_no TEXT,
  qty REAL,
  warehouse TEXT,
  row_id TEXT,
  PRIMARY KEY (parent, row_id)
);

CREATE TABLE IF NOT EXISTS manufacturing_settings (
  name TEXT PRIMARY KEY,
  allow_overtime INTEGER,
  job_card_creation_method TEXT,
  automatic_work_order_creation INTEGER
);

-- ============================================================
-- CRM MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS lead (
  name TEXT PRIMARY KEY,
  lead_name TEXT,
  lead_owner TEXT,
  company_name TEXT,
  email_id TEXT,
  phone TEXT,
  mobile_no TEXT,
  source TEXT,
  status TEXT,
  territory TEXT,
  customer_group TEXT,
  creation TEXT,
  modified TEXT
);

CREATE INDEX IF NOT EXISTS idx_lead_lead_owner ON lead(lead_owner);
CREATE INDEX IF NOT EXISTS idx_lead_status ON lead(status);

CREATE TABLE IF NOT EXISTS opportunity (
  name TEXT PRIMARY KEY,
  opportunity_from TEXT,
  party_name TEXT,
  opportunity_type TEXT,
  status TEXT,
  sales_stage TEXT,
  expected_closing TEXT,
  company TEXT,
  territory TEXT,
  creation TEXT,
  modified TEXT
);

CREATE INDEX IF NOT EXISTS idx_opportunity_opportunity_from ON opportunity(opportunity_from);
CREATE INDEX IF NOT EXISTS idx_opportunity_status ON opportunity(status);

CREATE TABLE IF NOT EXISTS opportunity_item (
  parent TEXT,
  parenttype TEXT,
  item_code TEXT,
  item_name TEXT,
  qty REAL,
  rate REAL,
  amount REAL,
  row_id TEXT,
  PRIMARY KEY (parent, row_id)
);

CREATE TABLE IF NOT EXISTS prospect (
  name TEXT PRIMARY KEY,
  prospect_name TEXT,
  company_name TEXT,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS contract (
  name TEXT PRIMARY KEY,
  party_name TEXT,
  party_type TEXT,
  contract_type TEXT,
  status TEXT,
  start_date TEXT,
  end_date TEXT,
  company TEXT,
  docstatus INTEGER,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS campaign (
  name TEXT PRIMARY KEY,
  campaign_name TEXT,
  campaign_type TEXT,
  start_date TEXT,
  end_date TEXT,
  description TEXT,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS email_campaign (
  name TEXT PRIMARY KEY,
  campaign_name TEXT,
  recipients TEXT,
  start_date TEXT,
  status TEXT,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS competitor (
  name TEXT PRIMARY KEY,
  competitor_name TEXT,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS appointment (
  name TEXT PRIMARY KEY,
  party TEXT,
  party_name TEXT,
  scheduled_date TEXT,
  status TEXT,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS crm_settings (
  name TEXT PRIMARY KEY,
  default_lead_owner TEXT,
  allow_lead_creation_for TEXT
);

-- ============================================================
-- ASSETS MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS asset (
  name TEXT PRIMARY KEY,
  asset_name TEXT,
  asset_category TEXT,
  company TEXT,
  purchase_date TEXT,
  gross_purchase_amount REAL,
  purchase_amount REAL,
  opening_accumulated_depreciation REAL,
  current_asset_value REAL,
  location TEXT,
  warehouse TEXT,
  custodian TEXT,
  status TEXT,
  creation TEXT,
  modified TEXT
);

CREATE INDEX IF NOT EXISTS idx_asset_asset_category ON asset(asset_category);
CREATE INDEX IF NOT EXISTS idx_asset_company ON asset(company);
CREATE INDEX IF NOT EXISTS idx_asset_status ON asset(status);

CREATE TABLE IF NOT EXISTS asset_category (
  name TEXT PRIMARY KEY,
  asset_category_name TEXT,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS asset_category_depreciation_type (
  parent TEXT,
  parenttype TEXT,
  depreciation_type TEXT,
  PRIMARY KEY (parent, depreciation_type)
);

CREATE TABLE IF NOT EXISTS asset_depreciation_schedule (
  name TEXT PRIMARY KEY,
  asset TEXT,
  asset_value REAL,
  total_depreciation_amount REAL,
  number_of_depreciations INTEGER,
  monthly_depreciation_amount REAL,
  schedule_date TEXT,
  journal_entry TEXT,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS asset_maintenance (
  name TEXT PRIMARY KEY,
  asset TEXT,
  maintenance_type TEXT,
  start_date TEXT,
  end_date TEXT,
  status TEXT,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS asset_maintenance_task (
  parent TEXT,
  parenttype TEXT,
  task_name TEXT,
  task_date TEXT,
  task_status TEXT,
  row_id TEXT,
  PRIMARY KEY (parent, row_id)
);

CREATE TABLE IF NOT EXISTS asset_movement (
  name TEXT PRIMARY KEY,
  asset TEXT,
  purpose TEXT,
  from_location TEXT,
  to_location TEXT,
  date TEXT,
  creation TEXT
);

CREATE TABLE IF NOT EXISTS asset_repair (
  name TEXT PRIMARY KEY,
  asset TEXT,
  failure_date TEXT,
  status TEXT,
  completion_date TEXT,
  cost_center TEXT,
  company TEXT,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS asset_capitalization (
  name TEXT PRIMARY KEY,
  company TEXT,
  date TEXT,
  asset TEXT,
  fixed_asset_account TEXT,
  asset_quantity REAL,
  capitalization_amount REAL,
  source TEXT,
  status TEXT,
  docstatus INTEGER,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS depreciation_template (
  name TEXT PRIMARY KEY,
  template_name TEXT,
  number_of_depreciations INTEGER,
  total_number_of_depreciations INTEGER
);

CREATE TABLE IF NOT EXISTS location (
  name TEXT PRIMARY KEY,
  location_name TEXT,
  creation TEXT,
  modified TEXT
);

-- ============================================================
-- PROJECTS MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS project (
  name TEXT PRIMARY KEY,
  project_name TEXT,
  company TEXT,
  status TEXT,
  priority TEXT,
  percent_complete REAL,
  expected_start_date TEXT,
  expected_end_date TEXT,
  actual_start_date TEXT,
  actual_end_date TEXT,
  creation TEXT,
  modified TEXT
);

CREATE INDEX IF NOT EXISTS idx_project_company ON project(company);
CREATE INDEX IF NOT EXISTS idx_project_status ON project(status);

CREATE TABLE IF NOT EXISTS task (
  name TEXT PRIMARY KEY,
  subject TEXT,
  project TEXT,
  status TEXT,
  priority TEXT,
  begin_date TEXT,
  end_date TEXT,
  expected_time REAL,
  actual_time REAL,
  completed_on TEXT,
  parent_task TEXT,
  is_milestone INTEGER,
  creation TEXT,
  modified TEXT
);

CREATE INDEX IF NOT EXISTS idx_task_project ON task(project);
CREATE INDEX IF NOT EXISTS idx_task_status ON task(status);

CREATE TABLE IF NOT EXISTS timesheet (
  name TEXT PRIMARY KEY,
  employee TEXT,
  employee_name TEXT,
  time_start TEXT,
  time_end TEXT,
  total_hours REAL,
  status TEXT,
  parent_project TEXT,
  creation TEXT,
  modified TEXT
);

CREATE INDEX IF NOT EXISTS idx_timesheet_employee ON timesheet(employee);
CREATE INDEX IF NOT EXISTS idx_timesheet_status ON timesheet(status);

CREATE TABLE IF NOT EXISTS timesheet_detail (
  parent TEXT,
  parenttype TEXT,
  activity_type TEXT,
  from_time TEXT,
  to_time TEXT,
  hours REAL,
  billing_amount REAL,
  costing_amount REAL,
  project TEXT,
  task TEXT,
  description TEXT,
  row_id TEXT,
  PRIMARY KEY (parent, row_id)
);

CREATE TABLE IF NOT EXISTS project_template (
  name TEXT PRIMARY KEY,
  template_name TEXT,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS project_template_task (
  parent TEXT,
  parenttype TEXT,
  subject TEXT,
  begin_on REAL,
  duration REAL,
  task_weight REAL,
  PRIMARY KEY (parent, subject)
);

CREATE TABLE IF NOT EXISTS activity_type (
  name TEXT PRIMARY KEY,
  activity_type TEXT,
  costing_rate REAL,
  billing_rate REAL,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS project_update (
  name TEXT PRIMARY KEY,
  project TEXT,
  update_date TEXT,
  progress REAL,
  description TEXT,
  creation TEXT
);

CREATE TABLE IF NOT EXISTS project_type (
  name TEXT PRIMARY KEY,
  project_type_name TEXT,
  creation TEXT,
  modified TEXT
);

-- ============================================================
-- QUALITY MANAGEMENT MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS quality_procedure (
  name TEXT PRIMARY KEY,
  procedure_name TEXT,
  parent_quality_procedure TEXT,
  company TEXT,
  process_owner TEXT,
  docstatus INTEGER,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS quality_procedure_task (
  parent TEXT,
  parenttype TEXT,
  task_name TEXT,
  task_owner TEXT,
  task_status TEXT,
  task_completion REAL,
  description TEXT,
  row_id TEXT,
  PRIMARY KEY (parent, row_id)
);

CREATE TABLE IF NOT EXISTS quality_goal (
  name TEXT PRIMARY KEY,
  goal_name TEXT,
  goal_owner TEXT,
  company TEXT,
  procedure TEXT,
  target_value REAL,
  measurement_unit TEXT,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS quality_review (
  name TEXT PRIMARY KEY,
  review_name TEXT,
  goal TEXT,
  review_date TEXT,
  status TEXT,
  target_value REAL,
  obtained_value REAL,
  deviation REAL,
  company TEXT,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS quality_review_objective (
  parent TEXT,
  parenttype TEXT,
  objective_name TEXT,
  target_value REAL,
  obtained_value REAL,
  row_id TEXT,
  PRIMARY KEY (parent, row_id)
);

CREATE TABLE IF NOT EXISTS quality_meeting (
  name TEXT PRIMARY KEY,
  meeting_name TEXT,
  meeting_date TEXT,
  meeting_owner TEXT,
  minutes TEXT,
  company TEXT,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS quality_meeting_participant (
  parent TEXT,
  parenttype TEXT,
  participant TEXT,
  status TEXT,
  row_id TEXT,
  PRIMARY KEY (parent, row_id)
);

CREATE TABLE IF NOT EXISTS quality_feedback (
  name TEXT PRIMARY KEY,
  template_name TEXT,
  review TEXT,
  quality_procedure TEXT,
  customer TEXT,
  is_customer_feedback INTEGER,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS quality_feedback_objective (
  parent TEXT,
  parenttype TEXT,
  objective TEXT,
  feedback TEXT,
  row_id TEXT,
  PRIMARY KEY (parent, row_id)
);

CREATE TABLE IF NOT EXISTS non_conformance (
  name TEXT PRIMARY KEY,
  source TEXT,
  doc_type TEXT,
  document_name TEXT,
  non_conformance_type TEXT,
  description TEXT,
  detected_on TEXT,
  immediate_action TEXT,
  responsible TEXT,
  company TEXT,
  status TEXT,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS quality_action (
  name TEXT PRIMARY KEY,
  action_type TEXT,
  non_conformance TEXT,
  description TEXT,
  date TEXT,
  responsible TEXT,
  status TEXT,
  company TEXT,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS quality_inspection (
  name TEXT PRIMARY KEY,
  inspection_type TEXT,
  reference_type TEXT,
  reference_name TEXT,
  quality_inspection_template TEXT,
  item_code TEXT,
  status TEXT,
  company TEXT,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS quality_inspection_template (
  name TEXT PRIMARY KEY,
  template_name TEXT,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS quality_inspection_reading (
  parent TEXT,
  parenttype TEXT,
  specification TEXT,
  value TEXT,
  status TEXT,
  row_id TEXT,
  PRIMARY KEY (parent, row_id)
);

CREATE TABLE IF NOT EXISTS quality_management_settings (
  name TEXT PRIMARY KEY,
  quality_inspection INTEGER
);

-- ============================================================
-- SUPPORT MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS issue (
  name TEXT PRIMARY KEY,
  subject TEXT,
  description TEXT,
  status TEXT,
  priority TEXT,
  issue_type TEXT,
  customer TEXT,
  company TEXT,
  raised_by TEXT,
  assigned_to TEXT,
  resolution_date TEXT,
  creation TEXT,
  modified TEXT
);

CREATE INDEX IF NOT EXISTS idx_issue_status ON issue(status);
CREATE INDEX IF NOT EXISTS idx_issue_priority ON issue(priority);
CREATE INDEX IF NOT EXISTS idx_issue_assigned_to ON issue(assigned_to);

CREATE TABLE IF NOT EXISTS issue_type (
  name TEXT PRIMARY KEY,
  issue_type_name TEXT,
  parent_issue_type TEXT,
  is_group INTEGER,
  lft INTEGER,
  rgt INTEGER
);

CREATE TABLE IF NOT EXISTS sla (
  name TEXT PRIMARY KEY,
  sla_name TEXT,
  enabled INTEGER,
  entity_type TEXT,
  document_type TEXT,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS sla_fulfilled (
  parent TEXT,
  parenttype TEXT,
  status TEXT,
  date TEXT,
  row_id TEXT,
  PRIMARY KEY (parent, row_id)
);

CREATE TABLE IF NOT EXISTS warranty_claim (
  name TEXT PRIMARY KEY,
  subject TEXT,
  customer TEXT,
  item_name TEXT,
  serial_no TEXT,
  description TEXT,
  status TEXT,
  company TEXT,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS service_level_agreement (
  name TEXT PRIMARY KEY,
  sla_name TEXT,
  enabled INTEGER,
  entity_type TEXT,
  document_type TEXT,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS service_level_agreement_fulfilled (
  parent TEXT,
  parenttype TEXT,
  status TEXT,
  date TEXT,
  row_id TEXT,
  PRIMARY KEY (parent, row_id)
);

CREATE TABLE IF NOT EXISTS service_level_agreement_failures (
  parent TEXT,
  parenttype TEXT,
  failure_date TEXT,
  row_id TEXT,
  PRIMARY KEY (parent, row_id)
);

-- ============================================================
-- MAINTENANCE MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS maintenance_schedule (
  name TEXT PRIMARY KEY,
  customer TEXT,
  company TEXT,
  transaction_date TEXT,
  status TEXT,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS maintenance_schedule_item (
  parent TEXT,
  parenttype TEXT,
  item_code TEXT,
  item_name TEXT,
  warehouse TEXT,
  frequency TEXT,
  start_date TEXT,
  end_date TEXT,
  row_id TEXT,
  PRIMARY KEY (parent, row_id)
);

CREATE TABLE IF NOT EXISTS maintenance_visit (
  name TEXT PRIMARY KEY,
  customer TEXT,
  company TEXT,
  maintenance_type TEXT,
  details TEXT,
  status TEXT,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS maintenance_visit_purpose (
  parent TEXT,
  parenttype TEXT,
  item_code TEXT,
  item_name TEXT,
  description TEXT,
  row_id TEXT,
  PRIMARY KEY (parent, row_id)
);

-- ============================================================
-- SUBCONTRACTING MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS subcontracting_order (
  name TEXT PRIMARY KEY,
  supplier TEXT,
  company TEXT,
  transaction_date TEXT,
  currency TEXT,
  total REAL,
  docstatus INTEGER,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS subcontracting_order_item (
  parent TEXT,
  parenttype TEXT,
  item_code TEXT,
  item_name TEXT,
  qty REAL,
  bom_no TEXT,
  warehouse TEXT,
  rate REAL,
  amount REAL,
  row_id TEXT,
  PRIMARY KEY (parent, row_id)
);

CREATE TABLE IF NOT EXISTS subcontracting_receipt (
  name TEXT PRIMARY KEY,
  supplier TEXT,
  company TEXT,
  posting_date TEXT,
  currency TEXT,
  total REAL,
  docstatus INTEGER,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS subcontracting_receipt_item (
  parent TEXT,
  parenttype TEXT,
  item_code TEXT,
  item_name TEXT,
  qty REAL,
  warehouse TEXT,
  batch_no TEXT,
  row_id TEXT,
  PRIMARY KEY (parent, row_id)
);

CREATE TABLE IF NOT EXISTS subcontracting_inward_order (
  name TEXT PRIMARY KEY,
  company TEXT,
  customer TEXT,
  transaction_date TEXT,
  docstatus INTEGER,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS subcontracting_bom (
  name TEXT PRIMARY KEY,
  main_item_code TEXT,
  subcontracted_item TEXT,
  quantity REAL,
  bom_no TEXT,
  docstatus INTEGER,
  creation TEXT,
  modified TEXT
);

CREATE TABLE IF NOT EXISTS subcontracting_bom_item (
  parent TEXT,
  parenttype TEXT,
  rm_item_code TEXT,
  reserve_subcontracted_warehouse TEXT,
  rm_warehouse TEXT,
  qty REAL,
  rate REAL,
  amount REAL,
  row_id TEXT,
  PRIMARY KEY (parent, row_id)
);

-- ============================================================
-- EDI MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS edi_code (
  name TEXT PRIMARY KEY,
  code_list TEXT,
  value TEXT,
  description TEXT,
  creation TEXT
);

CREATE TABLE IF NOT EXISTS edi_code_list (
  name TEXT PRIMARY KEY,
  code_list_name TEXT,
  creation TEXT
);

-- ============================================================
-- COMMUNICATION MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS communication (
  name TEXT PRIMARY KEY,
  communication_type TEXT,
  communication_medium TEXT,
  content TEXT,
  sender TEXT,
  recipients TEXT,
  subject TEXT,
  sent_or_received TEXT,
  read_by_recipient INTEGER,
  reference_doctype TEXT,
  reference_name TEXT,
  creation TEXT,
  modified TEXT
);

CREATE INDEX IF NOT EXISTS idx_communication_reference_doctype ON communication(reference_doctype);
CREATE INDEX IF NOT EXISTS idx_communication_reference_name ON communication(reference_name);

CREATE TABLE IF NOT EXISTS email (
  name TEXT PRIMARY KEY,
  communication TEXT,
  status TEXT,
  creation TEXT
);

-- ============================================================
-- TELEPHONY MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS call_log (
  name TEXT PRIMARY KEY,
  caller TEXT,
  type TEXT,
  duration REAL,
  time TEXT,
  medium TEXT,
  note TEXT,
  reference_doctype TEXT,
  reference_name TEXT,
  status TEXT,
  creation TEXT,
  modified TEXT
);

CREATE INDEX IF NOT EXISTS idx_call_log_reference_doctype ON call_log(reference_doctype);
CREATE INDEX IF NOT EXISTS idx_call_log_reference_name ON call_log(reference_name);

-- ============================================================
-- BULK TRANSACTION MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS bulk_transaction (
  name TEXT PRIMARY KEY,
  transaction_type TEXT,
  transaction_status TEXT,
  action TEXT,
  records TEXT,
  creation TEXT,
  modified TEXT
);
`;
}
