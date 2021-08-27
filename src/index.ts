import { json } from 'body-parser';
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import { createContext } from './init';
import { route } from './route';
import sql from 'mssql';

dotenv.config();

const app = express();

const port = process.env.PORT;

app.use(json());

export const db = new sql.ConnectionPool({
  user: 'sa',
  password: '123456',
  server: '100.111.180.232',
  database: 'masterdata',
  port: 1466,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    trustServerCertificate: true,
    trustedConnection: true,
    encrypt: true,
    enableArithAbort: true,
  },
})

db.connect().then(() =>{
  const ctx = createContext(db);
  route(app, ctx);
  http.createServer(app).listen(port, () => {
    console.log('Start server at port ' + port);
  });
  console.log('Connect SQL Server Successful!!!')
}).catch(e => {
  console.error('Failed to connect to SQL Server.', e.message, e.stack);
});
