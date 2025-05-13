import { describe, it, expect } from 'vitest';
import { defineSchema } from './schema';
import { string, integer, bigint, timestamp } from './fields';

describe('Schema Definition', () => {
  it('creates a schema with field definitions', () => {
    const UserSchema = defineSchema({
      id: bigint().notNull().primary().unique().build(),
      firstName: string().notNull().column('first_name').build(),
      lastName: string().notNull().column('last_name').build(),
      email: string().notNull().unique().build(),
      age: integer().build(), // nullable by default
      createdAt: timestamp().notNull().column('created_at').build(),
      updatedAt: timestamp().notNull().column('updated_at').build(),
    });

    expect(UserSchema).toBeDefined();
    expect(UserSchema.id.type).toBe('bigint');
    expect(UserSchema.id.modifiers.has('primary')).toBe(true);
    expect(UserSchema.id.modifiers.has('unique')).toBe(true);
    expect(UserSchema.id.modifiers.has('nullable')).toBe(false);

    expect(UserSchema.firstName.type).toBe('string');
    expect(UserSchema.firstName.columnName).toBe('first_name');
    expect(UserSchema.firstName.modifiers.has('nullable')).toBe(false);

    expect(UserSchema.age.type).toBe('integer');
    expect(UserSchema.age.modifiers.has('nullable')).toBe(true);
  });

  it('preserves field order in schema definition', () => {
    const UserSchema = defineSchema({
      id: bigint().notNull().primary().build(),
      name: string().notNull().build(),
      email: string().notNull().unique().build(),
    });

    const fields = Object.keys(UserSchema);
    expect(fields).toEqual(['id', 'name', 'email']);
  });

  it('allows schema reuse', () => {
    const BaseSchema = defineSchema({
      id: bigint().notNull().primary().build(),
      createdAt: timestamp().notNull().column('created_at').build(),
      updatedAt: timestamp().notNull().column('updated_at').build(),
    });

    const UserSchema = defineSchema({
      ...BaseSchema,
      name: string().notNull().build(),
      email: string().notNull().unique().build(),
    });

    expect(UserSchema.id).toBeDefined();
    expect(UserSchema.createdAt).toBeDefined();
    expect(UserSchema.updatedAt).toBeDefined();
    expect(UserSchema.name).toBeDefined();
    expect(UserSchema.email).toBeDefined();
  });
});
