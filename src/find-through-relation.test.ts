import {
  Entity,
  ManyToOne,
  MikroORM,
  PrimaryKey,
  Property,
  WrappedEntity,
} from '@mikro-orm/sqlite';

@Entity()
class User {
  @PrimaryKey()
  id!: number;

  @Property()
  name!: string;

  @Property({ unique: true })
  email!: string;
}

@Entity()
class Post {
  @PrimaryKey()
  id!: number;

  @Property()
  title!: string;

  @ManyToOne(() => User)
  author!: User;
}

let orm: MikroORM;

beforeEach(async () => {
  orm = await MikroORM.init({
    dbName: ':memory:',
    entities: [User, Post],
    debug: ['query', 'query-params'],
    allowGlobalContext: true, // only for testing
  });
  await orm.schema.refreshDatabase();
});

afterEach(async () => {
  await orm.close(true);
});

test('find through relation', async () => {
  const user = orm.em.create(User, { name: 'Foo', email: 'bar@example.com' });
  await orm.em.flush();
  const post = orm.em.create(Post, { title: 'Hello', author: user });
  await orm.em.flush();
  const userId = user.id,
    postId = post.id;
  orm.em.clear();

  const userEmailOnlyThroughPost = await orm.em.findOneOrFail(
    Post,
    { id: postId },
    { fields: ['author.email'] },
  );
  const userEmailOnly =
    userEmailOnlyThroughPost.author as typeof userEmailOnlyThroughPost.author & {
      __helper: WrappedEntity<User>;
    };

  expect(userEmailOnly.email).toBe('bar@example.com');
  expect(userEmailOnly.__helper.__loadedProperties.has('name')).toBe(false);

  const userNameOnly = await orm.em.findOneOrFail(
    User,
    { id: userId },
    { fields: ['name'] },
  );

  expect(userNameOnly.name).toBe('Foo');
});
