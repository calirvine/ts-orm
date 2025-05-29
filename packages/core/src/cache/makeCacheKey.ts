/**
 * Creates a stable, unique cache key from any number of arguments.
 * Encodes type information for each part to avoid collisions.
 * Objects are serialized with sorted keys for stability.
 * @internal
 */
function stableStringifyWithBigInt(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'bigint') return `bigint:${value.toString()}`;
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringifyWithBigInt).join(',') + ']';
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value as object).sort();
    return (
      '{' +
      keys
        .map((k) => JSON.stringify(k) + ':' + stableStringifyWithBigInt((value as any)[k]))
        .join(',') +
      '}'
    );
  }
  return JSON.stringify(value);
}

export function makeCacheKey(...parts: unknown[]): string {
  return parts
    .map((part) => {
      if (part === null) return 'null';
      if (part === undefined) return 'undefined';
      if (typeof part === 'bigint') return 'bigint:' + part.toString();
      if (Array.isArray(part)) {
        return 'a:' + stableStringifyWithBigInt(part);
      }
      const type = typeof part;
      switch (type) {
        case 'string':
          return 's:' + part;
        case 'number':
          return 'n:' + part;
        case 'boolean':
          return 'b:' + part;
        case 'object':
          // Stable stringify: sort keys, handle bigints
          return 'o:' + stableStringifyWithBigInt(part);
        default:
          return type + ':' + String(part);
      }
    })
    .join(':');
}
