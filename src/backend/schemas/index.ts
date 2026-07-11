import { createCoreSchemas } from './core-schemas'
import { createExtendedSchemas } from './extended-schemas'

export const SCHEMA_VERSION = 4

export function createAllSchemas(): string {
  const core = createCoreSchemas()
  const extended = createExtendedSchemas()

  return `
-- ============================================================
-- Schema Version Tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS _schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT
);

INSERT OR REPLACE INTO _schema_meta (key, value) VALUES ('version', '${SCHEMA_VERSION}');
INSERT OR REPLACE INTO _schema_meta (key, value) VALUES ('created_at', '${new Date().toISOString()}');

-- ============================================================
-- Core Schemas
-- ============================================================
${core}

-- ============================================================
-- Extended Schemas
-- ============================================================
${extended}
`
}

export function getSchemaVersion(): number {
  return SCHEMA_VERSION
}

export { createCoreSchemas } from './core-schemas'
export { createExtendedSchemas } from './extended-schemas'
