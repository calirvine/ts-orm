# Database Layer Architecture

## Decision

We will implement a database abstraction layer with adapters for each supported database. This approach provides several benefits:

1. Clear separation of concerns between database-specific and database-agnostic code
2. Easy addition of new database support through new adapter implementations
3. Consistent interface for all database operations
4. Ability to implement database-specific optimizations where needed

## Implementation

The core interface will look like:

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
```

## Query Builder Strategy

For the query builder strategy, we will:

1. Build our own query builder that generates database-agnostic SQL
2. Have each adapter translate the query builder output to specific database dialects

This gives us full control over the API while maintaining database compatibility.

## Context

This ORM aims to bring the developer experience and feature richness of ActiveRecord/Eloquent to TypeScript, with a strong focus on:

- Ergonomic schema definition API
- Rich base class functionality
- Comprehensive relation support
- Automatic many-to-many join tables with metadata
- Perfect TypeScript integration
