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
  schema: ProfileSchema,
}) {}
class Post extends createModel<{ id: bigint; authorId: bigint; title: string; content: string }>({
  schema: PostSchema,
}) {}

type UserAttrs = {
  id: bigint;
  name: string;
  email: string;
  age?: number;
};

class User extends createModel<UserAttrs>({
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
