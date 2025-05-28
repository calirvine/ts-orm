# Database Layer Architecture

## Decision

We will implement a database abstraction layer with adapters for each supported database. This approach provides several benefits:

1. Clear separation of concerns between database-specific and database-agnostic code
2. Easy addition of new database support through new adapter implementations
3. Consistent interface for all database operations
4. Ability to implement database-specific optimizations where needed
5. **Context-awareness and transaction propagation are handled at the repository/model layer using AsyncLocalStorage (ALS), not in the adapter.**

## Implementation

The core interface looks like:

```typescript
interface DatabaseAdapter {
  query<T>(sql: string, params: any[]): Promise<T[]>;
  transaction<T>(callback: (trx: Transaction) => Promise<T>): Promise<T>;
  // ... other common operations
}

class PostgresAdapter implements DatabaseAdapter {
  // PostgreSQL specific implementation
}

class MySQLAdapter implements DatabaseAdapter {
  // MySQL specific implementation
}

class SqliteAdapter implements DatabaseAdapter {
  // SQLite specific implementation
}
```

## Query Builder Strategy

We use [Kysely](https://kysely.dev/) as our query builder, which provides type-safe, database-agnostic SQL generation and dialect support. All queries, inserts, updates, and deletes should go through the repository/model API, which uses the current Kysely instance from ALS for context-aware operations.

## Context and Transaction Propagation

- **Adapters are stateless and always use their own root Kysely instance.**
- **Repositories and model static methods use `BaseModel.getCurrentDb()` to get the current Kysely instance from ALS.**
- **Transaction context is propagated using `BaseModel.withTransaction`, which sets the transaction Kysely instance in ALS for the duration of the callback.**
- **All business logic and queries should go through the repository/model API, not the adapter directly.**

### Summary Table

| Layer        | How it gets DB instance    | Transaction-aware? |
| ------------ | -------------------------- | ------------------ |
| Adapter      | `this.db` (root Kysely)    | ❌ No              |
| Repository   | `BaseModel.getCurrentDb()` | ✅ Yes             |
| Model Static | Delegates to repository    | ✅ Yes             |

## Context

This ORM aims to bring the developer experience and feature richness of ActiveRecord/Eloquent to TypeScript, with a strong focus on:

- Ergonomic schema definition API
- Rich base class functionality
- Comprehensive relation support
- Automatic many-to-many join tables with metadata
- Perfect TypeScript integration

## References

- See also: [2024-06-11-async-context-and-adapter.md](./2024-06-11-async-context-and-adapter.md)
