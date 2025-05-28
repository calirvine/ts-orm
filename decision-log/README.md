# ORM Decision Log

This directory contains the architectural decisions and design choices made for the ORM project. Each decision is documented in its own file for better organization and maintainability.

## Decisions

1. [Schema Definition System](001-schema-definition-system.md)

   - **Summary:** Defines the core types and interfaces for schema definition, including field type factories and modifiers. Establishes a strategy for mapping schema definitions to database columns, ensuring type safety and extensibility for future field types and database features.

2. [Schema Definition Approach](002-schema-definition-approach.md)

   - **Summary:** Evaluates three approaches for schema definition: decorator-based, factory pattern, and class factory. Selects the class factory approach for its balance of type safety, flexibility, and developer ergonomics. Documents the pros and cons of each approach and details the chosen implementation.

3. [Database Layer Architecture](003-database-layer-architecture.md)
   - **Summary:** Establishes a database abstraction layer using the adapter pattern, with a consistent interface for all database operations. Adapters are stateless and not context-aware; all context-awareness and transaction propagation are handled at the repository/model layer using AsyncLocalStorage (ALS). All business logic and queries should go through the repository/model API, not the adapter directly. Kysely is used as the query builder for type-safe, database-agnostic SQL generation.

## Purpose

This decision log serves as a historical record of architectural decisions and their rationale. It helps:

- Document the reasoning behind key design choices
- Provide context for future development
- Guide new team members
- Maintain consistency in the codebase

## Contributing

When making new architectural decisions:

1. Create a new numbered file in this directory
2. Follow the existing format
3. Update this README to include the new decision
4. Include code examples where relevant
5. Document pros and cons of alternatives considered
