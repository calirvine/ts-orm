/**
 * Error thrown when model validation fails.
 * @public
 * @extends Error
 * @property {string[]} issues - List of validation error messages
 * @property {string} code - Error code for programmatic handling ("VALIDATION_ERROR")
 * @example
 * throw new ValidationError(["name: is required", "email: is invalid"]);
 */
export class ValidationError extends Error {
  /** Error code for programmatic handling */
  code = 'VALIDATION_ERROR';
  /** List of validation error messages */
  issues: string[];

  constructor(issues: string[]) {
    super(`Validation failed: ${issues.join(', ')}`);
    this.name = 'ValidationError';
    this.issues = issues;
  }
}
