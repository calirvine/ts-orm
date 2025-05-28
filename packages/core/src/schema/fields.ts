import {
  FieldDefinition,
  FieldFactoryResult,
  FieldModifier,
  FieldType,
  SchemaDefinition,
} from './types';

/**
 * Creates a new field definition with the given type
 */
function createField<T extends FieldType>(type: T): FieldFactoryResult<T> {
  return {
    type,
    modifiers: new Set<FieldModifier>(['nullable']),
  };
}

/**
 * Base field factory with chainable methods
 * Methods are ordered in a logical sequence:
 * 1. Primary key modifiers (primary, unique)
 * 2. Column constraints (notNull, index)
 * 3. Column customization (column name, default value)
 */
class FieldBuilder<T extends FieldType> {
  private field: FieldFactoryResult<T>;
  private isNotNull = false;

  constructor(type: T) {
    this.field = createField(type);
  }

  /**
   * Makes the field a primary key
   * Must be called before other modifiers
   */
  primary(): this {
    if (!this.isNotNull) {
      throw new Error('Primary key must be not null');
    }
    this.field.modifiers.add('primary');
    return this;
  }

  /**
   * Makes the field unique
   * Can be called after primary() but before notNull()
   */
  unique(): this {
    if (!this.isNotNull) {
      throw new Error('Unique fields must be not null');
    }
    this.field.modifiers.add('unique');
    return this;
  }

  /**
   * Makes the field not null
   * Must be called before primary() or unique()
   */
  notNull(): this {
    this.field.modifiers.delete('nullable');
    this.isNotNull = true;
    return this;
  }

  /**
   * Makes the field indexed
   * Can be called at any time
   */
  index(): this {
    this.field.modifiers.add('index');
    return this;
  }

  /**
   * Sets the column name
   * Can be called at any time
   */
  column(name: string): this {
    this.field.columnName = name;
    return this;
  }

  /**
   * Sets the default value
   * Can be called at any time
   */
  default(value: unknown): this {
    this.field.defaultValue = value;
    return this;
  }

  /**
   * Sets column options
   * Can be called at any time
   */
  columnOptions(options: Record<string, unknown>): this {
    this.field.columnOptions = options;
    return this;
  }

  /**
   * Gets the field definition
   */
  build(): FieldFactoryResult<T> {
    return this.field;
  }
}

/**
 * String field factory
 */
export function string() {
  return new FieldBuilder('string');
}

/**
 * Integer field factory
 */
export function integer() {
  return new FieldBuilder('integer');
}

/**
 * Bigint field factory
 *
 * @param config - Configuration object. Supports { mode: 'number' | 'bigint' } (default: 'number').
 *   If mode is 'number', values will be coerced to JS number type when possible.
 * @example
 *   bigint() // default, uses JS number
 *   bigint({ mode: 'bigint' }) // uses JS BigInt
 */
export function bigint(config?: { mode?: 'number' | 'bigint' }) {
  const mode = config?.mode ?? 'number';
  return new FieldBuilder('bigint').columnOptions({ mode });
}

/**
 * Float field factory
 */
export function float() {
  return new FieldBuilder('float');
}

/**
 * Decimal field factory with precision and scale
 */
export function decimal(precision: number, scale: number) {
  return new FieldBuilder('decimal').columnOptions({ precision, scale });
}

/**
 * Boolean field factory
 */
export function boolean() {
  return new FieldBuilder('boolean');
}

/**
 * Timestamp field factory
 */
export function timestamp() {
  return new FieldBuilder('timestamp');
}

/**
 * Date field factory
 */
export function date() {
  return new FieldBuilder('date');
}

/**
 * Time field factory
 */
export function time() {
  return new FieldBuilder('time');
}

/**
 * JSON field factory
 */
export function json() {
  return new FieldBuilder('json');
}

/**
 * Field modifier functions
 */

/**
 * Makes a field unique
 */
export function unique<T extends FieldDefinition>(field: T): T {
  field.modifiers.add('unique');
  return field;
}

/**
 * Makes a field nullable
 */
export function nullable<T extends FieldDefinition>(field: T): T {
  field.modifiers.add('nullable');
  return field;
}

/**
 * Makes a field a primary key
 */
export function primary<T extends FieldDefinition>(field: T): T {
  field.modifiers.add('primary');
  return field;
}

/**
 * Makes a field indexed
 */
export function index<T extends FieldDefinition>(field: T): T {
  field.modifiers.add('index');
  return field;
}

/**
 * Sets the column name for a field
 *
 * @example
 * ```typescript
 * const UserSchema = defineSchema({
 *   id: unique(bigint()),
 *   firstName: column(string(), 'first_name'),
 *   lastName: column(string(), 'last_name'),
 *   createdAt: column(timestamp(), 'created_at'),
 * });
 * ```
 */
export function column<T extends FieldDefinition>(field: T, name: string): T {
  field.columnName = name;
  return field;
}

/**
 * Coerce a value for a bigint field according to its mode (number or bigint)
 * Used for serialization/deserialization at model/DB boundaries
 */
export function coerceBigintFieldValue(
  value: unknown,
  field: FieldDefinition,
): number | bigint | null {
  const mode = field.columnOptions?.mode ?? 'number';
  if (value == null) return null;
  if (mode === 'number') {
    if (typeof value === 'bigint') {
      // Optionally: check for overflow here
      return Number(value);
    }
    if (typeof value === 'string' && /^\d+$/.test(value)) {
      // DBs often return bigints as strings
      return Number(value);
    }
    return value as number;
  }
  if (mode === 'bigint') {
    if (typeof value === 'number') return BigInt(value);
    if (typeof value === 'string' && /^\d+$/.test(value)) return BigInt(value);
    return value as bigint;
  }
  return value as number | bigint;
}

/**
 * Coerce a value for a bigint field for serialization (model → DB)
 * - For 'number' mode, store as number (or string if DB requires)
 * - For 'bigint' mode, store as string (to avoid JS BigInt issues with some drivers)
 */
export function serializeBigintFieldValue(
  value: unknown,
  field: FieldDefinition,
): number | string | null {
  const mode = field.columnOptions?.mode ?? 'number';
  if (value == null) return null;
  if (mode === 'number') {
    if (typeof value === 'bigint') {
      // Optionally: check for overflow here
      return Number(value);
    }
    if (typeof value === 'string' && /^\d+$/.test(value)) {
      return Number(value);
    }
    return value as number;
  }
  if (mode === 'bigint') {
    if (typeof value === 'bigint') return value.toString();
    if (typeof value === 'number') return BigInt(value).toString();
    if (typeof value === 'string' && /^\d+$/.test(value)) return value;
    return value as string;
  }
  return value as number | string;
}

/**
 * Serialize a row according to schema (for DB insert/update)
 */
export function serializeRow(
  row: Record<string, unknown>,
  schema: SchemaDefinition,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key in row) {
    const field = schema[key];
    if (field && field.type === 'bigint') {
      result[key] = serializeBigintFieldValue(row[key], field);
    } else {
      result[key] = row[key];
    }
  }
  return result;
}
