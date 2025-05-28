// Remove all relation-related imports, types, and code
import { FieldDefinition } from '../schema/types';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { BaseModel } from './BaseModel';
import { DataRepository } from './repository';
import { ValidationError } from '../errors/ValidationError';

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
   * The name of the model. Must be a valid class name (not anonymous or 'Model').
   */
  name: string;
  /**
   * The schema definition for this model
   */
  schema: Record<string, FieldDefinition>;
  /**
   * The validators for this model's attributes
   */
  validators?: Partial<Record<keyof Attrs, StandardSchemaV1>>;
}

function stableStringify(obj: any): string {
  if (obj && typeof obj === 'object' && !Array.isArray(obj))
    return (
      '{' +
      Object.keys(obj)
        .sort()
        .map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k]))
        .join(',') +
      '}'
    );
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  if (typeof obj === 'bigint') return obj.toString() + 'n';
  return JSON.stringify(obj);
}

function schemasEqual(a: object, b: object): boolean {
  return stableStringify(a) === stableStringify(b);
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
export function createModel<Attrs extends Record<string, unknown>>(
  options: CreateModelOptions<Attrs>,
) {
  // Check for existing model class with the same name
  if (modelRegistry.has(options.name)) {
    const existing = modelRegistry.get(options.name);
    // Compare schemas for equality
    if (!schemasEqual(existing.schema, options.schema)) {
      throw new Error(
        `Model registration conflict: Table name '${options.name}' already exists with a different schema.`,
      );
    }
    return existing as unknown as typeof ModelClassImpl & {
      new (...args: any[]): BaseModel & Attrs;
    };
  }

  const repo = new DataRepository<Attrs>(
    options.schema,
    options.name.toLowerCase() + (options.name.endsWith('s') ? '' : 's'),
  );

  class ModelClassImpl extends BaseModel {
    // Backing store for all model properties
    _attributes: Partial<Attrs> = {};
    // Shadow copy for dirty tracking
    _originalAttributes: Partial<Attrs> = {};
    static schema = options.schema;
    static validators: Partial<Record<keyof Attrs, StandardSchemaV1>> = options.validators || {};
    static get primaryKey() {
      const primaryField = Object.entries(options.schema).find(([_, field]) =>
        field.modifiers.has('primary'),
      );
      return primaryField ? primaryField[0] : 'id';
    }
    static get tableName() {
      return options.name.toLowerCase() + (options.name.endsWith('s') ? '' : 's');
    }
    static hydrate<T extends BaseModel>(
      this: new (attributes?: Partial<Attrs>) => T,
      dto: Record<string, unknown> | null,
    ): T | null {
      if (!dto) return null;
      // Safe: DTO is always assignable to Partial<Attrs> for model construction
      return new this(dto as unknown as Partial<Attrs>);
    }
    static async find<T extends BaseModel>(
      this: new (attributes?: Partial<Attrs>) => T,
      where?: Partial<Attrs>,
    ): Promise<T[]> {
      const dtos = await repo.find(where);
      return dtos.map((dto) => (this as any).hydrate(dto)!);
    }
    static async findById<T extends BaseModel>(
      this: new (attributes?: Partial<Attrs>) => T,
      id: unknown,
      idField: string = 'id',
    ): Promise<T | null> {
      const dto = await repo.findById(id, idField);
      return (this as any).hydrate(dto);
    }
    static async create<T extends BaseModel>(
      this: new (attributes?: Partial<Attrs>) => T,
      data: Partial<Attrs>,
      idField: string = 'id',
    ): Promise<T | null> {
      const dto = await repo.create(data, idField);
      return (this as any).hydrate(dto);
    }
    static async update(id: unknown, data: Partial<Attrs>, idField: string = 'id'): Promise<void> {
      await repo.update(id, data, idField);
    }
    static async delete(id: unknown, idField: string = 'id'): Promise<void> {
      await repo.delete(id, idField);
    }
    /**
     * Creates a new instance of the model.
     * @param attributes - Initial attributes for the model
     * @throws {ValidationError} If validation fails for any attribute
     */
    constructor(attributes: Partial<Attrs> = {}) {
      super();
      this._attributes = { ...attributes };
      this._originalAttributes = { ...this._attributes };
      const issues = this.validate();
      if (issues.length > 0) {
        throw new ValidationError(issues);
      }
    }
    getAttributes(): Attrs {
      // Return a shallow copy to avoid mutation
      return { ...this._attributes } as Attrs;
    }
    setAttributes(attributes: Attrs): void {
      this._attributes = { ...attributes };
      this._originalAttributes = { ...this._attributes };
    }
    validate(): string[] {
      const issues: string[] = [];
      const modelClass = this.constructor as typeof ModelClassImpl;
      for (const [key, validator] of Object.entries(modelClass.validators)) {
        if (!validator) continue;
        // Safe: this is always assignable to Attrs by construction
        const value = (this as unknown as Attrs)[key as keyof Attrs];
        if (typeof validator === 'object' && '~standard' in validator) {
          const schema = validator as StandardSchemaV1;
          const result = schema['~standard'].validate(value);
          if (result && 'issues' in result && result.issues) {
            issues.push(
              ...result.issues.map((issue: { message: string }) => `${key}: ${issue.message}`),
            );
          }
        }
      }
      return issues;
    }
    /**
     * Returns a shallow diff of changed fields since instantiation or last reset.
     */
    getChangedAttributes(): Partial<Attrs> {
      const changed: Partial<Attrs> = {};
      for (const key of Object.keys(this._attributes)) {
        if (this._attributes[key as keyof Attrs] !== this._originalAttributes[key as keyof Attrs]) {
          changed[key as keyof Attrs] = this._attributes[key as keyof Attrs];
        }
      }
      return changed;
    }
    /**
     * Returns true if any field has changed since instantiation or last reset.
     */
    isDirty(): boolean {
      return Object.keys(this.getChangedAttributes()).length > 0;
    }
    /**
     * Resets the dirty state, marking all current values as clean.
     */
    resetDirty(): void {
      this._originalAttributes = { ...this._attributes };
    }
  }
  // Dynamically define getters/setters for each schema property
  for (const key of Object.keys(options.schema)) {
    Object.defineProperty(ModelClassImpl.prototype, key, {
      get: function (this: InstanceType<typeof ModelClassImpl>) {
        return this._attributes[key as keyof Attrs];
      },
      set: function (this: InstanceType<typeof ModelClassImpl>, value: unknown) {
        this._attributes[key as keyof Attrs] = value as Attrs[keyof Attrs];
      },
      enumerable: true,
      configurable: true,
    });
  }
  /**
   * @note For full type safety, use declaration merging:
   *   interface YourModel extends YourAttrs {}
   * This will tell TypeScript that all properties exist on the model instance.
   */
  Object.defineProperty(ModelClassImpl, 'name', { value: options.name });
  modelRegistry.set(options.name, ModelClassImpl);
  // Type assertion: returned class instances have all schema properties
  return ModelClassImpl as unknown as typeof ModelClassImpl & {
    new (...args: any[]): BaseModel & Attrs;
  };
}

// Helper type for the model class constructor
type BaseModelConstructor<Attrs, Instance> = {
  new (attributes?: Partial<Attrs>): Instance;
  schema: Record<string, FieldDefinition>;
  validators: Partial<Record<keyof Attrs, StandardSchemaV1>>;
  primaryKey: string;
  tableName: string;
  find(where?: Partial<Attrs>): Promise<Instance[]>;
  findById(id: unknown, idField?: string): Promise<Instance | null>;
  create(data: Partial<Attrs>, idField?: string): Promise<Instance | null>;
  update(id: unknown, data: Partial<Attrs>, idField?: string): Promise<void>;
  delete(id: unknown, idField?: string): Promise<void>;
};
