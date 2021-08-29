import sql from 'mssql';
import { UserService } from 'services/UserService';
import { User } from '../../models/User';
import { buildToSave, buildToSaveBatch } from './build';
import { Model, Statement } from './metadata';
import { exec, execBatch, query, queryOne, save } from './sql';

export const userModel: Model = {
  name: 'user',
  attributes: {
    id: {
      key: true,
      match: 'equal'
    },
    username: {
      match: 'contain'
    },
    email: {
    },
    phone: {
      default: '123',
    },
    dateOfBirth: {
      type: 'datetime',
      field: 'dateOfBirth'
    }
  }
};

export class SqlUserService implements UserService {
  constructor(private db: sql.ConnectionPool) {}
  all(): Promise<User[]> {
    return query<User>(this.db, 'select * from users');
  }
  load(id: string): Promise<User> {
    return queryOne(this.db, 'select * from users where id = @1', [id]);
  }
  insert(user: User): Promise<number> {
    const upSert = `if exists (select * from users where id = @1)
    update users set username = @2, email = @3, phone = @4, dateOfBirth = @5 where id = @1
    else
    insert into users (id, username, email, phone, dateOfBirth) values (@1, @2, @3, @4, @5)`;
    // const upSert2 = `MERGE users AS f
    // USING (SELECT @0 AS ID, @1 as USERNAME, @2 as EMAIL, @3 as PHONE, @4 as DATEOFBIRTH ) AS new_user
    // ON f.id = new_user.ID
    // WHEN MATCHED THEN
    //   UPDATE SET
    //   f.username = new_user.USERNAME,
    //   f.email = new_user.EMAIL,
    //   f.phone = new_user.PHONE,
    //   f.dateOfBirth = new_user.DATEOFBIRTH
    // WHEN NOT MATCHED THEN
    //   INSERT (id, username, email, phone, dateOfBirth)
    //   VALUES (new_user.ID, new_user.USERNAME, new_user.EMAIL, new_user.PHONE, new_user.DATEOFBIRTH);`;
    // return exec(this.db, upSert2,
    //  [user.id, user.username, user.email, user.phone, user.dateOfBirth])
    const arr = [
      {'id': 'ironman', 'username': 'tony.stark', 'email': 'tony.stark@gmail.com', 'phone': null, 'dateOfBirth': new Date('1963-03-25T00:00:00+07:00'), age: 1, active: true, version: 2},
      {'id': 'spiderman', 'username': 'peter.parker', 'email': null, 'phone': '0987654321', 'dateOfBirth': new Date('1962-08-25T00:00:00+07:00'), age: 15, active: false, version: 1},
      {'id': 'wolverine', 'username': 'james.howlett', 'email': 'james.howlett@gmail.com', 'phone': '0987654321', 'dateOfBirth': new Date('1974-11-16T00:00:00+07:00'), age: 20, active: true}
    ];
    const x = buildToSaveBatch(arr, 'users', userModel.attributes);
    return execBatch(this.db, x);
  }
  insertMany(users: User[]): Promise<number> {
    const q = `insert into users (id, username, email, dateOfBirth) values (@1, @2, @3, @4)`;
    const data: Statement[] = users.map(item => {
      return {
        query: q,
        params: [item.id, item.username, item.email, item.dateOfBirth]
      };
    });
    return execBatch(this.db, data, true);
  }
  update(user: User): Promise<number> {
    return exec(this.db, `update users set username=@2, email=@3, phone=@4, dateOfBirth=@5 where id = @1`,
     [user.id, user.username, user.email, user.phone, user.dateOfBirth]);
  }
  delete(id: string): Promise<number> {
    return exec(this.db, `delete from users where id = @1`, [id]);
  }
}
