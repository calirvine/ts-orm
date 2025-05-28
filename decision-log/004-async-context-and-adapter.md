# Decision Log: AsyncLocalStorage, Repository, and Adapter Context Handling

**Date:** 2024-06-11

## Context

We are building a TypeScript ORM with support for transactions and context-aware database operations. We use Kysely as our query builder/ORM, and want to support seamless transaction propagation using AsyncLocalStorage (ALS).

## Decision

- **AsyncLocalStorage (ALS) is used at the repository/model layer only.**
- **The repository and model static methods always use `BaseModel.getCurrentDb()` to get the current Kysely instance (from ALS).**
- **The adapter always uses its own root Kysely instance (`this.db`).**
- **The adapter is not context-aware and does not know about ALS or transactions.**
- **All business logic and queries should go through the repository/model API, not the adapter directly.**

## Rationale

- **Separation of concerns:**
  - The adapter is a low-level utility for a single DB connection.
  - The repository/model layer is responsible for context propagation and transaction safety.
- **Transaction propagation:**
  - When inside `BaseModel.withTransaction`, ALS holds the transaction Kysely instance, so all repository/model calls use the transaction context.
  - Outside a transaction, ALS holds the root Kysely instance.
- **Testability and maintainability:**
  - The adapter is stateless and reusable.
  - The repository/model layer is responsible for context-awareness.

## Summary Table

| Layer        | How it gets DB instance    | Transaction-aware? |
| ------------ | -------------------------- | ------------------ |
| Adapter      | `this.db` (root Kysely)    | ❌ No              |
| Repository   | `BaseModel.getCurrentDb()` | ✅ Yes             |
| Model Static | Delegates to repository    | ✅ Yes             |

## Best Practices

- **Do not inject ALS into the adapter.**
- **Do not call `adapter.query` directly for business logic.**
- **Always use the repository/model API for queries, inserts, updates, and deletes.**
- **Use `BaseModel.withTransaction` to run code in a transaction context.**

## Example

```ts
await BaseModel.withTransaction(async () => {
  // ALS now holds the transaction Kysely instance
  await User.create({ ... }); // repository uses getCurrentDb() → transaction instance
});
```

## Alternatives Considered

- Making the adapter context-aware (rejected: violates separation of concerns, complicates adapter logic).
- Using global state for transaction context (rejected: not safe for concurrent requests).

## References

- [Kysely Docs: Transactions](https://kysely.dev/docs/recipes/transactions/)
- [Node.js AsyncLocalStorage](https://nodejs.org/api/async_hooks.html#class-asynclocalstorage)
