import { describe, it, expect } from 'vitest';
import {
  string,
  integer,
  bigint,
  float,
  decimal,
  boolean,
  timestamp,
  date,
  time,
  json,
} from './fields';

describe('Field Factories', () => {
  describe('Basic Field Types', () => {
    it('creates string fields', () => {
      const field = string().build();
      expect(field.type).toBe('string');
      expect(field.modifiers.has('nullable')).toBe(true);
    });

    it('creates integer fields', () => {
      const field = integer().build();
      expect(field.type).toBe('integer');
      expect(field.modifiers.has('nullable')).toBe(true);
    });

    it('creates bigint fields', () => {
      const field = bigint().build();
      expect(field.type).toBe('bigint');
      expect(field.modifiers.has('nullable')).toBe(true);
    });

    it('creates float fields', () => {
      const field = float().build();
      expect(field.type).toBe('float');
      expect(field.modifiers.has('nullable')).toBe(true);
    });

    it('creates decimal fields with precision and scale', () => {
      const field = decimal(10, 2).build();
      expect(field.type).toBe('decimal');
      expect(field.columnOptions).toEqual({ precision: 10, scale: 2 });
      expect(field.modifiers.has('nullable')).toBe(true);
    });

    it('creates boolean fields', () => {
      const field = boolean().build();
      expect(field.type).toBe('boolean');
      expect(field.modifiers.has('nullable')).toBe(true);
    });

    it('creates timestamp fields', () => {
      const field = timestamp().build();
      expect(field.type).toBe('timestamp');
      expect(field.modifiers.has('nullable')).toBe(true);
    });

    it('creates date fields', () => {
      const field = date().build();
      expect(field.type).toBe('date');
      expect(field.modifiers.has('nullable')).toBe(true);
    });

    it('creates time fields', () => {
      const field = time().build();
      expect(field.type).toBe('time');
      expect(field.modifiers.has('nullable')).toBe(true);
    });

    it('creates json fields', () => {
      const field = json().build();
      expect(field.type).toBe('json');
      expect(field.modifiers.has('nullable')).toBe(true);
    });
  });

  describe('Field Modifiers', () => {
    it('makes fields not null', () => {
      const field = string().notNull().build();
      expect(field.modifiers.has('nullable')).toBe(false);
    });

    it('makes fields unique', () => {
      const field = string().notNull().unique().build();
      expect(field.modifiers.has('unique')).toBe(true);
    });

    it('makes fields primary', () => {
      const field = string().notNull().primary().build();
      expect(field.modifiers.has('primary')).toBe(true);
    });

    it('makes fields indexed', () => {
      const field = string().index().build();
      expect(field.modifiers.has('index')).toBe(true);
    });

    it('sets column names', () => {
      const field = string().column('user_name').build();
      expect(field.columnName).toBe('user_name');
    });

    it('sets default values', () => {
      const field = string().default('John').build();
      expect(field.defaultValue).toBe('John');
    });
  });

  describe('Validation Rules', () => {
    it('requires notNull before primary', () => {
      expect(() => string().primary()).toThrow('Primary key must be not null');
    });

    it('requires notNull before unique', () => {
      expect(() => string().unique()).toThrow('Unique fields must be not null');
    });

    it('allows chaining modifiers in correct order', () => {
      const field = string()
        .notNull()
        .primary()
        .unique()
        .index()
        .column('id')
        .default('123')
        .build();

      expect(field.modifiers.has('nullable')).toBe(false);
      expect(field.modifiers.has('primary')).toBe(true);
      expect(field.modifiers.has('unique')).toBe(true);
      expect(field.modifiers.has('index')).toBe(true);
      expect(field.columnName).toBe('id');
      expect(field.defaultValue).toBe('123');
    });
  });
});
