import type { Migration } from '../Migrations.js';

/**
 * Agents are ephemeral by design (#492): Huascar is a generator, not a host.
 * This migration adds `ip` (for per-IP rate limiting / cooldown) and
 * `expires_at` (TTL) to the agents table. Existing rows are backfilled with
 * `expires_at = 0` so the first cleanup sweep removes them; NULL is never
 * written going forward.
 */
export const addAgentEphemeralFields: Migration = {
  id: '009_add_agent_ephemeral_fields',
  description: 'Add ip and expires_at to agents for ephemeral registration',
  up(db) {
    const cols = db.pragma('table_info(agents)') as { name: string }[];
    if (!cols.some((c) => c.name === 'ip')) {
      db.exec(`ALTER TABLE agents ADD COLUMN ip TEXT`);
    }
    if (!cols.some((c) => c.name === 'expires_at')) {
      db.exec(`ALTER TABLE agents ADD COLUMN expires_at INTEGER`);
    }
    // Legacy permanent rows become immediately expired so cleanup reclaims them.
    db.exec(`UPDATE agents SET expires_at = 0 WHERE expires_at IS NULL`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_agents_ip_created ON agents(ip, created_at)`);
  },
  down(db) {
    // SQLite cannot DROP COLUMN portably; leave the columns in place.
    db.exec(`DROP INDEX IF EXISTS idx_agents_ip_created`);
  },
};
