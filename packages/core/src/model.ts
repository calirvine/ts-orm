import type { SchemaDefinition } from './schema/types';
import type { RelationDefinition } from './schema/relations';

/**
 * Registry of all model classes
 */
const modelRegistry = new Map<string, typeof Model>();

/**
 * Base Model class that all models will extend
 */
export class Model {
  /**
   * The schema definition for this model
   */
  static schema: SchemaDefinition;

  /**
   * The relations definition for this model
   */
  static relations: Record<string, RelationDefinition>;

  /**
   * The table name for this model
   * Defaults to the lowercase, pluralized class name
   */
  static get tableName(): string {
    return this.name.toLowerCase() + 's';
  }

  /**
   * The primary key for this model
   * Defaults to 'id'
   */
  static get primaryKey(): string {
    return 'id';
  }

  /**
   * Creates a new model instance
   */
  constructor(attributes: Record<string, unknown> = {}) {
    Object.assign(this, attributes);
  }

  /**
   * Gets the model's attributes
   */
  getAttributes(): Record<string, unknown> {
    return this as unknown as Record<string, unknown>;
  }

  /**
   * Sets the model's attributes
   */
  setAttributes(attributes: Record<string, unknown>): void {
    Object.assign(this, attributes);
  }

  /**
   * Validates the model's attributes
   */
  validate(): string[] {
    return [];
  }

  /**
   * Gets a relation by name
   */
  getRelation(name: string):
    | (Omit<RelationDefinition, 'model' | 'localKey'> & {
        model: typeof Model;
        localKey: string | undefined;
      })
    | undefined {
    const relation = (this.constructor as typeof Model).relations[name];
    if (!relation) return undefined;

    // Resolve the model class
    let modelClass: typeof Model;
    if (typeof relation.model === 'string') {
      const resolvedModel = modelRegistry.get(relation.model);
      if (!resolvedModel) {
        throw new Error(`Model ${relation.model} not found in registry`);
      }
      modelClass = resolvedModel;
    } else {
      modelClass = relation.model();
    }

    const resolvedRelation = {
      ...relation,
      model: modelClass,
      localKey: typeof relation.localKey === 'function' ? relation.localKey() : relation.localKey,
    };

    return resolvedRelation;
  }

  /**
   * Gets all relations for this model
   */
  getRelations(): Record<string, Omit<RelationDefinition, 'model'> & { model: typeof Model }> {
    const relations = (this.constructor as typeof Model).relations;
    return Object.fromEntries(
      Object.entries(relations).map(([name, relation]) => {
        const modelClass =
          typeof relation.model === 'string' ? modelRegistry.get(relation.model) : relation.model();

        if (!modelClass) {
          throw new Error(
            `Model ${typeof relation.model === 'string' ? relation.model : 'unknown'} not found in registry`,
          );
        }

        return [
          name,
          {
            ...relation,
            model: modelClass,
          },
        ];
      }),
    );
  }
}

// Register a model class
export function registerModel(modelClass: typeof Model) {
  modelRegistry.set(modelClass.name, modelClass);
}
