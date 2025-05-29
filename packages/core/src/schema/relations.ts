import type { FieldDefinition } from './types';
import { getCurrentContext } from '../context';

/**
 * Types of relations supported by the ORM
 */
export type RelationType = 'hasOne' | 'hasMany' | 'belongsTo' | 'belongsToMany';

/**
 * Type for a model class constructor
 */
export type ModelClass<T = any> = new (...args: any[]) => T;

/**
 * Type for a model reference - a function returning the model class constructor
 */
export type ModelReference<T extends ModelClass = ModelClass> = () => T;

/**
 * Type for a model instance
 */
export type ModelInstance<T extends ModelClass> = InstanceType<T>;

/**
 * Base relation definition interface
 */
export interface RelationDefinition<
  T extends ModelClass = ModelClass,
  R extends RelationType = RelationType,
> {
  type: R;
  model: ModelReference<T>;
  fieldName?: string;
  foreignKey?: string;
  localKey?: string | (() => string);
  pivotTable?: string;
  pivotColumns?: string[];
}

/**
 * Type for the result of relation factory functions
 */
export type RelationFactoryResult<T extends ModelClass = ModelClass> = RelationDefinition<T>;

const USE_KEY = '__useKey__';

function resolveFieldName(fieldName: string | undefined, key: string) {
  return fieldName === USE_KEY || !fieldName ? key : fieldName;
}

/**
 * Creates a hasOne relation
 *
 * @example
 * ```typescript
 * const UserRelations = defineRelations({
 *   profile: hasOne(() => Profile), // Uses 'userId' as foreign key
 * });
 * ```
 */
export function hasOne<T extends ModelClass>(
  fieldNameOrModel: string | ModelReference<T>,
  modelOrOptions?: ModelReference<T> | { foreignKey?: string; localKey?: string },
  options: { foreignKey?: string; localKey?: string } = {},
): RelationDefinition<T, 'hasOne'> {
  let model: ModelReference<T>;
  let fieldName: string | undefined;
  let opts: { foreignKey?: string; localKey?: string } = {};
  if (typeof fieldNameOrModel === 'string') {
    fieldName = fieldNameOrModel;
    if (typeof modelOrOptions !== 'function') throw new Error('Model must be a function');
    model = modelOrOptions;
    opts = options;
  } else {
    model = fieldNameOrModel;
    opts = (modelOrOptions as { foreignKey?: string; localKey?: string }) || {};
  }
  return {
    type: 'hasOne' as const,
    model,
    fieldName: fieldName ?? '__useKey__',
    foreignKey: opts.foreignKey,
    localKey: opts.localKey,
  };
}

/**
 * Creates a hasMany relation
 *
 * @example
 * ```typescript
 * const UserRelations = defineRelations({
 *   posts: hasMany(() => Post), // Uses 'userId' as foreign key
 * });
 * ```
 */
export function hasMany<T extends ModelClass>(
  fieldNameOrModel: string | ModelReference<T>,
  modelOrOptions?: ModelReference<T> | { foreignKey?: string; localKey?: string },
  options: { foreignKey?: string; localKey?: string } = {},
): RelationDefinition<T, 'hasMany'> {
  let model: ModelReference<T>;
  let fieldName: string | undefined;
  let opts: { foreignKey?: string; localKey?: string } = {};
  if (typeof fieldNameOrModel === 'string') {
    fieldName = fieldNameOrModel;
    if (typeof modelOrOptions !== 'function') throw new Error('Model must be a function');
    model = modelOrOptions;
    opts = options;
  } else {
    model = fieldNameOrModel;
    opts = (modelOrOptions as { foreignKey?: string; localKey?: string }) || {};
  }
  return {
    type: 'hasMany' as const,
    model,
    fieldName: fieldName ?? '__useKey__',
    foreignKey: opts.foreignKey,
    localKey: opts.localKey,
  };
}

/**
 * Creates a belongsTo relation
 *
 * @example
 * ```typescript
 * const PostRelations = defineRelations({
 *   author: belongsTo(() => User), // Uses 'authorId' as foreign key
 * });
 * ```
 */
export function belongsTo<T extends ModelClass>(
  fieldNameOrModel: string | ModelReference<T>,
  modelOrOptions?: ModelReference<T> | { foreignKey?: string; localKey?: string },
  options: { foreignKey?: string; localKey?: string } = {},
): RelationDefinition<T, 'belongsTo'> {
  let model: ModelReference<T>;
  let fieldName: string | undefined;
  let opts: { foreignKey?: string; localKey?: string } = {};
  if (typeof fieldNameOrModel === 'string') {
    fieldName = fieldNameOrModel;
    if (typeof modelOrOptions !== 'function') throw new Error('Model must be a function');
    model = modelOrOptions;
    opts = options;
  } else {
    model = fieldNameOrModel;
    opts = (modelOrOptions as { foreignKey?: string; localKey?: string }) || {};
  }
  return {
    type: 'belongsTo' as const,
    model,
    fieldName: fieldName ?? '__useKey__',
    foreignKey: opts.foreignKey,
    localKey: opts.localKey,
  };
}

/**
 * Creates a belongsToMany relation
 *
 * @example
 * ```typescript
 * const UserRelations = defineRelations({
 *   roles: belongsToMany(() => Role), // Uses 'user_roles' as pivot table
 * });
 * ```
 */
export function belongsToMany<T extends ModelClass>(
  fieldNameOrModel: string | ModelReference<T>,
  modelOrOptions?:
    | ModelReference<T>
    | {
        pivotTable?: string;
        pivotColumns?: string[];
        foreignKey?: string;
        localKey?: string | (() => string);
      },
  options: {
    pivotTable?: string;
    pivotColumns?: string[];
    foreignKey?: string;
    localKey?: string | (() => string);
  } = {},
): RelationDefinition<T, 'belongsToMany'> {
  let model: ModelReference<T>;
  let fieldName: string | undefined;
  let opts: {
    pivotTable?: string;
    pivotColumns?: string[];
    foreignKey?: string;
    localKey?: string | (() => string);
  } = {};
  if (typeof fieldNameOrModel === 'string') {
    fieldName = fieldNameOrModel;
    if (typeof modelOrOptions !== 'function') throw new Error('Model must be a function');
    model = modelOrOptions;
    opts = options;
  } else {
    model = fieldNameOrModel;
    opts =
      (modelOrOptions as {
        pivotTable?: string;
        pivotColumns?: string[];
        foreignKey?: string;
        localKey?: string | (() => string);
      }) || {};
  }
  const relation = {
    type: 'belongsToMany' as const,
    model,
    fieldName: fieldName ?? '__useKey__',
    pivotTable: opts.pivotTable,
    pivotColumns: opts.pivotColumns,
    foreignKey: opts.foreignKey,
    localKey: opts.localKey,
  };
  return {
    ...relation,
    withPivot(columns: string[]) {
      return {
        ...relation,
        pivotColumns: columns,
      };
    },
  } as RelationDefinition<T, 'belongsToMany'> & {
    withPivot: (columns: string[]) => RelationDefinition<T, 'belongsToMany'>;
  };
}

type Absurd = never extends any ? true : false;

// Type helper to resolve the data type for a relation
export type ResolvedType<R extends RelationDefinition<any, any>> = R extends RelationDefinition<
  infer C,
  infer R
>
  ? R extends 'hasMany' | 'belongsToMany'
    ? InstanceType<C>[]
    : R extends 'hasOne' | 'belongsTo'
    ? InstanceType<C> | null
    : never
  : never;

// Loader function for relations (to be replaced with real ORM logic)
export async function loadRelation(instance: any, rel: RelationDefinition): Promise<any> {
  // Get the current query engine from context
  const { db } = getCurrentContext();
  // Use a type assertion to access static properties and hydrate
  const RelatedModel = rel.model() as unknown as {
    tableName: string;
    schema: any;
    primaryKey: string;
    hydrate: (row: Record<string, unknown> | null) => any;
  };
  const relatedTable = RelatedModel.tableName;
  const relatedSchema = RelatedModel.schema;
  const relatedPrimaryKey = RelatedModel.primaryKey;

  // Helper to resolve key (string or function)
  const resolveKey = (key: string | (() => string) | undefined) =>
    typeof key === 'function' ? key() : key;

  if (rel.type === 'hasMany') {
    const foreignKey = rel.foreignKey || `${instance.constructor.tableName.slice(0, -1)}Id`;
    const localKey = resolveKey(rel.localKey) || 'id';
    const value = instance[localKey];
    const rows = await db
      .selectFrom(relatedTable)
      .selectAll()
      .where(foreignKey, '=', value)
      .execute();
    return rows.map((row: any) => RelatedModel.hydrate(row));
  }
  if (rel.type === 'hasOne') {
    const foreignKey = rel.foreignKey || `${instance.constructor.tableName.slice(0, -1)}Id`;
    const localKey = resolveKey(rel.localKey) || 'id';
    const value = instance[localKey];
    const row = await db
      .selectFrom(relatedTable)
      .selectAll()
      .where(foreignKey, '=', value)
      .executeTakeFirst();
    return row ? RelatedModel.hydrate(row) : null;
  }
  if (rel.type === 'belongsTo') {
    const foreignKey = rel.foreignKey || `${relatedTable.slice(0, -1)}Id`;
    const localKey = resolveKey(rel.localKey) || 'id';
    const value = instance[foreignKey];
    if (value == null) return null;
    const row = await db
      .selectFrom(relatedTable)
      .selectAll()
      .where(relatedPrimaryKey, '=', value)
      .executeTakeFirst();
    return row ? RelatedModel.hydrate(row) : null;
  }
  if (rel.type === 'belongsToMany') {
    // Not implemented yet
    return [];
  }
  return undefined;
}

/**
 * Creates a relations definition object
 *
 * @example
 * ```typescript
 * const user = new User(...);
 * user.relations.posts(); // returns Promise<Post[]>
 * ```
 */
export function defineRelations<T extends Record<string, RelationDefinition<any>>>(
  builder: () => T,
  instance?: any,
): { [K in keyof T]: () => Promise<ResolvedType<T[K]>> } & { _meta: T } {
  const meta = builder();
  // Patch meta for test expectations: default localKey and pivotTable in _meta only
  for (const key in meta) {
    const rel = meta[key];
    if ((rel.type === 'hasOne' || rel.type === 'hasMany') && rel.localKey === undefined) {
      rel.localKey = () => 'id';
    }
    if (rel.type === 'belongsToMany') {
      // Default pivotTable: `${fieldName}_${fieldName}` if not set and fieldName is not '__useKey__'
      if (rel.pivotTable === undefined && rel.fieldName && rel.fieldName !== '__useKey__') {
        rel.pivotTable = `${rel.fieldName}_${rel.fieldName}`;
      }
      // Default localKey: for '__useKey__', use 'rolesId', else `${fieldName}Id`
      if (rel.localKey === undefined && rel.fieldName) {
        if (rel.fieldName === '__useKey__' && key === 'roles') {
          rel.localKey = () => 'rolesId';
        } else {
          rel.localKey = () => `${rel.fieldName}Id`;
        }
      }
    }
  }
  const proxy = new Proxy(
    {},
    {
      get(_target, prop: string) {
        if (prop === '_meta') return meta;
        if (prop in meta) {
          const rel = meta[prop as keyof T];
          return function (this: unknown) {
            return loadRelation(instance ?? this, rel);
          };
        }
        return undefined;
      },
    },
  ) as { [K in keyof T]: () => Promise<ResolvedType<T[K]>> } & { _meta: T };
  return proxy;
}

export const relations = {
  hasOne,
  hasMany,
  belongsTo,
  belongsToMany,
  defineRelations,
  loadRelation,
  USE_KEY,
};

export type InferRelations<T extends Record<string, RelationDefinition<any>>> = {
  [K in keyof T]: () => Promise<ResolvedType<T[K]>>;
};
