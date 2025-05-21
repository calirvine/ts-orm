// Remove all relation-related imports, types, and code
import { FieldDefinition } from '../schema/types';
import type { StandardSchemaV1 } from '@standard-schema/spec';

/**
 * Registry of all model classes
 */
const modelRegistry = new Map<string, any>();

/**
 * Type for model attributes based on schema definition
 */
export type ModelAttributes<T> = {
  [K in keyof T]: T[K];
};

/**
 * Type for a model class created by createModel
 *
 * @example
 * interface UserAttrs {
 *   id: bigint;
 *   name: string;
 *   email: string;
 *   age?: number;
 * }
 * const BaseUser = createModel<UserAttrs>(userSchema);
 * class User extends BaseUser {
 *   get displayName() {
 *     return this.name.toUpperCase();
 *   }
 *   static findByEmail(email: string) {
 *     // ...
 *   }
 * }
 */
export type ModelClass<Attrs extends object> = {
  new (attributes?: Partial<Attrs>): Attrs & {
    getAttributes(): Attrs;
    setAttributes(attributes: Attrs): void;
    validate(): string[];
  };
  schema: Record<string, FieldDefinition>;
  validators: Partial<Record<keyof Attrs, StandardSchemaV1>>;
  primaryKey: string;
  tableName: string;
};

/**
 * Options for creating a model
 */
export interface CreateModelOptions<Attrs extends object> {
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
   * The validators for this model's attributes
   */
  validators?: Partial<Record<keyof Attrs, StandardSchemaV1>>;
}

function getModelRegistryKey(schema: object, tableName: string) {
  // Stable stringification: sort keys for deterministic output
  const stableStringify = (obj: any): string => {
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      return (
        '{' +
        Object.keys(obj)
          .sort()
          .map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k]))
          .join(',') +
        '}'
      );
    } else if (Array.isArray(obj)) {
      return '[' + obj.map(stableStringify).join(',') + ']';
    } else if (typeof obj === 'bigint') {
      return obj.toString() + 'n';
    } else {
      return JSON.stringify(obj);
    }
  };
  return stableStringify(schema) + '::' + tableName;
}

// ModelInstance type is now just Attrs & methods
// No relations

type ModelInstance<Attrs> = Attrs & {
  getAttributes(): Attrs;
  setAttributes(attributes: Attrs): void;
  validate(): string[];
};

/**
 * Creates a new model class with schema and validators
 *
 * @example
 * ```typescript
 * class User extends createModel({
 *   schema: defineSchema({
 *     id: bigint().notNull().primary().build(),
 *     name: string().notNull().build(),
 *     email: string().notNull().build(),
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
export function createModel<Attrs extends object>(
  options: CreateModelOptions<Attrs>,
): {
  new (attributes?: Partial<Attrs>): ModelInstance<Attrs>;
  schema: Record<string, FieldDefinition>;
  validators: Partial<Record<keyof Attrs, StandardSchemaV1>>;
  primaryKey: string;
  tableName: string;
} {
  const tableName = options.name || 'anonymous';
  const registryKey = getModelRegistryKey(options.schema, tableName);
  if (modelRegistry.has(registryKey)) {
    return modelRegistry.get(registryKey);
  }
  class BaseModel {
    static schema = options.schema;
    static validators: Partial<Record<keyof Attrs, StandardSchemaV1>> = options.validators || {};
    static get primaryKey() {
      const primaryField = Object.entries(options.schema).find(([_, field]) =>
        field.modifiers.has('primary'),
      );
      return primaryField ? primaryField[0] : 'id';
    }
    static get tableName() {
      if (options.name) {
        return options.name.toLowerCase() + (options.name.endsWith('s') ? '' : 's');
      }
      const className = this.name;
      if (className === 'BaseModel') {
        throw new Error('Model name must be provided when using an anonymous class');
      }
      return className.toLowerCase() + (className.endsWith('s') ? '' : 's');
    }
    constructor(attributes: Partial<Attrs> = {}) {
      Object.assign(this, attributes);
    }
    getAttributes(): Attrs {
      const attrs: Partial<Attrs> = {};
      for (const key of Object.keys((this.constructor as typeof BaseModel).schema)) {
        (attrs as any)[key] = (this as any)[key];
      }
      return attrs as Attrs;
    }
    setAttributes(attributes: Attrs): void {
      Object.assign(this, attributes);
    }
    validate(): string[] {
      const issues: string[] = [];
      const modelClass = this.constructor as typeof BaseModel;
      for (const [key, validator] of Object.entries(modelClass.validators)) {
        if (!validator) continue;
        const value = (this as any)[key];
        if (typeof validator === 'object' && '~standard' in validator) {
          const schema = validator as StandardSchemaV1;
          const result = schema['~standard'].validate(value);
          if (result && 'issues' in result && result.issues) {
            issues.push(...result.issues.map((issue: any) => `${key}: ${issue.message}`));
          }
        }
      }
      return issues;
    }
  }
  if (options.name) {
    Object.defineProperty(BaseModel, 'name', { value: options.name });
  }
  modelRegistry.set(registryKey, BaseModel);
  return BaseModel as unknown as {
    new (attributes?: Partial<Attrs>): ModelInstance<Attrs>;
    schema: Record<string, FieldDefinition>;
    validators: Partial<Record<keyof Attrs, StandardSchemaV1>>;
    primaryKey: string;
    tableName: string;
  };
}
