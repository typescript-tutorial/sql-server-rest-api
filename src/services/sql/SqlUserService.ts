import { db } from '../../config';
import {User} from '../../models/User';
import { UserService } from 'services/UserService';
import sql from 'mssql';

export class SqlUserService implements UserService  {
  constructor() {
  }
  all(): Promise<User[]> {
    return new Promise<User[]>(async(resolve, reject) => {
      db.request().query('select * from users')
      .then(results => resolve(results.recordset))
      .catch(err => reject(err));
    });
  }
  load(id: string): Promise<User> {
    return new Promise<User>((resolve, reject) => {
      db.request().input('id', id).query('select * from users where id = @id')
      .then(results => resolve(results.recordset[0]))
      .catch(err => reject(err));
    });
  }
  insert(user: User): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      db.request()
      .input('id', user.id)
      .input('username', user.username)
      .input('email',  user.email)
      .input('phone', user.phone)
      .input('dateOfBirth', user.dateOfBirth)
      .query(`insert into users (id, username, email, phone, dateOfBirth) values (@id, @username, @email, @phone, @dateOfBirth)`)
      .then((result)=> resolve(result.rowsAffected[0]))
      .catch(err =>{
        console.log(err);
        reject(err)});
    });
  }
  update(user: User): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      db.request()
      .input('id', user.id)
      .input('username', user.username)
      .input('email',  user.email)
      .input('phone', user.phone)
      .input('dateOfBirth', user.dateOfBirth)
      .query(`update users set username= @username, email= @email, phone=@phone, dateOfBirth= @dateOfBirth where id= @id`)
      .then((result)=> resolve(result.rowsAffected[0]))
      .catch(err =>{
        console.log(err);
        reject(err)});
    });
  }
  delete(id: string): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      db.request()
      .input('id', id)
      .query('delete from users where id = @id')
      .then(results => resolve(results.rowsAffected[0]))
      .catch(err => reject(err));
    });
  }
  async transaction(user: User[]): Promise<number> {
    const transaction = new sql.Transaction(db)
    try{
      const request = new sql.Request(transaction);
      await transaction.begin();
      for(let item of user){
        await request.query(`insert into users (id, username, email) values ('${item.id}', '${item.username}','${item.email}')`);
      }
      await transaction.commit();
      return 1;
    }
    catch(err) {
      await transaction.rollback();
      return err;
    }
  }
}
