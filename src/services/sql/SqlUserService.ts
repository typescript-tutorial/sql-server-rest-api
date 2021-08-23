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
    // const upSert = `if exists (select * from users where id = @0)
    // update users set username = @1, email = @2, phone = @3, dateOfBirth = @4 where id = @0
    // else
    // insert into users (id, username, email, phone, dateOfBirth) values (@0, @1, @2, @3, @4)`;
    const upSert2 = `MERGE users AS f
    USING (SELECT @0 AS ID, @1 as USERNAME, @2 as EMAIL, @3 as PHONE, @4 as DATEOFBIRTH ) AS new_user
    ON f.id = new_user.ID
    WHEN MATCHED THEN
      UPDATE SET 
      f.username = new_user.USERNAME,
      f.email = new_user.EMAIL,
      f.phone = new_user.PHONE,
      f.dateOfBirth = new_user.DATEOFBIRTH
    WHEN NOT MATCHED THEN
      INSERT (id, username, email, phone, dateOfBirth)
      VALUES (new_user.ID, new_user.USERNAME, new_user.EMAIL, new_user.PHONE, new_user.DATEOFBIRTH);`;
    return exec(this.db, upSert2,
     [user.id, user.username, user.email, user.phone, user.dateOfBirth])
  }
  insertMany(users: User[]): Promise<number> {
    const query = `insert into users (id, username, email, dateOfBirth) values (@0, @1, @2, @3)`;
    let data: Statement[] = users.map(item => {
      return {
        query,
        args: [item.id, item.username, item.email, item.dateOfBirth]
      }
    });
    return execBatch(this.db, data, true);
  }
  update(user: User): Promise<number> {
    return exec(this.db, `update users set username=@1, email=@2, phone=@3, dateOfBirth=@4 where id = @0`,
     [user.id, user.username, user.email, user.phone, user.dateOfBirth]);
  }
  delete(id: string): Promise<number> {
    return exec(this.db, `delete from users where id = @0`, [id]);
  }
}
