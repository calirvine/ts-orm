import { describe, it, expect, expectTypeOf } from 'vitest';
import { createModel } from './factory';
import { string, bigint, integer } from '../schema/fields';
import { defineSchema } from '../schema/schema';
import {
  relations,
  ResolvedType,
  RelationDefinition,
  ModelReference,
  ModelClass,
  InferRelations,
} from '../schema/relations';
import { createORMContext } from '../context';

const UserSchema = defineSchema({
  id: bigint().notNull().primary().build(),
  name: string().notNull().build(),
  email: string().notNull().build(),
  age: integer().build(),
});

const ProfileSchema = defineSchema({
  id: bigint().notNull().primary().build(),
  userId: bigint().notNull().build(),
  bio: string().build(),
});
const PostSchema = defineSchema({
  id: bigint().notNull().primary().build(),
  authorId: bigint().notNull().build(),
  title: string().notNull().build(),
  content: string().notNull().build(),
});

class Profile extends createModel<{ id: bigint; userId: bigint; bio?: string }>({
  name: 'Profile',
  schema: ProfileSchema,
}) {}
class Post extends createModel<{ id: bigint; authorId: bigint; title: string; content: string }>({
  name: 'Post',
  schema: PostSchema,
}) {}

type UserAttrs = {
  id: bigint;
  name: string;
  email: string;
  age?: number;
};

class User extends createModel<UserAttrs>({
  name: 'User',
  schema: UserSchema,
}) {
  static _relationsDef = {
    posts: relations.hasMany(() => Post),
    profile: relations.hasOne(() => Profile),
  };

  relations: InferRelations<typeof User._relationsDef>;

  constructor(...args: any[]) {
    super(...args);
    this.relations = relations.defineRelations(() => User._relationsDef, this);
  }

  get displayName() {
    return this.name.toUpperCase();
  }
}

describe('Model Factory - Relations via relations property', () => {
  it('allows type-safe async access to relations via relations property', async () => {
    const mockDb = {
      selectFrom: () => ({
        selectAll: () => ({
          where: () => ({
            execute: async () => [],
            executeTakeFirst: async () => null,
          }),
        }),
      }),
      insertInto: () => ({}),
      updateTable: () => ({}),
      deleteFrom: () => ({}),
      transaction: () => ({ execute: async (fn: any) => fn(mockDb) }),
    };
    const orm = createORMContext({ db: mockDb });
    await orm.run(async () => {
      const user = new User({ id: 1n, name: 'John', email: 'john@example.com', age: 42 });

      // Type checks:
      expectTypeOf(user.relations.posts).toEqualTypeOf<() => Promise<Post[]>>();
      expectTypeOf(user.relations.profile).toEqualTypeOf<() => Promise<Profile | null>>();
      // Runtime checks (demo: returns empty array/null)
      expect(await user.relations.posts()).toEqual([]);
      expect(await user.relations.profile()).toBeNull();
      expect(user.displayName).toBe('JOHN');
    });
  });
});

describe('Model Factory - Table name and schema consistency', () => {
  const TableSchemaA = defineSchema({
    id: bigint().notNull().primary().build(),
    value: string().notNull().build(),
  });
  const TableSchemaB = defineSchema({
    id: bigint().notNull().primary().build(),
    value: string().notNull().build(), // same as A
  });
  const TableSchemaDifferent = defineSchema({
    id: bigint().notNull().primary().build(),
    value: string().notNull().build(),
    extra: integer().build(), // extra field
  });

  it('allows multiple models with the same table name and identical schemas', () => {
    const Base1 = createModel({ name: 'Thing', schema: TableSchemaA });
    const Base2 = createModel({ name: 'Thing', schema: TableSchemaB });
    expect(Base1).toBe(Base2);
    // Subclassing still works
    class Model1 extends Base1 {}
    class Model2 extends Base2 {}
    expect(Object.getPrototypeOf(Model1.prototype).constructor).toBe(Base1);
    expect(Object.getPrototypeOf(Model2.prototype).constructor).toBe(Base2);
  });

  it('throws if schemas differ for the same table name', () => {
    createModel({ name: 'Widget', schema: TableSchemaA });
    expect(() => {
      // Should throw due to schema mismatch
      createModel({ name: 'Widget', schema: TableSchemaDifferent });
    }).toThrow(/Model registration conflict: Table name 'Widget'/);
  });
});
