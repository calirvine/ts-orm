# Schema Definition Approach

## Overview

We considered three main approaches for schema definition to avoid circular dependencies:

1. Decorator-based approach
2. Factory pattern approach
3. Class Factory approach (Selected)

## Approach 1: Decorator-based

```typescript
const UserSchema = schema({
  name: string(),
  email: string().unique(),
  age: integer().nullable(),
  posts: hasMany(Post),
  profile: hasOne(Profile),
  roles: belongsToMany(Role).withPivot(['assigned_at']),
});

@model(UserSchema)
class User extends Model {
  // Model-specific methods and overrides
}
```

### Pros

- Clean separation between schema definition and model implementation
- Schema can be defined outside the class, avoiding circular dependencies
- Single decorator makes the intent very clear
- Schema can be reused across multiple models if needed
- Easier to implement schema validation and type checking at compile time
- More flexible for future extensions (e.g., adding validation decorators)

### Cons

- Requires decorator metadata to be enabled in TypeScript
- Some developers have strong preferences against decorators
- Additional build step might be required for proper decorator support
- Could be confusing for developers new to TypeScript
- Might complicate tree-shaking in some build setups

## Approach 2: Factory Pattern

```typescript
class User extends Model {
  static schema = defineSchema({
    name: string(),
    email: string().unique(),
    age: integer().nullable(),
  });

  static relations = defineRelations({
    posts: hasMany(Post),
    profile: hasOne(Profile),
    roles: belongsToMany(Role).withPivot(['assigned_at']),
  });
}
```

### Pros

- More familiar to developers coming from other ORMs
- No decorator metadata requirements
- Simpler build setup
- Clear static typing without decorator magic
- Easier to understand for developers new to TypeScript
- Better tree-shaking potential
- More explicit about what's happening

### Cons

- Schema and relations are tied to the class definition
- Could lead to more boilerplate in complex models
- Less flexible for schema reuse
- Might be harder to implement certain advanced features
- Could make it harder to implement certain types of validations

## Approach 3: Class Factory (Selected)

```typescript
import { StandardSchemaV1 } from '@standard-schema/spec';

const UserSchema = defineSchema({
  name: string(),
  email: string().unique(),
  age: integer().nullable(),
});

const UserRelations = defineRelations({
  posts: hasMany(Post),
  profile: hasOne(Profile),
  roles: belongsToMany(Role).withPivot(['assigned_at']),
});

const UserValidators: Record<keyof typeof UserSchema, StandardSchemaV1> = {
  name: {
    '~standard': {
      version: 1,
      vendor: 'orm',
      validate: (value: unknown) => {
        if (typeof value === 'string' && value.length >= 2) {
          return { value };
        }
        return { issues: [{ message: 'Name must be at least 2 characters' }] };
      },
      types: {
        input: string,
        output: string,
      },
    },
  },
  email: {
    '~standard': {
      version: 1,
      vendor: 'orm',
      validate: (value: unknown) => {
        if (typeof value === 'string' && /^[^@]+@[^@]+\.[^@]+$/.test(value)) {
          return { value };
        }
        return { issues: [{ message: 'Invalid email format' }] };
      },
      types: {
        input: string,
        output: string,
      },
    },
  },
  age: {
    '~standard': {
      version: 1,
      vendor: 'orm',
      validate: (value: unknown) => {
        if (value === null || (typeof value === 'number' && value >= 0)) {
          return { value };
        }
        return { issues: [{ message: 'Age must be null or a non-negative number' }] };
      },
      types: {
        input: number | null,
        output: number | null,
      },
    },
  },
};

class User extends createModel(UserSchema, UserRelations, UserValidators) {
  // Model-specific methods and overrides
}
```

### Implementation Details

The `createModel` function would look like:

```typescript
import { StandardSchemaV1 } from '@standard-schema/spec';

function createModel<
  T extends Schema,
  R extends Relations,
  V extends Record<keyof T, StandardSchemaV1> = {},
>(schema: T, relations: R, validators?: V) {
  return class extends BaseModel {
    static schema = schema;
    static relations = relations;
    static validators = validators;

    // Type-safe instance methods would be added here
    // Validation would be automatically applied on create/update
  };
}
```

### Pros

- Cleanest separation of concerns
- Most flexible for schema and relation reuse
- No decorators required
- Very explicit about model creation
- Could provide better type inference
- Easier to implement mixins and composition
- Clearer inheritance chain
- Better tree-shaking potential
- More explicit about what's happening at compile time
- Built-in validation support through optional third argument
- Type-safe validation through StandardSchema interface
- Validation can be reused across models
- Clear separation between schema definition and validation rules
- Uses official StandardSchema spec for validation
- Full type inference for input/output types
- Structured validation errors with paths and messages

### Cons

- Less familiar to developers coming from other ORMs
- Slightly more verbose syntax
- Might be harder to implement certain static methods
- Could be confusing for developers new to TypeScript class factories
- More complex validation setup due to StandardSchema requirements
