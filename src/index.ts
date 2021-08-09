import {json} from 'body-parser';
import { db } from './config';
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import {createContext} from './init';
import {route} from './route';

dotenv.config();

const app = express();
const port = process.env.PORT;

app.use(json());

db.connect()
.then(() => {
  const ctx = createContext();
  route(app, ctx);
  http.createServer(app).listen(port, () => {
    console.log('Start server at port ' + port);
  });
  console.log('Connect SQL Server Successful!!!')
})
.catch(err => console.log(err))


