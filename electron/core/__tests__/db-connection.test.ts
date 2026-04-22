// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createConnection, normalizeParams } from '../db/connection.js';

describe('db/connection', () => {
  describe('createConnection', () => {
    it('creates an in-memory database and can close it', () => {
      const conn = createConnection('/tmp', true);
      expect(conn).toBeDefined();
      conn.close();
    });

    it('creates a file-based database and closes it', () => {
      const conn = createConnection('/tmp/myloggy-test', false);
      expect(conn).toBeDefined();
      conn.close();
    });
  });

  describe('normalizeParams', () => {
    it('converts boolean true to 1', () => {
      expect(normalizeParams(true)).toEqual([1]);
    });

    it('converts boolean false to 0', () => {
      expect(normalizeParams(false)).toEqual([0]);
    });

    it('converts undefined to null', () => {
      expect(normalizeParams(undefined)).toEqual([null]);
    });

    it('preserves null, string, and number', () => {
      expect(normalizeParams(null, 'hello', 42)).toEqual([null, 'hello', 42]);
    });
  });
});
