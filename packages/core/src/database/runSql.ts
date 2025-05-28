import { sql } from 'kysely';
import { BaseModel } from '../model/BaseModel';

export async function runSql<T = unknown>(strings: TemplateStringsArray, ...params: unknown[]) {
  const db = BaseModel.getCurrentDb();
  if (!db) throw new Error('No database context available');
  return sql<T>(strings, ...params).execute(db);
}
