import sql from 'mssql';
import { ApplicationContext } from './context';
import { UserController } from './controllers/UserController';
import { SqlUserService } from './services/sql/SqlUserService';

export function createContext(db: sql.ConnectionPool): ApplicationContext {
  const userService = new SqlUserService(db);
  const userController = new UserController(userService);
  const ctx: ApplicationContext = { userController };
  return ctx;
}
