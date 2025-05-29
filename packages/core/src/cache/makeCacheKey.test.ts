import { describe, it, expect } from 'vitest';
import { makeCacheKey } from './makeCacheKey';

/**
 * Unit tests for makeCacheKey utility
 */
describe('makeCacheKey', () => {
  it('returns string for single primitive with type prefix', () => {
    expect(makeCacheKey('foo')).toBe('s:foo');
    expect(makeCacheKey(42)).toBe('n:42');
    expect(makeCacheKey(true)).toBe('b:true');
  });

  it('handles null and undefined', () => {
    expect(makeCacheKey(null)).toBe('null');
    expect(makeCacheKey(undefined)).toBe('undefined');
    expect(makeCacheKey('a', null, undefined)).toBe('s:a:null:undefined');
  });

  it('serializes objects with sorted keys and type prefix', () => {
    const a = { x: 1, y: 2 };
    const b = { y: 2, x: 1 };
    expect(makeCacheKey(a)).toBe(makeCacheKey(b));
    expect(makeCacheKey(a)).toBe('o:{"x":1,"y":2}');
  });

  it('serializes arrays with type prefix', () => {
    expect(makeCacheKey([1, 2, 3])).toBe('a:[1,2,3]');
    expect(makeCacheKey([3, 2, 1])).toBe('a:[3,2,1]');
  });

  it('composes multiple parts with type prefixes', () => {
    expect(makeCacheKey('User', 'findById', { id: 1 })).toBe('s:User:s:findById:o:{"id":1}');
    expect(makeCacheKey('User', { id: 1, name: 'A' })).toBe('s:User:o:{"id":1,"name":"A"}');
  });

  it('distinguishes different types and values', () => {
    expect(makeCacheKey('1')).not.toBe(makeCacheKey(1));
    expect(makeCacheKey({ a: 1 })).not.toBe(makeCacheKey({ a: 2 }));
    expect(makeCacheKey([1, 2])).not.toBe(makeCacheKey([2, 1]));
  });

  it('handles deeply nested objects', () => {
    const obj1 = { a: { b: { c: 1 } } };
    const obj2 = { a: { b: { c: 1 } } };
    expect(makeCacheKey(obj1)).toBe(makeCacheKey(obj2));
  });
});
