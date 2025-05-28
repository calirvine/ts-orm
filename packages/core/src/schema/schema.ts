import { SchemaDefinition } from './types';

/**
 * Creates a new schema definition
 *
 * @example
 * ```typescript
 * const UserSchema = defineSchema({
 *   id: bigint().notNull().primary().unique(),
 *   firstName: string().notNull().column('first_name'),
 *   lastName: string().notNull().column('last_name'),
 *   email: string().notNull().unique(),
 *   age: integer(), // nullable by default
 *   createdAt: timestamp().notNull().column('created_at'),
 *   updatedAt: timestamp().notNull().column('updated_at'),
 * });
 * ```
 */
export function defineSchema<T extends SchemaDefinition>(schema: T): T {
  return schema;
}

// Map field type strings to TypeScript types
export type FieldTypeMap = {
  string: string;
  integer: number;
  bigint: number | bigint;
  float: number;
  decimal: number;
  boolean: boolean;
  timestamp: Date | string;
  date: Date | string;
  time: string;
  json: unknown;
};

// Infer attribute types from a schema definition
export type InferAttrsFromSchema<S extends Record<string, { type: string }>> = {
  [K in keyof S]: S[K]['type'] extends keyof FieldTypeMap ? FieldTypeMap[S[K]['type']] : unknown;
};
