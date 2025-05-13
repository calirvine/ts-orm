import { describe, it, expect } from 'vitest';
import { Model } from './model';
import {
  hasOne,
  hasMany,
  belongsTo,
  belongsToMany,
  defineRelations,
  RelationDefinition,
} from './schema/relations';
import { string, bigint } from './schema/fields';
import { defineSchema } from './schema/schema';

class Profile extends Model {
  static schema = defineSchema({
    id: bigint().notNull().primary().build(),
    userId: bigint().notNull().build(),
    bio: string().build(),
  });

  static relations: Record<string, RelationDefinition> = defineRelations({
    user: belongsTo(() => User),
  });
}

class Post extends Model {
  static schema = defineSchema({
    id: bigint().notNull().primary().build(),
    authorId: bigint().notNull().build(),
    title: string().notNull().build(),
    content: string().notNull().build(),
  });

  static relations: Record<string, RelationDefinition> = defineRelations({
    author: belongsTo(() => User),
  });
}

class Role extends Model {
  static schema = defineSchema({
    id: bigint().notNull().primary().build(),
    name: string().notNull().build(),
  });

  static relations: Record<string, RelationDefinition> = defineRelations({
    users: belongsToMany(() => User).withPivot(['assigned_at']),
  });
}

class User extends Model {
  static schema = defineSchema({
    id: bigint().notNull().primary().build(),
    name: string().notNull().build(),
    email: string().notNull().build(),
  });

  static relations: Record<string, RelationDefinition> = defineRelations({
    profile: hasOne(() => Profile),
    posts: hasMany(() => Post),
    roles: belongsToMany(() => Role).withPivot(['assigned_at']),
  });
}

describe('Model', () => {
  describe('Static Properties', () => {
    it('has a default table name', () => {
      expect(User.tableName).toBe('users');
      expect(Profile.tableName).toBe('profiles');
      expect(Post.tableName).toBe('posts');
      expect(Role.tableName).toBe('roles');
    });

    it('has a default primary key', () => {
      expect(User.primaryKey).toBe('id');
      expect(Profile.primaryKey).toBe('id');
      expect(Post.primaryKey).toBe('id');
      expect(Role.primaryKey).toBe('id');
    });

    it('has schema definitions', () => {
      expect(User.schema).toBeDefined();
      expect(Profile.schema).toBeDefined();
      expect(Post.schema).toBeDefined();
      expect(Role.schema).toBeDefined();
    });

    it('has relation definitions', () => {
      expect(User.relations).toBeDefined();
      expect(Profile.relations).toBeDefined();
      expect(Post.relations).toBeDefined();
      expect(Role.relations).toBeDefined();
    });
  });

  describe('Instance Methods', () => {
    it('creates a model instance with attributes', () => {
      const user = new User({
        id: 1n,
        name: 'John Doe',
        email: 'john@example.com',
      });

      expect(user).toBeInstanceOf(User);
      expect((user as any).id).toBe(1n);
      expect((user as any).name).toBe('John Doe');
      expect((user as any).email).toBe('john@example.com');
    });

    it('gets a relation by name', () => {
      const user = new User();
      const relation = user.getRelation('profile');

      expect(relation).toBeDefined();
      expect(relation?.type).toBe('hasOne');
      expect(relation?.model).toBe(Profile);
    });

    it('returns undefined for non-existent relations', () => {
      const user = new User();
      const relation = user.getRelation('nonExistent');

      expect(relation).toBeUndefined();
    });

    it('gets all relations', () => {
      const user = new User();
      const relations = user.getRelations();

      expect(relations).toBeDefined();
      expect(relations.profile.type).toBe('hasOne');
      expect(relations.posts.type).toBe('hasMany');
      expect(relations.roles.type).toBe('belongsToMany');
    });
  });
});
