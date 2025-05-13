# Schema Definition System

## Requirements

The schema definition system needs to:

1. Create type-safe schema definitions
2. Support common field types (string, integer, etc.)
3. Support field modifiers (unique, nullable, etc.)
4. Generate appropriate database column definitions
5. Work well with the StandardSchema validation system

## Implementation

```typescript
// Core types
type FieldType =
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

type FieldModifier = 'unique' | 'nullable' | 'primary' | 'index';

interface FieldDefinition {
  type: FieldType;
  modifiers: Set<FieldModifier>;
  defaultValue?: unknown;
  // Database specific options
  columnType?: string;
  columnOptions?: Record<string, unknown>;
}

interface SchemaDefinition {
  [key: string]: FieldDefinition;
}

// Field type factories
function string() {
  return {
    type: 'string' as const,
    modifiers: new Set<FieldModifier>(),
  };
}

// Simple numeric types for common use cases
function integer() {
  return {
    type: 'integer' as const,
    modifiers: new Set<FieldModifier>(),
  };
}

function bigint() {
  return {
    type: 'bigint' as const,
    modifiers: new Set<FieldModifier>(),
  };
}

function float() {
  return {
    type: 'float' as const,
    modifiers: new Set<FieldModifier>(),
  };
}

// Precise numeric types for when accuracy matters
function decimal(precision: number, scale: number) {
  return {
    type: 'decimal' as const,
    modifiers: new Set<FieldModifier>(),
    columnOptions: { precision, scale },
  };
}

// Date/Time specific factories
function timestamp() {
  return {
    type: 'timestamp' as const,
    modifiers: new Set<FieldModifier>(),
  };
}

function date() {
  return {
    type: 'date' as const,
    modifiers: new Set<FieldModifier>(),
  };
}

function time() {
  return {
    type: 'time' as const,
    modifiers: new Set<FieldModifier>(),
  };
}

// Field modifiers
function unique<T extends FieldDefinition>(field: T): T {
  field.modifiers.add('unique');
  return field;
}

function nullable<T extends FieldDefinition>(field: T): T {
  field.modifiers.add('nullable');
  return field;
}

// Schema factory
function defineSchema<T extends SchemaDefinition>(schema: T): T {
  return schema;
}
```

## Usage Examples

```typescript
const UserSchema = defineSchema({
  id: unique(bigint()), // Auto-incrementing ID
  name: string(),
  email: unique(string()),
  age: nullable(integer()),
  createdAt: timestamp(),
  updatedAt: timestamp(),
  lastLoginAt: nullable(timestamp()),
  birthDate: date(),
  preferredNotificationTime: time(),
});

const ProductSchema = defineSchema({
  id: unique(bigint()),
  name: string(),
  price: decimal(10, 2), // Price with 2 decimal places
  weight: float(), // Approximate weight in kg
  stock: integer(), // Number of items in stock
  rating: decimal(3, 2), // Rating from 0.00 to 9.99
  discount: nullable(decimal(5, 2)), // Optional discount percentage
});
```

## Design Benefits

1. Provides type-safe field definitions
2. Allows for chaining modifiers
3. Separates field type from database column type
4. Makes it easy to add new field types and modifiers
5. Keeps the API simple and intuitive
6. Uses semantic types for dates and times
7. Distinguishes between integer and bigint for better database compatibility
8. Offers both simple and precise numeric types
9. Provides sensible defaults for common use cases

## Database Mapping

Each database adapter will be responsible for mapping these semantic types to appropriate database column types. For example:

- PostgreSQL might map:
  - `bigint()` to `BIGINT`
  - `integer()` to `INTEGER`
  - `float()` to `REAL`
  - `decimal(10, 2)` to `DECIMAL(10, 2)`
  - `timestamp()` to `TIMESTAMP WITH TIME ZONE`
- MySQL might map:
  - `bigint()` to `BIGINT`
  - `integer()` to `INT`
  - `float()` to `FLOAT`
  - `decimal(10, 2)` to `DECIMAL(10, 2)`
  - `timestamp()` to `DATETIME`
- SQLite might map:
  - `bigint()` to `INTEGER`
  - `integer()` to `INTEGER`
  - `float()` to `REAL`
  - `decimal(10, 2)` to `TEXT` (stored as string)
  - `timestamp()` to `TEXT` with ISO format
