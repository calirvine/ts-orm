/**
 * Core field types supported by the ORM
 */
export type FieldType =
  | 'string'
  | 'integer'
  | 'bigint'
  | 'float'
  | 'decimal'
  | 'boolean'
  | 'timestamp'
  | 'date'
  | 'time'
  | 'json';

/**
 * Field modifiers that can be applied to any field
 */
export type FieldModifier = 'unique' | 'nullable' | 'primary' | 'index';

/**
 * Base field definition interface
 */
export interface FieldDefinition {
  type: FieldType;
  modifiers: Set<FieldModifier>;
  defaultValue?: unknown;
  // Column name in the database (defaults to property name if not specified)
  columnName?: string;
  // Database specific options
  columnType?: string;
  columnOptions?: Record<string, unknown>;
}

/**
 * Schema definition is a record of field definitions
 */
export interface SchemaDefinition {
  [key: string]: FieldDefinition;
}

/**
 * Type for the result of field factory functions
 */
export type FieldFactoryResult<T extends FieldType> = {
  type: T;
  modifiers: Set<FieldModifier>;
  defaultValue?: unknown;
  columnName?: string;
  columnType?: string;
  columnOptions?: Record<string, unknown>;
};
