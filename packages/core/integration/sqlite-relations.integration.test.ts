import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createORMContext } from '../src/context';
import { SqliteAdapter, SqliteConfig } from '../../sqlite/src/adapter';
import { defineSchema, InferAttrsFromSchema } from '../src/schema/schema';
import { string, bigint } from '../src/schema/fields';
import { createModel } from '../src/model/factory';
import { hasMany, belongsTo, defineRelations } from '../src/schema/relations';

/**
 * Integration test for User ↔ Post relations using in-memory SQLite and the ORM relation system.
 */
describe('ORM Integration: SQLite (in-memory) - Relations', () => {
  let orm: ReturnType<typeof createORMContext>;
  let adapter: SqliteAdapter;

  // Define schemas
  const userSchema = defineSchema({
    id: bigint().notNull().primary().build(),
    name: string().notNull().build(),
    email: string().notNull().build(),
  });
  const postSchema = defineSchema({
    id: bigint().notNull().primary().build(),
    userId: bigint().notNull().build(),
    title: string().notNull().build(),
    content: string().notNull().build(),
  });

  // Define models
  class User extends createModel<InferAttrsFromSchema<typeof userSchema>>({
    name: 'User',
    schema: userSchema,
  }) {
    relations = defineRelations(
      () => ({
        posts: hasMany(() => Post, { foreignKey: 'userId', localKey: 'id' }),
      }),
      this,
    );

    async getAllPostsBro() {
      return this.relations.posts();
    }
  }
  class Post extends createModel<InferAttrsFromSchema<typeof postSchema>>({
    name: 'Post',
    schema: postSchema,
  }) {
    relations = defineRelations(
      () => ({
        user: belongsTo(() => User, { foreignKey: 'userId', localKey: 'id' }),
      }),
      this,
    );
  }

  beforeEach(async () => {
    const config: SqliteConfig = { database: ':memory:' };
    adapter = new SqliteAdapter(config);
    orm = createORMContext({ db: adapter.getQueryEngine() });
    // --- MIGRATION HACK: create the tables manually ---
    const db = (adapter as any).db;
    await db.schema
      .createTable('users')
      .addColumn('id', 'integer', (col: any) => col.primaryKey().notNull())
      .addColumn('name', 'text', (col: any) => col.notNull())
      .addColumn('email', 'text', (col: any) => col.notNull())
      .execute();
    await db.schema
      .createTable('posts')
      .addColumn('id', 'integer', (col: any) => col.primaryKey().notNull())
      .addColumn('userId', 'integer', (col: any) => col.notNull())
      .addColumn('title', 'text', (col: any) => col.notNull())
      .addColumn('content', 'text', (col: any) => col.notNull())
      .execute();
  });

  afterEach(async () => {
    await adapter.disconnect();
  });

  it('should create users and posts, and query posts by user (relation API)', async () => {
    await orm.run(async () => {
      const user = await User.create({ id: 1, name: 'Alice', email: 'alice@example.com' });
      expect(user).toBeTruthy();
      await Post.create({ id: 1, userId: 1, title: 'Hello', content: 'World' });
      await Post.create({ id: 2, userId: 1, title: 'Second', content: 'Post' });
      // Query posts by user using relation accessor
      const userInstance = await User.findById(1);
      expect(userInstance).toBeTruthy();
      const posts = await userInstance!.relations.posts();
      expect(posts.length).toBe(2);
      expect(posts[0].userId).toBe(1);
      expect(posts[1].userId).toBe(1);
    });
  });

  it('should query user for a post (relation API)', async () => {
    await orm.run(async () => {
      await User.create({ id: 2, name: 'Bob', email: 'bob@example.com' });
      await Post.create({ id: 3, userId: 2, title: 'Bob Post', content: 'Content' });
      const post = await Post.findById(3);
      expect(post).toBeTruthy();
      const user = await post!.relations.user();
      expect(user).toBeTruthy();
      expect(user!.name).toBe('Bob');
    });
  });

  it('should delete a user and leave posts orphaned (no cascade)', async () => {
    await orm.run(async () => {
      await User.create({ id: 3, name: 'Carol', email: 'carol@example.com' });
      await Post.create({ id: 4, userId: 3, title: 'Carol Post', content: 'Content' });
      await User.delete(3);
      const user = await User.findById(3);
      expect(user).toBeNull();
      const post = await Post.findById(4);
      expect(post).toBeTruthy();
      expect(post!.userId).toBe(3);
      // Relation should return null since user is deleted
      const orphanedUser = await post!.relations.user();
      expect(orphanedUser).toBeNull();
    });
  });
});
