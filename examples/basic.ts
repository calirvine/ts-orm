import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import { createModel } from '../packages/core/src/model/factory';
import { BaseModel } from '../packages/core/src/model/BaseModel';
import { defineSchema, InferAttrsFromSchema } from '../packages/core/src/schema/schema';
import { string, bigint } from '../packages/core/src/schema/fields';
import { createORMContext } from '../packages/core/src/context';

// 1. Setup Kysely instance for SQLite (in-memory for demo)
const db = new Kysely({
  dialect: new SqliteDialect({
    database: new Database(':memory:'),
  }),
});

// 2. Define a User schema using field builders
const UserSchema = defineSchema({
  id: bigint().notNull().primary().build(),
  name: string().notNull().build(),
  email: string().notNull().build(),
});

type UserAttrs = InferAttrsFromSchema<typeof UserSchema>;

const UserBase = createModel<UserAttrs>({
  name: 'User',
  schema: UserSchema,
});

class User extends UserBase {
  static findByEmail(email: string) {
    return this.find({ email });
  }
}

async function main() {
  // 3. Set up ORM context for this script
  const orm = createORMContext({ db });
  await orm.run(async () => {
    // 4. Create table (raw for demo)
    await db.schema
      .createTable('users')
      .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
      .addColumn('name', 'text')
      .addColumn('email', 'text')
      .execute();

    // 5. Insert a user
    const alice = await User.create({
      name: 'Alice',
      email: 'alice@example.com',
    });

    console.log('Created user:', alice);

    // 6. Query users
    const users = await User.find();
    console.log('All users:', users);

    // 7. Use a transaction
    await BaseModel.withTransaction(async () => {
      await User.create({ name: 'Bob', email: 'bob@example.com' });
      const all = await User.find();
      console.log('Users in transaction:', all);
      // throw new Error('Rollback!'); // Uncomment to test rollback
    });
    const after = await User.find();
    console.log('All users after transaction:', after);
  });
  await db.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
