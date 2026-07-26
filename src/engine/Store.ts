import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { config } from '../config.js';
import { ErrorCodes, StoreError } from '../errors.js';
import { MigrationRunner } from './Migrations.js';
import { initialMigrations } from './migrations/index.js';
import { logger } from '../logger.js';

/** Maximum size for session message content (100KB) */
const MAX_MESSAGE_SIZE = 102_400;

export interface ExecutionRecord {
  id: number;
  role: string;
  task: string;
  response: string;
  created_at: string;
}

export interface DocumentChunk {
  id: number;
  source: string;
  chunk_index: number;
  chunk_text: string;
  embedding: number[] | null;
  content_hash: string | null;
  chunk_hash: string | null;
  created_at: string;
}

export interface RagSourceSummary {
  source: string;
  chunk_count: number;
  content_hash: string | null;
  chunk_hashes: string[];
}

export interface RetentionCleanupReport {
  executionsDeleted: number;
  chunksDeleted: number;
}

export interface SessionRecord {
  id: string;
  role: string;
  created_at: number;
  last_active_at: number;
  metadata: string | null;
}

export interface SessionMessageRecord {
  id: number;
  session_id: string;
  role: string;
  content: string;
  created_at: number;
}

export interface AgentRecord {
  id: string;
  name: string;
  config: string;
  created_at: number;
  updated_at: number;
  last_executed_at: number | null;
  execution_count: number;
  /** Caller IP used for per-IP rate limiting / cooldown (#492). */
  ip: string | null;
  /** Wall-clock ms when this agent expires; null only for pre-#492 rows. */
  expires_at: number | null;
}

/**
 * Factory function for creating Store instances.
 * Supports dependency injection and testing.
 */
export function createStore(dbPath?: string): Store {
  return new Store(dbPath);
}

export class Store {
  private db: Database.Database;
  private dbPath: string;
  private closed = false;

  // Pre-prepared statements for frequent queries
  private stmtInsertExecution!: Database.Statement;
  private stmtInsertExecutionWithDate!: Database.Statement;
  private stmtGetHistory!: Database.Statement;
  private stmtGetHistoryCount!: Database.Statement;
  private stmtGetSession!: Database.Statement;
  private stmtTouchSession!: Database.Statement;
  private stmtInsertSessionMessage!: Database.Statement;
  private stmtGetChunksCount!: Database.Statement;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || config.paths.db;
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    try {
      this.db = new Database(this.dbPath);
      this.configurePragmas();
      new MigrationRunner(this.db, initialMigrations).run();
      this.prepareStatements();
    } catch (err) {
      throw new StoreError(ErrorCodes.STORE_QUERY_FAILED, 'Failed to initialize SQLite store', 500, { cause: err });
    }
  }

  /**
   * Configure WAL mode and performance pragmas for optimal throughput.
   */
  private configurePragmas(): void {
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = -64000');
    this.db.pragma('mmap_size = 268435456');
    this.db.pragma('temp_store = MEMORY');
    this.db.pragma('busy_timeout = 5000');
    logger.debug('SQLite pragmas configured: WAL, synchronous=NORMAL, cache=64MB, mmap=256MB');
  }

  /**
   * Pre-prepare frequently used statements to avoid repeated parsing.
   */
  private prepareStatements(): void {
    this.stmtInsertExecution = this.db.prepare('INSERT INTO executions (role, task, response) VALUES (?, ?, ?)');
    this.stmtInsertExecutionWithDate = this.db.prepare(
      'INSERT INTO executions (role, task, response, created_at) VALUES (?, ?, ?, ?)',
    );
    this.stmtGetHistory = this.db.prepare('SELECT * FROM executions ORDER BY created_at DESC LIMIT ? OFFSET ?');
    this.stmtGetHistoryCount = this.db.prepare('SELECT COUNT(*) as count FROM executions');
    this.stmtGetSession = this.db.prepare('SELECT * FROM sessions WHERE id = ?');
    this.stmtTouchSession = this.db.prepare('UPDATE sessions SET last_active_at = ? WHERE id = ?');
    this.stmtInsertSessionMessage = this.db.prepare(
      'INSERT INTO session_messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)',
    );
    this.stmtGetChunksCount = this.db.prepare('SELECT COUNT(*) as count FROM rag_documents WHERE deleted_at IS NULL');
  }

  /**
   * Execute multiple insert operations within a single transaction.
   * Returns the number of rows inserted. Useful for bulk RAG chunk ingestion.
   */
  batch<T>(items: T[], insertFn: (item: T) => void): number {
    this.assertOpen();
    const transaction = this.db.transaction((rows: T[]) => {
      for (const row of rows) {
        insertFn(row);
      }
      return rows.length;
    });
    return transaction(items);
  }

  get isClosed(): boolean {
    return this.closed;
  }

  /** Expose the raw database instance for subsystems (ConfigStore, etc.) */
  getDatabase(): Database.Database {
    this.assertOpen();
    return this.db;
  }

  private assertOpen(): void {
    if (this.closed) throw new Error('Store is closed');
  }

  // --- Execution history ---

  saveExecution(role: string, task: string, response: string, createdAt?: string): void {
    this.assertOpen();
    if (createdAt) {
      this.stmtInsertExecutionWithDate.run(role, task, response, createdAt);
    } else {
      this.stmtInsertExecution.run(role, task, response);
    }
  }

  getHistory(limit: number = config.store.historyLimit, offset: number = 0): ExecutionRecord[] {
    this.assertOpen();
    const boundedLimit = Math.min(Math.max(0, limit), 100); // Cap at 100, allow 0 for "no results"
    const boundedOffset = Math.max(0, offset);
    return this.stmtGetHistory.all(boundedLimit, boundedOffset) as ExecutionRecord[];
  }

  getHistoryCount(): number {
    this.assertOpen();
    return (this.stmtGetHistoryCount.get() as { count: number }).count;
  }

  // --- Registered agents ---

  createAgent(name: string, agentConfig: unknown, ip: string, ttlMs: number, now = Date.now()): AgentRecord {
    this.assertOpen();
    const agent = {
      id: randomUUID(),
      name,
      config: JSON.stringify(agentConfig),
      created_at: now,
      updated_at: now,
      last_executed_at: null,
      execution_count: 0,
      ip,
      expires_at: now + ttlMs,
    };
    this.db
      .prepare(
        `
      INSERT INTO agents (id, name, config, created_at, updated_at, last_executed_at, execution_count, ip, expires_at)
      VALUES (@id, @name, @config, @created_at, @updated_at, @last_executed_at, @execution_count, @ip, @expires_at)
    `,
      )
      .run(agent);
    return agent;
  }

  listAgents(): AgentRecord[] {
    this.assertOpen();
    return this.db.prepare('SELECT * FROM agents ORDER BY updated_at DESC, name ASC').all() as AgentRecord[];
  }

  getAgent(id: string): AgentRecord | null {
    this.assertOpen();
    return (this.db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as AgentRecord | undefined) ?? null;
  }

  /**
   * Count agents created by `ip` since `since` (wall-clock ms). Used by the
   * cooldown gate in POST /api/agents: once an IP registered `maxPerIp`
   * agents inside the cooldown window, further registrations are rejected
   * with 429 even if the previous ones already expired by TTL (#492).
   */
  countAgentsByIp(ip: string, since: number): number {
    this.assertOpen();
    const row = this.db
      .prepare('SELECT COUNT(*) AS count FROM agents WHERE ip = ? AND created_at >= ?')
      .get(ip, since) as { count: number };
    return row.count;
  }

  /**
   * Delete agents whose TTL has elapsed. Pre-#492 rows were backfilled with
   * `expires_at = 0` by migration 009, so they are reclaimed on the first
   * sweep. Returns the number of rows removed.
   */
  cleanupExpiredAgents(now = Date.now()): number {
    this.assertOpen();
    return this.db.prepare('DELETE FROM agents WHERE expires_at IS NOT NULL AND expires_at < ?').run(now).changes;
  }

  updateAgent(id: string, name: string, agentConfig: unknown, now = Date.now()): AgentRecord | null {
    this.assertOpen();
    this.db
      .prepare('UPDATE agents SET name = ?, config = ?, updated_at = ? WHERE id = ?')
      .run(name, JSON.stringify(agentConfig), now, id);
    return this.getAgent(id);
  }

  deleteAgent(id: string): boolean {
    this.assertOpen();
    return this.db.prepare('DELETE FROM agents WHERE id = ?').run(id).changes > 0;
  }

  recordAgentExecution(id: string, now = Date.now()): AgentRecord | null {
    this.assertOpen();
    this.db
      .prepare('UPDATE agents SET last_executed_at = ?, execution_count = execution_count + 1 WHERE id = ?')
      .run(now, id);
    return this.getAgent(id);
  }

  // --- Agent sessions ---

  /**
   * Create a session, using INSERT OR IGNORE to prevent race-condition duplicates (#271).
   */
  createSession(id: string, role: string, now = Date.now(), metadata?: string | null): SessionRecord {
    this.assertOpen();
    this.db
      .prepare('INSERT OR IGNORE INTO sessions (id, role, created_at, last_active_at, metadata) VALUES (?, ?, ?, ?, ?)')
      .run(id, role, now, now, metadata ?? null);
    // Return the session (could be existing if INSERT OR IGNORE hit a duplicate)
    return this.getSession(id)!;
  }

  getSession(id: string): SessionRecord | null {
    this.assertOpen();
    return (this.stmtGetSession.get(id) as SessionRecord | undefined) ?? null;
  }

  touchSession(id: string, now = Date.now()): void {
    this.assertOpen();
    this.stmtTouchSession.run(now, id);
  }

  /**
   * Add a message to a session. Truncates content to MAX_MESSAGE_SIZE (#282).
   */
  addSessionMessage(sessionId: string, role: string, content: string, now = Date.now()): void {
    this.assertOpen();
    const truncated =
      content.length > MAX_MESSAGE_SIZE ? content.slice(0, MAX_MESSAGE_SIZE) + '\n... [truncated]' : content;
    this.stmtInsertSessionMessage.run(sessionId, role, truncated, now);
  }

  listSessionMessages(sessionId: string, limit = config.sessions.maxMessages): SessionMessageRecord[] {
    this.assertOpen();
    const rows = this.db
      .prepare(
        `
      SELECT * FROM session_messages
      WHERE session_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
      )
      .all(sessionId, limit) as SessionMessageRecord[];
    return rows.reverse();
  }

  deleteExpiredSessions(ttlMs = config.sessions.ttlMs, now = Date.now()): number {
    this.assertOpen();
    return this.db.transaction((expiresBefore: number) => {
      this.db
        .prepare('DELETE FROM session_messages WHERE session_id IN (SELECT id FROM sessions WHERE last_active_at < ?)')
        .run(expiresBefore);
      return this.db.prepare('DELETE FROM sessions WHERE last_active_at < ?').run(expiresBefore).changes;
    })(now - ttlMs) as number;
  }

  cleanupRetention(options = config.retention, now = Date.now()): RetentionCleanupReport {
    this.assertOpen();
    const cutoff = new Date(now - options.executionMaxAgeDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .slice(0, 19);

    return this.db.transaction(() => {
      const executionsDeletedByAge = this.db.prepare('DELETE FROM executions WHERE created_at < ?').run(cutoff).changes;
      const executionsDeletedByCount = this.db
        .prepare(
          `
        DELETE FROM executions
        WHERE id NOT IN (
          SELECT id FROM executions ORDER BY created_at DESC, id DESC LIMIT ?
        )
      `,
        )
        .run(options.executionMaxCount).changes;
      const chunksDeleted = this.db
        .prepare(
          `
        DELETE FROM rag_documents
        WHERE id IN (
          SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY source ORDER BY created_at DESC, id DESC) as row_num
            FROM rag_documents
          )
          WHERE row_num > ?
        )
      `,
        )
        .run(options.ragChunksMaxPerSource).changes;

      return { executionsDeleted: executionsDeletedByAge + executionsDeletedByCount, chunksDeleted };
    })() as RetentionCleanupReport;
  }

  // --- Vector RAG ---

  saveChunk(chunk: {
    source: string;
    chunkIndex: number;
    chunkText: string;
    embedding?: number[];
    contentHash?: string;
    chunkHash?: string;
    createdAt?: string;
  }): void {
    this.assertOpen();
    const embeddingJson = chunk.embedding ? JSON.stringify(chunk.embedding) : null;
    const stmt = chunk.createdAt
      ? this.db.prepare(
          'INSERT INTO rag_documents (source, chunk_index, chunk_text, embedding, content_hash, chunk_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        )
      : this.db.prepare(
          'INSERT INTO rag_documents (source, chunk_index, chunk_text, embedding, content_hash, chunk_hash) VALUES (?, ?, ?, ?, ?, ?)',
        );
    const params = [
      chunk.source,
      chunk.chunkIndex,
      chunk.chunkText,
      embeddingJson,
      chunk.contentHash ?? null,
      chunk.chunkHash ?? null,
    ];
    chunk.createdAt ? stmt.run(...params, chunk.createdAt) : stmt.run(...params);
  }

  getContentHashBySource(source: string): string | null {
    this.assertOpen();
    const row = this.db
      .prepare(
        `
      SELECT content_hash, SUM(CASE WHEN embedding IS NULL THEN 1 ELSE 0 END) as missing_embeddings
      FROM rag_documents
      WHERE source = ? AND content_hash IS NOT NULL AND deleted_at IS NULL
      GROUP BY content_hash
      LIMIT 1
    `,
      )
      .get(source) as { content_hash: string; missing_embeddings: number } | undefined;
    if (!row || row.missing_embeddings > 0) return null;
    return row.content_hash;
  }

  /**
   * Soft-delete RAG source chunks (#258). Marks as deleted instead of removing.
   */
  softDeleteChunksBySource(source: string): number {
    this.assertOpen();
    const now = new Date().toISOString();
    return this.db
      .prepare('UPDATE rag_documents SET deleted_at = ? WHERE source = ? AND deleted_at IS NULL')
      .run(now, source).changes;
  }

  /**
   * Restore soft-deleted RAG source (#258).
   */
  restoreChunksBySource(source: string): number {
    this.assertOpen();
    return this.db
      .prepare('UPDATE rag_documents SET deleted_at = NULL WHERE source = ? AND deleted_at IS NOT NULL')
      .run(source).changes;
  }

  /**
   * Hard-delete: permanently removes chunks (used for old data or after retention).
   */
  deleteChunksBySource(source: string): void {
    this.assertOpen();
    const stmt = this.db.prepare('DELETE FROM rag_documents WHERE source = ?');
    stmt.run(source);
  }

  /**
   * Purge soft-deleted chunks older than retentionDays.
   */
  purgeSoftDeletedChunks(retentionDays = 30): number {
    this.assertOpen();
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
    return this.db.prepare('DELETE FROM rag_documents WHERE deleted_at IS NOT NULL AND deleted_at < ?').run(cutoff)
      .changes;
  }

  getRagSources(): RagSourceSummary[] {
    this.assertOpen();
    const rows = this.db
      .prepare(
        `
      SELECT source, COUNT(*) as chunk_count, MAX(content_hash) as content_hash, GROUP_CONCAT(chunk_hash) as chunk_hashes
      FROM rag_documents
      WHERE deleted_at IS NULL
      GROUP BY source
      ORDER BY source
    `,
      )
      .all() as { source: string; chunk_count: number; content_hash: string | null; chunk_hashes: string | null }[];
    return rows.map((r) => ({
      ...r,
      chunk_hashes: r.chunk_hashes ? r.chunk_hashes.split(',').filter(Boolean) : [],
    }));
  }

  getAllChunks(): DocumentChunk[] {
    this.assertOpen();
    const rows = this.db
      .prepare('SELECT * FROM rag_documents WHERE deleted_at IS NULL ORDER BY source, chunk_index')
      .all() as any[];
    return rows.map((r) => ({
      ...r,
      embedding: r.embedding ? (JSON.parse(r.embedding) as number[]) : null,
    }));
  }

  /** Get chunks with embeddings only (for vector index building). */
  getChunksWithEmbeddings(): { chunk_text: string; embedding: number[] }[] {
    this.assertOpen();
    const rows = this.db
      .prepare(
        'SELECT chunk_text, embedding FROM rag_documents WHERE embedding IS NOT NULL AND deleted_at IS NULL ORDER BY source, chunk_index',
      )
      .all() as any[];
    return rows.map((r) => ({
      chunk_text: r.chunk_text,
      embedding: JSON.parse(r.embedding) as number[],
    }));
  }

  getChunksCount(): number {
    this.assertOpen();
    return (this.stmtGetChunksCount.get() as { count: number }).count;
  }

  // --- ExecutionContext persistence (#245) ---

  saveFailure(role: string, tool: string, args: string, errorType: string, timestamp: number): void {
    this.assertOpen();
    this.db
      .prepare('INSERT INTO execution_failures (role, tool, args, error_type, timestamp) VALUES (?, ?, ?, ?, ?)')
      .run(role, tool, args, errorType, timestamp);
  }

  getFailures(role: string, limit = 20): { tool: string; args: string; error_type: string; timestamp: number }[] {
    this.assertOpen();
    return this.db
      .prepare(
        'SELECT tool, args, error_type, timestamp FROM execution_failures WHERE role = ? ORDER BY timestamp DESC LIMIT ?',
      )
      .all(role, limit) as any[];
  }

  saveCommitApproval(id: string, status: string, diffContext: string, createdAt: string): void {
    this.assertOpen();
    this.db
      .prepare('INSERT OR REPLACE INTO commit_approvals (id, status, diff_context, created_at) VALUES (?, ?, ?, ?)')
      .run(id, status, diffContext, createdAt);
  }

  updateCommitApprovalStatus(id: string, status: string): boolean {
    this.assertOpen();
    return (
      this.db
        .prepare("UPDATE commit_approvals SET status = ?, resolved_at = datetime('now') WHERE id = ?")
        .run(status, id).changes > 0
    );
  }

  getCommitApproval(id: string): { id: string; status: string; diff_context: string; created_at: string } | null {
    this.assertOpen();
    return (this.db.prepare('SELECT * FROM commit_approvals WHERE id = ?').get(id) as any) ?? null;
  }

  getPendingCommitApprovals(): { id: string; status: string; diff_context: string; created_at: string }[] {
    this.assertOpen();
    return this.db.prepare("SELECT * FROM commit_approvals WHERE status = 'pending'").all() as any[];
  }

  isOpen(): boolean {
    return !this.closed;
  }

  close(): void {
    if (this.closed) return;
    this.db.pragma('wal_checkpoint(TRUNCATE)');
    this.db.close();
    this.closed = true;
  }
}
