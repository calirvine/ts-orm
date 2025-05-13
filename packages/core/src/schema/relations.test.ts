import { describe, it, expect } from 'vitest';
import { Model } from '../model';
import { hasOne, hasMany, belongsTo, belongsToMany, defineRelations } from './relations';

// Test models
class User extends Model {
  static get primaryKey() {
    return 'id';
  }
}

class Profile extends Model {
  static get primaryKey() {
    return 'id';
  }
}

class Post extends Model {
  static get primaryKey() {
    return 'id';
  }
}

class Role extends Model {
  static get primaryKey() {
    return 'id';
  }
}

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
      const relation = belongsToMany(() => Role).withPivot([]);
      expect(relation.type).toBe('belongsToMany');
      expect(typeof relation.model === 'function' ? relation.model() : relation.model).toBe(Role);
      expect(relation.fieldName).toBe('__useKey__');
      expect(relation.pivotTable).toBeUndefined();
      expect(relation.foreignKey).toBeUndefined();
      expect(relation.localKey).toBeUndefined();
    });
    it('creates a belongsToMany relation with explicit field name and deferred defaults', () => {
      const relation = belongsToMany('customRoles', () => Role).withPivot([]);
      expect(relation.type).toBe('belongsToMany');
      expect(typeof relation.model === 'function' ? relation.model() : relation.model).toBe(Role);
      expect(relation.fieldName).toBe('customRoles');
      expect(relation.pivotTable).toBeUndefined();
      expect(relation.foreignKey).toBeUndefined();
      expect(relation.localKey).toBeUndefined();
    });
    it('accepts custom pivot table and keys', () => {
      const relation = belongsToMany('roles', () => Role, {
        pivotTable: 'user_roles',
        foreignKey: 'user_id',
        localKey: 'role_id',
      }).withPivot([]);
      expect(relation.pivotTable).toBe('user_roles');
      expect(relation.foreignKey).toBe('user_id');
      expect(relation.localKey).toBe('role_id');
    });
    it('allows adding pivot columns', () => {
      const relation = belongsToMany(() => Role).withPivot(['assigned_at', 'expires_at']);
      expect(relation.pivotColumns).toEqual(['assigned_at', 'expires_at']);
    });
  });

  describe('defineRelations', () => {
    it('creates a relations definition object with resolved field names and defaults (implicit field names)', () => {
      const UserRelations = defineRelations({
        profile: hasOne(() => Profile),
        posts: hasMany(() => Post),
        roles: belongsToMany(() => Role).withPivot(['assigned_at']),
      });
      expect(UserRelations.profile.type).toBe('hasOne');
      expect(UserRelations.profile.fieldName).toBe('profile');
      expect(UserRelations.profile.foreignKey).toBe('profileId');
      expect(
        typeof UserRelations.profile.localKey === 'function'
          ? UserRelations.profile.localKey()
          : UserRelations.profile.localKey,
      ).toBe('id');
      expect(UserRelations.posts.type).toBe('hasMany');
      expect(UserRelations.posts.fieldName).toBe('posts');
      expect(UserRelations.posts.foreignKey).toBe('postsId');
      expect(
        typeof UserRelations.posts.localKey === 'function'
          ? UserRelations.posts.localKey()
          : UserRelations.posts.localKey,
      ).toBe('id');
      expect(UserRelations.roles.type).toBe('belongsToMany');
      expect(UserRelations.roles.fieldName).toBe('roles');
      expect(UserRelations.roles.pivotTable).toBe('roles_roles');
      expect(UserRelations.roles.foreignKey).toBe('rolesId');
      expect(
        typeof UserRelations.roles.localKey === 'function'
          ? UserRelations.roles.localKey()
          : UserRelations.roles.localKey,
      ).toBe('rolesId');
      expect(UserRelations.roles.pivotColumns).toEqual(['assigned_at']);
    });
    it('creates a relations definition object with explicit field names and defaults', () => {
      const UserRelations = defineRelations({
        customProfile: hasOne('customProfile', () => Profile),
        customPosts: hasMany('customPosts', () => Post),
        customRoles: belongsToMany('customRoles', () => Role).withPivot(['assigned_at']),
      });
      expect(UserRelations.customProfile.type).toBe('hasOne');
      expect(UserRelations.customProfile.fieldName).toBe('customProfile');
      expect(UserRelations.customProfile.foreignKey).toBe('customProfileId');
      expect(
        typeof UserRelations.customProfile.localKey === 'function'
          ? UserRelations.customProfile.localKey()
          : UserRelations.customProfile.localKey,
      ).toBe('id');
      expect(UserRelations.customPosts.type).toBe('hasMany');
      expect(UserRelations.customPosts.fieldName).toBe('customPosts');
      expect(UserRelations.customPosts.foreignKey).toBe('customPostsId');
      expect(
        typeof UserRelations.customPosts.localKey === 'function'
          ? UserRelations.customPosts.localKey()
          : UserRelations.customPosts.localKey,
      ).toBe('id');
      expect(UserRelations.customRoles.type).toBe('belongsToMany');
      expect(UserRelations.customRoles.fieldName).toBe('customRoles');
      expect(UserRelations.customRoles.pivotTable).toBe('customRoles_customRoles');
      expect(UserRelations.customRoles.foreignKey).toBe('customRolesId');
      expect(
        typeof UserRelations.customRoles.localKey === 'function'
          ? UserRelations.customRoles.localKey()
          : UserRelations.customRoles.localKey,
      ).toBe('customRolesId');
      expect(UserRelations.customRoles.pivotColumns).toEqual(['assigned_at']);
    });
    it('preserves relation order', () => {
      const UserRelations = defineRelations({
        profile: hasOne(() => Profile),
        posts: hasMany(() => Post),
        roles: belongsToMany(() => Role).withPivot([]),
      });
      const keys = Object.keys(UserRelations);
      expect(keys).toEqual(['profile', 'posts', 'roles']);
    });
  });
});
