import { describe, it, expect } from 'vitest';
import { createModel } from '../model/factory';
import { hasOne, hasMany, belongsTo, belongsToMany, defineRelations } from './relations';

// Test models
const User = createModel({
  schema: {
    id: { type: 'bigint', modifiers: new Set(['primary']) },
    name: { type: 'string', modifiers: new Set() },
  },
});
const Profile = createModel({
  schema: {
    id: { type: 'bigint', modifiers: new Set(['primary']) },
    userId: { type: 'bigint', modifiers: new Set() },
  },
});
const Post = createModel({
  schema: {
    id: { type: 'bigint', modifiers: new Set(['primary']) },
    authorId: { type: 'bigint', modifiers: new Set() },
  },
});
const Role = createModel({
  schema: {
    id: { type: 'bigint', modifiers: new Set(['primary']) },
    name: { type: 'string', modifiers: new Set() },
  },
});

describe('Relation Factories', () => {
  describe('hasOne', () => {
    it('creates a hasOne relation with deferred field name and defaults', () => {
      const relation = hasOne(() => Profile);
      expect(relation.type).toBe('hasOne');
      expect(typeof relation.model === 'function' ? relation.model() : relation.model).toBe(
        Profile,
      );
      expect(relation.fieldName).toBe('__useKey__');
      expect(relation.foreignKey).toBeUndefined();
      expect(relation.localKey).toBeUndefined();
    });
    it('creates a hasOne relation with explicit field name and deferred defaults', () => {
      const relation = hasOne('customProfile', () => Profile);
      expect(relation.type).toBe('hasOne');
      expect(typeof relation.model === 'function' ? relation.model() : relation.model).toBe(
        Profile,
      );
      expect(relation.fieldName).toBe('customProfile');
      expect(relation.foreignKey).toBeUndefined();
      expect(relation.localKey).toBeUndefined();
    });
    it('accepts custom foreign key and local key', () => {
      const relation = hasOne('profile', () => Profile, {
        foreignKey: 'user_id',
        localKey: 'id',
      });
      expect(relation.foreignKey).toBe('user_id');
      expect(relation.localKey).toBe('id');
    });
  });

  describe('hasMany', () => {
    it('creates a hasMany relation with deferred field name and defaults', () => {
      const relation = hasMany(() => Post);
      expect(relation.type).toBe('hasMany');
      expect(typeof relation.model === 'function' ? relation.model() : relation.model).toBe(Post);
      expect(relation.fieldName).toBe('__useKey__');
      expect(relation.foreignKey).toBeUndefined();
      expect(relation.localKey).toBeUndefined();
    });
    it('creates a hasMany relation with explicit field name and deferred defaults', () => {
      const relation = hasMany('customPosts', () => Post);
      expect(relation.type).toBe('hasMany');
      expect(typeof relation.model === 'function' ? relation.model() : relation.model).toBe(Post);
      expect(relation.fieldName).toBe('customPosts');
      expect(relation.foreignKey).toBeUndefined();
      expect(relation.localKey).toBeUndefined();
    });
    it('accepts custom foreign key and local key', () => {
      const relation = hasMany('posts', () => Post, {
        foreignKey: 'author_id',
        localKey: 'id',
      });
      expect(relation.foreignKey).toBe('author_id');
      expect(relation.localKey).toBe('id');
    });
  });

  describe('belongsTo', () => {
    it('creates a belongsTo relation with deferred field name and defaults', () => {
      const relation = belongsTo(() => User);
      expect(relation.type).toBe('belongsTo');
      expect(typeof relation.model === 'function' ? relation.model() : relation.model).toBe(User);
      expect(relation.fieldName).toBe('__useKey__');
      expect(relation.foreignKey).toBeUndefined();
      expect(relation.localKey).toBeUndefined();
    });
    it('creates a belongsTo relation with explicit field name and deferred defaults', () => {
      const relation = belongsTo('author', () => User);
      expect(relation.type).toBe('belongsTo');
      expect(typeof relation.model === 'function' ? relation.model() : relation.model).toBe(User);
      expect(relation.fieldName).toBe('author');
      expect(relation.foreignKey).toBeUndefined();
      expect(relation.localKey).toBeUndefined();
    });
    it('accepts custom foreign key and local key', () => {
      const relation = belongsTo('user', () => User, {
        foreignKey: 'author_id',
        localKey: 'id',
      });
      expect(relation.foreignKey).toBe('author_id');
      expect(relation.localKey).toBe('id');
    });
  });

  describe('belongsToMany', () => {
    it('creates a belongsToMany relation with deferred field name and defaults', () => {
      const relation = (belongsToMany(() => Role) as any).withPivot([]);
      expect(relation.type).toBe('belongsToMany');
      expect(typeof relation.model === 'function' ? relation.model() : relation.model).toBe(Role);
      expect(relation.fieldName).toBe('__useKey__');
      expect(relation.pivotTable).toBeUndefined();
      expect(relation.foreignKey).toBeUndefined();
      expect(relation.localKey).toBeUndefined();
    });
    it('creates a belongsToMany relation with explicit field name and deferred defaults', () => {
      const relation = (belongsToMany('customRoles', () => Role) as any).withPivot([]);
      expect(relation.type).toBe('belongsToMany');
      expect(typeof relation.model === 'function' ? relation.model() : relation.model).toBe(Role);
      expect(relation.fieldName).toBe('customRoles');
      expect(relation.pivotTable).toBeUndefined();
      expect(relation.foreignKey).toBeUndefined();
      expect(relation.localKey).toBeUndefined();
    });
    it('accepts custom pivot table and keys', () => {
      const relation = (
        belongsToMany('roles', () => Role, {
          pivotTable: 'user_roles',
          foreignKey: 'user_id',
          localKey: 'role_id',
        }) as any
      ).withPivot([]);
      expect(relation.pivotTable).toBe('user_roles');
      expect(relation.foreignKey).toBe('user_id');
      expect(relation.localKey).toBe('role_id');
    });
    it('allows adding pivot columns', () => {
      const relation = (belongsToMany(() => Role) as any).withPivot(['assigned_at', 'expires_at']);
      expect(relation.pivotColumns).toEqual(['assigned_at', 'expires_at']);
    });
  });

  describe('defineRelations', () => {
    it('creates a relations definition object with resolved field names and defaults (implicit field names)', () => {
      const UserRelations = defineRelations(() => ({
        profile: hasOne(() => Profile),
        posts: hasMany(() => Post),
        roles: (belongsToMany(() => Role) as any).withPivot(['assigned_at']),
      }));
      expect(UserRelations._meta.profile.type).toBe('hasOne');
      expect(UserRelations._meta.profile.fieldName).toBe('__useKey__');
      expect(UserRelations._meta.profile.foreignKey).toBeUndefined();
      expect(
        typeof UserRelations._meta.profile.localKey === 'function'
          ? UserRelations._meta.profile.localKey()
          : UserRelations._meta.profile.localKey,
      ).toBe('id');
      expect(UserRelations._meta.posts.type).toBe('hasMany');
      expect(UserRelations._meta.posts.fieldName).toBe('__useKey__');
      expect(UserRelations._meta.posts.foreignKey).toBeUndefined();
      expect(
        typeof UserRelations._meta.posts.localKey === 'function'
          ? UserRelations._meta.posts.localKey()
          : UserRelations._meta.posts.localKey,
      ).toBe('id');
      expect(UserRelations._meta.roles.type).toBe('belongsToMany');
      expect(UserRelations._meta.roles.fieldName).toBe('__useKey__');
      expect(UserRelations._meta.roles.pivotTable).toBeUndefined();
      expect(UserRelations._meta.roles.foreignKey).toBeUndefined();
      expect(
        typeof UserRelations._meta.roles.localKey === 'function'
          ? UserRelations._meta.roles.localKey()
          : UserRelations._meta.roles.localKey,
      ).toBe('rolesId');
      expect(UserRelations._meta.roles.pivotColumns).toEqual(['assigned_at']);
    });
    it('creates a relations definition object with explicit field names and defaults', () => {
      const UserRelations = defineRelations(() => ({
        customProfile: hasOne('customProfile', () => Profile),
        customPosts: hasMany('customPosts', () => Post),
        customRoles: (belongsToMany('customRoles', () => Role) as any).withPivot(['assigned_at']),
      }));
      expect(UserRelations._meta.customProfile.type).toBe('hasOne');
      expect(UserRelations._meta.customProfile.fieldName).toBe('customProfile');
      expect(UserRelations._meta.customProfile.foreignKey).toBeUndefined();
      expect(
        typeof UserRelations._meta.customProfile.localKey === 'function'
          ? UserRelations._meta.customProfile.localKey()
          : UserRelations._meta.customProfile.localKey,
      ).toBe('id');
      expect(UserRelations._meta.customPosts.type).toBe('hasMany');
      expect(UserRelations._meta.customPosts.fieldName).toBe('customPosts');
      expect(UserRelations._meta.customPosts.foreignKey).toBeUndefined();
      expect(
        typeof UserRelations._meta.customPosts.localKey === 'function'
          ? UserRelations._meta.customPosts.localKey()
          : UserRelations._meta.customPosts.localKey,
      ).toBe('id');
      expect(UserRelations._meta.customRoles.type).toBe('belongsToMany');
      expect(UserRelations._meta.customRoles.fieldName).toBe('customRoles');
      expect(UserRelations._meta.customRoles.pivotTable).toBe('customRoles_customRoles');
      expect(UserRelations._meta.customRoles.foreignKey).toBeUndefined();
      expect(
        typeof UserRelations._meta.customRoles.localKey === 'function'
          ? UserRelations._meta.customRoles.localKey()
          : UserRelations._meta.customRoles.localKey,
      ).toBe('customRolesId');
      expect(UserRelations._meta.customRoles.pivotColumns).toEqual(['assigned_at']);
    });
    it('preserves relation order', () => {
      const UserRelations = defineRelations(() => ({
        profile: hasOne(() => Profile),
        posts: hasMany(() => Post),
        roles: (belongsToMany(() => Role) as any).withPivot([]),
      }));
      const keys = Object.keys(UserRelations._meta);
      expect(keys).toEqual(['profile', 'posts', 'roles']);
    });
  });
});
