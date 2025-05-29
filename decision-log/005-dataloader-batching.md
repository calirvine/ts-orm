# Decision Log 005: DataLoader Batching for ORM

## Context

- The ORM is designed to optimize database access and minimize redundant queries.
- The goal is to add automatic batching and deduplication for repeated queries within a request, using a DataLoader pattern.

## Requirements

- Batch and deduplicate `findById` and `find(where)` calls with the same parameters within a request or transaction context.
- Maintain strict cache and transaction semantics:
  - Reads inside a transaction bypass the cache and DataLoader.
  - Cache is only invalidated on transaction commit.
  - Batching must not cross transaction boundaries.
- Public API for `findById` and `find(where)` must remain unchanged.
- Type safety and ESM compliance.

## Design Decisions

- **DataLoader Utility**: Implemented a minimal, type-safe DataLoader utility (no external deps) that batches loads within a tick and deduplicates keys.
- **Context Management**: DataLoader instances are stored in AsyncLocalStorage context, keyed by table and query parameters, and isolated per request/transaction.
- **Batching Logic**:
  - For `findById`, all calls with the same table and idField are batched and deduplicated.
  - For `find(where)`, all calls with the same table and deeply-equal `where` parameters are batched and deduplicated.
  - Stable keying is achieved using the existing `makeCacheKey` utility.
- **Cache Integration**:
  - Cache is checked before using DataLoader.
  - Results are cached after loading (if not in a transaction).
  - Cache keys are registered for granular invalidation.
- **Transaction Semantics**:
  - Inside a transaction, batching and cache are bypassed; all reads go directly to the DB.
  - DataLoader and cache are isolated per transaction context.

## API

- No changes to the public API for `findById`, `find(where)`, or model static methods.
- DataLoader is an internal optimization, not exposed publicly.

## Testing

- Unit tests cover:
  - Batching and deduplication for `findById` and `find(where)`
  - Cache and transaction semantics
  - Error propagation and edge cases
- Tests ensure that batching does not cross transaction boundaries and that cache is respected.

## Rationale

- This approach provides transparent batching and deduplication, improving performance for repeated queries without requiring API changes.
- The design maintains strict cache and transaction correctness, and is extensible for future batching needs.
