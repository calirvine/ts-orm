import { describe, it, expect } from 'vitest';
import { createModel } from './factory';
import { string, bigint, integer } from '../schema/fields';
import { defineSchema } from '../schema/schema';
import { hasOne, hasMany, belongsTo, belongsToMany, defineRelations } from '../schema/relations';
import {
  string as vString,
  number as vNumber,
  bigint as vBigint,
  nullable,
  minLength,
  email,
  minValue,
  pipe as vPipe,
} from 'valibot';

// Define schemas and relations first
const UserSchema = defineSchema({
  id: bigint().notNull().primary().build(),
  name: string().notNull().build(),
  email: string().notNull().build(),
  age: integer().build(),
});

const UserValidators = {
  id: vBigint(),
  name: vPipe(vString(), minLength(2)),
  email: vPipe(vString(), email()),
  age: nullable(vPipe(vNumber(), minValue(0))),
};

// Define models using class declarations
class User extends createModel({
  schema: UserSchema,
  validators: UserValidators,
  relations: defineRelations({
    profile: hasOne('Profile'),
    posts: hasMany('Post'),
    roles: belongsToMany('Role', { pivotColumns: ['assigned_at'] }),
  }),
}) {
  declare id: bigint;
  declare name: string;
  declare email: string;
  declare age: number | null;
}

class Profile extends createModel({
  schema: defineSchema({
    id: bigint().notNull().primary().build(),
    userId: bigint().notNull().build(),
    bio: string().build(),
  }),
  relations: defineRelations({
    user: belongsTo('User'),
  }),
}) {
  declare id: bigint;
  declare userId: bigint;
  declare bio: string | null;
}

class Post extends createModel({
  schema: defineSchema({
    id: bigint().notNull().primary().build(),
    authorId: bigint().notNull().build(),
    title: string().notNull().build(),
    content: string().notNull().build(),
  }),
  relations: defineRelations({
    author: belongsTo('User'),
  }),
}) {
  declare id: bigint;
  declare authorId: bigint;
  declare title: string;
  declare content: string;
}

class Role extends createModel({
  schema: defineSchema({
    id: bigint().notNull().primary().build(),
    name: string().notNull().build(),
  }),
  relations: defineRelations({
    users: belongsToMany('User', { pivotColumns: ['assigned_at'] }),
  }),
}) {
  declare id: bigint;
  declare name: string;
}

describe('Model Factory', () => {
  describe('Model Creation', () => {
    it('creates a model class with schema', () => {
      expect(User.schema).toBeDefined();
      expect(User.schema.id.type).toBe('bigint');
      expect(User.schema.name.type).toBe('string');
      expect(User.schema.email.type).toBe('string');
      expect(User.schema.age.type).toBe('integer');
    });

    it('creates a model class with relations', () => {
      expect(User.relations).toBeDefined();
      expect(User.relations.profile.type).toBe('hasOne');
      expect(User.relations.posts.type).toBe('hasMany');
      expect(User.relations.roles.type).toBe('belongsToMany');
    });

    it('creates a model class with validators', () => {
      expect(User.validators).toBeDefined();
      expect(User.validators.name).toBeDefined();
      expect(User.validators.email).toBeDefined();
      expect(User.validators.age).toBeDefined();
    });
  });

  describe('Model Instance', () => {
    it('creates a model instance with attributes', () => {
      const user = new User({
        id: 1n,
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      });

      expect(user).toBeInstanceOf(User);
      expect(user.id).toBe(1n);
      expect(user.name).toBe('John Doe');
      expect(user.email).toBe('john@example.com');
      expect(user.age).toBe(30);
    });

    it('validates model attributes', () => {
      const inputAttributes = {
        id: 1n,
        name: 'J', // Too short
        email: 'invalid-email', // Invalid format
        age: -1, // Negative number
      };
      const user = new User(inputAttributes);

      const issues = user.validate();
      expect(issues).toHaveLength(3);
      expect(issues).toContain('name: Invalid length: Expected >=2 but received 1');
      expect(issues).toContain('email: Invalid email: Received "invalid-email"');
      expect(issues).toContain('age: Invalid value: Expected >=0 but received -1');
    });

    it('gets model attributes', () => {
      const user = new User({
        id: 1n,
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      });

      const attributes = user.getAttributes();
      expect(attributes).toEqual({
        id: 1n,
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      });
    });

    it('sets model attributes', () => {
      const user = new User();
      user.setAttributes({
        id: 1n,
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      });

      expect(user.id).toBe(1n);
      expect(user.name).toBe('John Doe');
      expect(user.email).toBe('john@example.com');
      expect(user.age).toBe(30);
    });
  });
});
