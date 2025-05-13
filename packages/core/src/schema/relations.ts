import type { Model } from '../model';
import type { FieldDefinition } from './types';

/**
 * Types of relations supported by the ORM
 */
export type RelationType = 'hasOne' | 'hasMany' | 'belongsTo' | 'belongsToMany';

/**
 * Type for a model reference - either a string name or a function returning the model class
 */
export type ModelReference = string | (() => typeof Model);

/**
 * Base relation definition interface
 */
export interface RelationDefinition {
  type: RelationType;
  model: ModelReference;
  fieldName?: string;
  foreignKey?: string;
  localKey?: string | (() => string);
  pivotTable?: string;
  pivotColumns?: string[];
}

/**
 * Type for the result of relation factory functions
 */
export type RelationFactoryResult = RelationDefinition;

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
export function hasOne(
  fieldName: string | ModelReference,
  modelOrOptions?: ModelReference | { foreignKey?: string; localKey?: string },
  options: { foreignKey?: string; localKey?: string } = {},
) {
  const model = typeof fieldName === 'string' ? (modelOrOptions as ModelReference) : fieldName;
  const opts =
    typeof fieldName === 'string'
      ? options
      : (modelOrOptions as { foreignKey?: string; localKey?: string }) || {};

  return {
    type: 'hasOne' as const,
    model,
    fieldName: typeof fieldName === 'string' ? fieldName : USE_KEY,
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
export function hasMany(
  fieldName: string | ModelReference,
  modelOrOptions?: ModelReference | { foreignKey?: string; localKey?: string },
  options: { foreignKey?: string; localKey?: string } = {},
) {
  const model = typeof fieldName === 'string' ? (modelOrOptions as ModelReference) : fieldName;
  const opts =
    typeof fieldName === 'string'
      ? options
      : (modelOrOptions as { foreignKey?: string; localKey?: string }) || {};

  return {
    type: 'hasMany' as const,
    model,
    fieldName: typeof fieldName === 'string' ? fieldName : USE_KEY,
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
export function belongsTo(
  fieldName: string | ModelReference,
  modelOrOptions?: ModelReference | { foreignKey?: string; localKey?: string },
  options: { foreignKey?: string; localKey?: string } = {},
) {
  const model = typeof fieldName === 'string' ? (modelOrOptions as ModelReference) : fieldName;
  const opts =
    typeof fieldName === 'string'
      ? options
      : (modelOrOptions as { foreignKey?: string; localKey?: string }) || {};

  return {
    type: 'belongsTo' as const,
    model,
    fieldName: typeof fieldName === 'string' ? fieldName : USE_KEY,
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
export function belongsToMany(
  fieldName: string | ModelReference,
  modelOrOptions?:
    | ModelReference
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
) {
  const model = typeof fieldName === 'string' ? (modelOrOptions as ModelReference) : fieldName;
  const opts =
    typeof fieldName === 'string'
      ? options
      : (modelOrOptions as {
          pivotTable?: string;
          pivotColumns?: string[];
          foreignKey?: string;
          localKey?: string | (() => string);
        }) || {};

  const relation = {
    type: 'belongsToMany' as const,
    model,
    fieldName: typeof fieldName === 'string' ? fieldName : USE_KEY,
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
  };
}

/**
 * Creates a relations definition object
 *
 * @example
 * ```typescript
 * const UserRelations = defineRelations({
 *   profile: hasOne(() => Profile), // Uses 'userId' as foreign key
 *   posts: hasMany(() => Post), // Uses 'userId' as foreign key
 *   roles: belongsToMany(() => Role), // Uses 'user_roles' as pivot table
 * });
 * ```
 */
export function defineRelations(relations: Record<string, RelationDefinition>) {
  for (const key in relations) {
    const rel = relations[key];
    const fieldName = resolveFieldName(rel.fieldName, key);
    // Set the resolved fieldName
    rel.fieldName = fieldName;
    // Set default foreignKey/localKey/pivotTable if not provided
    if (rel.type === 'hasOne' || rel.type === 'hasMany') {
      if (!rel.foreignKey) rel.foreignKey = `${fieldName}Id`;
      if (!rel.localKey) rel.localKey = () => 'id';
    } else if (rel.type === 'belongsTo') {
      if (!rel.foreignKey) rel.foreignKey = `${fieldName}Id`;
      if (!rel.localKey) rel.localKey = () => 'id'; // Defer to runtime
    } else if (rel.type === 'belongsToMany') {
      if (!rel.pivotTable) rel.pivotTable = `${fieldName}_${fieldName}`;
      if (!rel.foreignKey) rel.foreignKey = `${fieldName}Id`;
      if (!rel.localKey) rel.localKey = () => `${fieldName}Id`;
    }
  }
  return relations;
}
