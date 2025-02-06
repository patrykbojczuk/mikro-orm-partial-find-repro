import {
  Entity,
  ManyToOne,
  MikroORM,
  PrimaryKey,
  Property,
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

// doesn't work
test('find through relation > direct find', async () => {
  const user = orm.em.create(User, { name: 'Foo', email: 'bar@example.com' });
  await orm.em.flush();
  const post = orm.em.create(Post, { title: 'Hello', author: user });
  await orm.em.flush();
  const userId = user.id,
    postId = post.id;
  orm.em.clear();

  const userEmailOnly = await orm.em.findOneOrFail(
    Post,
    { id: postId },
    { fields: ['author.email'] },
  );

  const userNameOnly = await orm.em.findOneOrFail(
    User,
    { id: userId },
    { fields: ['name'] },
  );

  expect(userEmailOnly.author.email).toBe('bar@example.com');
  expect(userNameOnly.name).toBe('Foo');
});

// works
test.skip('direct find > find through relation', async () => {
  const user = orm.em.create(User, { name: 'Foo', email: 'bar@example.com' });
  await orm.em.flush();
  const post = orm.em.create(Post, { title: 'Hello', author: user });
  await orm.em.flush();
  const userId = user.id,
    postId = post.id;
  orm.em.clear();

  const userNameOnly = await orm.em.findOneOrFail(
    User,
    { id: userId },
    { fields: ['name'] },
  );

  const userEmailOnly = await orm.em.findOneOrFail(
    Post,
    { id: postId },
    { fields: ['author.email'] },
  );

  expect(userEmailOnly.author.email).toBe('bar@example.com');
  expect(userNameOnly.name).toBe('Foo');
});

// works
test.skip('direct find > direct find', async () => {
  const user = orm.em.create(User, { name: 'Foo', email: 'bar@example.com' });
  await orm.em.flush();
  const userId = user.id;
  orm.em.clear();

  const userEmailOnly = await orm.em.findOneOrFail(
    User,
    { id: userId },
    { fields: ['email'] },
  );

  const userNameOnly = await orm.em.findOneOrFail(
    User,
    { id: userId },
    { fields: ['name'] },
  );

  expect(userEmailOnly.email).toBe('bar@example.com');
  expect(userNameOnly.name).toBe('Foo');
});
