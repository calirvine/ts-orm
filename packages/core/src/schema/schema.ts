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
