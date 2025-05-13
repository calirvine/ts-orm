import { Model, registerModel } from '../model';
import type { RelationDefinition } from '../schema/relations';
import { FieldDefinition } from '../schema/types';
import type { StandardSchemaV1 } from '@standard-schema/spec';

/**
 * Type for model attributes based on schema definition
 */
export type ModelAttributes<T> = {
  [K in keyof T]: T[K];
};

/**
 * Type for model relations based on relation definitions
 */
export type ModelRelations<T> = {
  [K in keyof T]: T[K];
};

/**
 * Type for a model class created by createModel
 */
export type ModelClass<T extends object, R extends object = {}> = {
  new (
    attributes: ModelAttributes<T>,
    relations?: ModelRelations<R>,
  ): Model & {
    getAttributes(): ModelAttributes<T>;
    setAttributes(attributes: ModelAttributes<T>): void;
    validate(): string[];
  };
  validators: Partial<Record<keyof T, StandardSchemaV1>>;
  schema: Record<string, FieldDefinition>;
  relations: Record<string, RelationDefinition>;
  primaryKey: string;
  tableName: string;
};

/**
 * Options for creating a model
 */
export interface CreateModelOptions<T extends object, R extends object = {}> {
  /**
   * The name of the model. If not provided, will use the class name.
   * Must be a valid class name (not anonymous or 'Model').
   */
  name?: string;
  /**
   * The schema definition for this model
   */
  schema: Record<string, FieldDefinition>;
  /**
   * The relations definition for this model
   */
  relations?: Record<string, RelationDefinition>;
  /**
   * The validators for this model's attributes
   */
  validators?: Partial<Record<keyof T, StandardSchemaV1>>;
}

/**
 * Creates a new model class with schema, relations, and validators
 *
 * @example
 * ```typescript
 * class User extends createModel({
 *   schema: defineSchema({
 *     id: bigint().notNull().primary().build(),
 *     name: string().notNull().build(),
 *     email: string().notNull().build(),
 *   }),
 *   relations: defineRelations({
 *     profile: hasOne(Profile),
 *     posts: hasMany(Post),
 *     roles: belongsToMany(Role).withPivot(['assigned_at']),
 *   }),
 *   validators: {
 *     name: vPipe(vString(), minLength(2)),
 *     email: vPipe(vString(), email()),
 *     age: nullable(vPipe(number(), minValue(0))),
 *   },
 * }) {
 *   // Model-specific methods and overrides
 * }
 * ```
 */
export function createModel<T extends object, R extends object = {}>(
  options: CreateModelOptions<T, R>,
): ModelClass<T, R> & typeof Model {
  const ModelImpl = class extends Model {
    static schema = options.schema;
    static relations: Record<string, RelationDefinition> = options.relations || {};
    static validators: Partial<Record<keyof T, StandardSchemaV1>> = options.validators || {};
    static get primaryKey() {
      // Find the field with the 'primary' modifier
      const primaryField = Object.entries(options.schema).find(([_, field]) =>
        field.modifiers.has('primary'),
      );
      return primaryField ? primaryField[0] : 'id';
    }
    static get tableName() {
      // Get the class name from the constructor
      const className = this.name;

      // If name was provided in options, use it
      if (options.name) {
        return options.name.toLowerCase() + (options.name.endsWith('s') ? '' : 's');
      }

      // Otherwise use the class name
      if (className === 'Model' || className === 'ModelImpl') {
        throw new Error('Model name must be provided when using an anonymous class');
      }

      return className.toLowerCase() + (className.endsWith('s') ? '' : 's');
    }

    constructor(attributes: ModelAttributes<T>, relations?: ModelRelations<R>) {
      super(attributes);
    }

    getAttributes(): ModelAttributes<T> {
      return this as unknown as ModelAttributes<T>;
    }

    setAttributes(attributes: ModelAttributes<T>): void {
      Object.assign(this, attributes);
    }

    validate(): string[] {
      const issues: string[] = [];
      const modelClass = this.constructor as ModelClass<T, R>;

      for (const [key, validator] of Object.entries(modelClass.validators)) {
        if (!validator) continue;

        const value = (this as unknown as Record<string, unknown>)[key];
        if (typeof validator === 'object' && '~standard' in validator) {
          const schema = validator as StandardSchemaV1;
          const result = schema['~standard'].validate(value);
          if (result && 'issues' in result && result.issues) {
            issues.push(...result.issues.map((issue) => `${key}: ${issue.message}`));
          }
        }
      }
      return issues;
    }
  };

  // If name was provided, set it on the class
  if (options.name) {
    Object.defineProperty(ModelImpl, 'name', { value: options.name });
  }

  // Register the model class
  registerModel(ModelImpl);

  return ModelImpl;
}
