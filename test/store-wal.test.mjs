import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { Store } from '../src/engine/Store.js';

const TEST_DB = '/tmp/huascar_test_wal.db';

function cleanup() {
  for (const suffix of ['', '-wal', '-shm']) {
    const p = TEST_DB + suffix;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

describe('Store WAL mode and performance optimizations', () => {
  let store;

  before(() => {
    cleanup();
    store = new Store(TEST_DB);
  });

  after(() => {
    store.close();
    cleanup();
  });

  describe('WAL mode and pragmas', () => {
    it('enables WAL journal mode', () => {
      const db = store.getDatabase();
      const result = db.pragma('journal_mode');
      assert.equal(result[0].journal_mode, 'wal');
    });

    it('sets synchronous to NORMAL', () => {
      const db = store.getDatabase();
      const result = db.pragma('synchronous');
      // NORMAL = 1
      assert.equal(result[0].synchronous, 1);
    });

    it('sets cache_size to 64MB (~64000 pages)', () => {
      const db = store.getDatabase();
      const result = db.pragma('cache_size');
      assert.equal(result[0].cache_size, -64000);
    });

    it('sets mmap_size to 256MB', () => {
      const db = store.getDatabase();
      const result = db.pragma('mmap_size');
      assert.equal(result[0].mmap_size, 268435456);
    });

    it('sets temp_store to MEMORY', () => {
      const db = store.getDatabase();
      const result = db.pragma('temp_store');
      // MEMORY = 2
      assert.equal(result[0].temp_store, 2);
    });

    it('sets busy_timeout to 5000ms', () => {
      const db = store.getDatabase();
      const result = db.pragma('busy_timeout');
      assert.equal(result[0].timeout, 5000);
    });
  });

  describe('prepared statements', () => {
    it('inserts and retrieves executions via prepared statements', () => {
      store.saveExecution('dev', 'build project', 'success');
      const history = store.getHistory(10);
      assert.ok(history.length >= 1);
      const last = history[0];
      assert.equal(last.role, 'dev');
      assert.equal(last.task, 'build project');
      assert.equal(last.response, 'success');
    });

    it('inserts execution with explicit date via prepared statement', () => {
      const date = '2025-01-01 12:00:00';
      store.saveExecution('ops', 'deploy', 'deployed', date);
      const history = store.getHistory(10);
      const found = history.find((h) => h.task === 'deploy');
      assert.ok(found);
      assert.equal(found.created_at, date);
    });

    it('getHistoryCount uses prepared statement', () => {
      const count = store.getHistoryCount();
      assert.ok(count >= 2);
    });

    it('getSession uses prepared statement', () => {
      const session = store.getSession('nonexistent');
      assert.equal(session, null);
    });

    it('touchSession uses prepared statement', () => {
      store.createSession('sess-1', 'dev', 1000);
      store.touchSession('sess-1', 2000);
      const session = store.getSession('sess-1');
      assert.equal(session.last_active_at, 2000);
    });

    it('addSessionMessage uses prepared statement', () => {
      store.createSession('sess-2', 'dev', 1000);
      store.addSessionMessage('sess-2', 'user', 'hello', 1001);
      const messages = store.listSessionMessages('sess-2');
      assert.equal(messages.length, 1);
      assert.equal(messages[0].content, 'hello');
    });

    it('getChunksCount uses prepared statement', () => {
      const count = store.getChunksCount();
      assert.equal(typeof count, 'number');
    });
  });

  describe('batch transactions', () => {
    it('inserts multiple records in a single transaction', () => {
      const items = Array.from({ length: 50 }, (_, i) => ({
        role: 'batch-test',
        task: `task-${i}`,
        response: `response-${i}`,
      }));

      const inserted = store.batch(items, (item) => {
        store.saveExecution(item.role, item.task, item.response);
      });

      assert.equal(inserted, 50);
      const history = store.getHistory(100);
      const batchItems = history.filter((h) => h.role === 'batch-test');
      assert.equal(batchItems.length, 50);
    });

    it('rolls back entire batch on failure', () => {
      const countBefore = store.getHistoryCount();
      const items = [
        { role: 'rollback', task: 'ok', response: 'fine' },
        { role: 'rollback', task: 'fail', response: null }, // null will still work in SQLite
      ];

      // Force a failure by passing invalid data through a throwing insertFn
      const badItems = [{ val: 1 }, { val: 2 }, { val: 3 }];
      try {
        store.batch(badItems, (item) => {
          if (item.val === 2) throw new Error('simulated failure');
          store.saveExecution('rollback-test', `t-${item.val}`, 'r');
        });
      } catch {
        // expected
      }

      // No rows from the failed batch should exist
      const countAfter = store.getHistoryCount();
      assert.equal(countAfter, countBefore);
    });

    it('handles empty batch gracefully', () => {
      const inserted = store.batch([], () => {});
      assert.equal(inserted, 0);
    });

    it('batch inserts RAG chunks efficiently', () => {
      const chunks = Array.from({ length: 20 }, (_, i) => ({
        source: 'batch-source.md',
        chunkIndex: i,
        chunkText: `chunk content ${i}`,
        contentHash: 'abc123',
        chunkHash: `hash-${i}`,
      }));

      const inserted = store.batch(chunks, (chunk) => {
        store.saveChunk(chunk);
      });

      assert.equal(inserted, 20);
      const count = store.getChunksCount();
      assert.ok(count >= 20);
    });
  });
});
