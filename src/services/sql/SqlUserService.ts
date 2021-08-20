import sql from 'mssql';
import { UserService } from 'services/UserService';
import { User } from '../../models/User';
import { Model, Statement } from './metadata';
import { exec, execBatch, query, queryOne } from './sql';

export const userModel: Model = {
  name: 'user',
  attributes: {
    userId: {
      key: true,
      type: 'integer',
      match: 'equal'
    },
    name: {
      match: 'contain'
    },
    email: {
    }
  }
};

export class SqlUserService implements UserService {
  constructor(private db: sql.ConnectionPool) {}
  all(): Promise<User[]> {
    return query<User>(this.db, 'select * from users');
  }
  load(id: string): Promise<User> {
    return queryOne(this.db, 'select * from users where id = @0', [id]);
  }
  insert(user: User): Promise<number> {
    const upSert = `if exists (select * from users where id = @0)
    update users set username = @1, email = @2, phone = @3, dateOfBirth = @4 where id = @0
    else
    insert into users (id, username, email, phone, dateOfBirth) values (@0, @1, @2, @3, @4)`;
    return exec(this.db, upSert,
     [user.id, user.username, user.email, user.phone, user.dateOfBirth]);
  }
  insertMany(users: User[]): Promise<number> {
    const query = `insert into users (id, username, email, dateOfBirth) values (@0, @1, @2, @3)`;
    let data: Statement[] = users.map(item => {
      return {
        query,
        args: [item.id, item.username, item.email, item.dateOfBirth]
      }
    });
    return execBatch(this.db, data);
  }
  update(user: User): Promise<number> {
    return exec(this.db, `update users set username=@1, email=@2, phone=@3, dateOfBirth=@4 where id = @0`,
     [user.id, user.username, user.email, user.phone, user.dateOfBirth]);
  }
  delete(id: string): Promise<number> {
    return exec(this.db, `delete from users where id = @0`, [id]);
  }
}
