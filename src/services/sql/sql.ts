import sql from 'mssql';
import { buildToSave, buildToSaveBatch } from './build';
import { Attribute, Attributes, Manager, Statement, StringMap } from './metadata';

// tslint:disable-next-line:class-name
export class resource {
  static string?: boolean;
}
export class PoolManager implements Manager {
  constructor(public db: sql.ConnectionPool) {
    this.exec = this.exec.bind(this);
    this.execBatch = this.execBatch.bind(this);
    this.query = this.query.bind(this);
    this.queryOne = this.queryOne.bind(this);
    this.execScalar = this.execScalar.bind(this);
    this.count = this.count.bind(this);
  }
  exec(q: string, args?: any[]): Promise<number> {
    return exec(this.db, q, args);
  }
  execBatch(statements: Statement[], firstSuccess?: boolean): Promise<number> {
    return execBatch(this.db, statements, firstSuccess);
  }
  query<T>(q: string, args?: any[], m?: StringMap, fields?: Attribute[]): Promise<T[]> {
    return query(this.db, q, args, m, fields);
  }
  queryOne<T>(q: string, args?: any[], m?: StringMap, fields?: Attribute[]): Promise<T> {
    return queryOne(this.db, q, args, m, fields);
  }
  execScalar<T>(q: string, args?: any[]): Promise<T> {
    return execScalar<T>(this.db, q, args);
  }
  count(q: string, args?: any[]): Promise<number> {
    return count(this.db, q, args);
  }
}
export async function execBatch(db: sql.ConnectionPool, statements: Statement[], firstSuccess?: boolean): Promise<number> {
  if (!statements || statements.length === 0) {
    return Promise.resolve(0);
  } else if (statements.length === 1) {
    return exec(db, statements[0].query, statements[0].params);
  }
  let c = 0;
  const transaction = new sql.Transaction(db);
  if (firstSuccess) {
    try {
      const query0 = statements[0];
      const queries = statements.slice(1);
      const request = new sql.Request(transaction);
      await transaction.begin();
      request.parameters = {};
      setParameters(request, query0.params);
      const result1 = await request.query(query0.query);
      if (result1 && result1.rowsAffected[0] !== 0) {
        c += result1.rowsAffected[0];
        for (const q of queries) {
          request.parameters = {};
          setParameters(request, q.params);
          const result = await request.query(q.query);
          c += result.rowsAffected[0];
        }
      }
      await transaction.commit();
      return c;
    } catch (err) {
      buildError(err);
      await transaction.rollback();
      throw err;
    }
  } else {
    try {
      const request = new sql.Request(transaction);
      await transaction.begin();
      for (const item of statements) {
        request.parameters = {};
        setParameters(request, item.params);
        const result = await request.query(item.query);
        c += result.rowsAffected[0];
      }
      await transaction.commit();
      return c;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
}
function buildError(err: any): any {
  if (err.originalError && err.originalError.info) {
    const info = err.originalError.info;
    const m = info.message;
    if (m && typeof m === 'string' && m.startsWith('Violation of PRIMARY KEY constraint')) {
      err.error = 'duplicate';
    }
  }
  return err;
}
export function exec(db: sql.ConnectionPool, q: string, args?: any[]): Promise<number> {
  const request = db.request();
  setParameters(request, args);
  return request.query(q)
    .then(results => results.rowsAffected[0])
    .catch(err => {
      buildError(err);
      throw err;
    });
}
export function query<T>(db: sql.ConnectionPool, q: string, args?: any[], m?: StringMap, bools?: Attribute[]): Promise<T[]> {
  const request = db.request();
  setParameters(request, args);
  return request.query(q)
    .then(results => {
      return handleResults(results.recordset, m, bools);
    });
}

export function queryOne<T>(db: sql.ConnectionPool, q: string, args?: any[], m?: StringMap, bools?: Attribute[]): Promise<T> {
  return query<T[]>(db, q, args, m, bools)
    .then(results => {
      if (results && results.length > 0) {
        return results[0] as any;
      } else {
        return null;
      }
    }).catch(err => {
      throw err;
    });
}
export function execScalar<T>(db: sql.ConnectionPool, q: string, args?: any[]): Promise<T> {
  return queryOne<T>(db, q, args).then(r => {
    if (!r) {
      return null;
    } else {
      const keys = Object.keys(r);
      return r[keys[0]];
    }
  });
}
export function count(db: sql.ConnectionPool, q: string, args?: any[]): Promise<number> {
  return execScalar<number>(db, q, args);
}
export function save<T>(db: sql.ConnectionPool|((sql: string, args?: any[]) => Promise<number>), obj: T, table: string, attrs: Attributes, ver?: string, buildParam?: (i: number) => string, i?: number): Promise<number> {
  const stm = buildToSave(obj, table, attrs, ver, buildParam, null, i);
  if (!stm) {
    return Promise.resolve(0);
  } else {
    if (typeof db === 'function') {
      return db(stm.query, stm.params);
    } else {
      return exec(db, stm.query, stm.params);
    }
  }
}
export function saveBatch<T>(db: sql.ConnectionPool|((statements: Statement[]) => Promise<number>), objs: T[], table: string, attrs: Attributes, ver?: string, buildParam?: (i: number) => string): Promise<number> {
  const stmts = buildToSaveBatch(objs, table, attrs, ver, buildParam);
  if (!stmts || stmts.length === 0) {
    return Promise.resolve(0);
  } else {
    if (typeof db === 'function') {
      return db(stmts);
    } else {
      return execBatch(db, stmts);
    }
  }
}
export function setParameters(request: sql.Request, args?: any[]): void {
  if (args && args.length > 0) {
    const l = args.length;
    for (let i = 0; i < l; i++) {
      const j = i + 1;
      if (args[i] === undefined || args[i] == null) {
        request.input(`${j}`, null);
      } else {
        if (typeof args[i] === 'object') {
          if (args[i] instanceof Date) {
            request.input(`${j}`, args[i]);
          } else {
            if (resource.string) {
              const s: string = JSON.stringify(args[i]);
              request.input(`${j}`, s);
            } else {
              request.input(`${j}`, args[i]);
            }
          }
        } else {
          request.input(`${j}`, args[i]);
        }
      }
    }
  }
}
export function toArray(arr: any[]): any[] {
  if (!arr || arr.length === 0) {
    return [];
  }
  const p: any[] = [];
  const l = arr.length;
  for (let i = 0; i < l; i++) {
    if (arr[i] === undefined || arr[i] == null) {
      p.push(null);
    } else {
      if (typeof arr[i] === 'object') {
        if (arr[i] instanceof Date) {
          p.push(arr[i]);
        } else {
          if (resource.string) {
            const s: string = JSON.stringify(arr[i]);
            p.push(s);
          } else {
            p.push(arr[i]);
          }
        }
      } else {
        p.push(arr[i]);
      }
    }
  }
  return p;
}
export function handleResult<T>(r: T, m?: StringMap, bools?: Attribute[]): T {
  if (r == null || r === undefined || (!m && (!bools || bools.length === 0))) {
    return r;
  }
  handleResults([r], m, bools);
  return r;
}
export function handleResults<T>(r: T[], m?: StringMap, bools?: Attribute[]): T[] {
  if (m) {
    const res = mapArray(r, m);
    if (bools && bools.length > 0) {
      return handleBool(res, bools);
    } else {
      return res;
    }
  } else {
    if (bools && bools.length > 0) {
      return handleBool(r, bools);
    } else {
      return r;
    }
  }
}
export function handleBool<T>(objs: T[], bools: Attribute[]): T[] {
  if (!bools || bools.length === 0 || !objs) {
    return objs;
  }
  for (const obj of objs) {
    for (const field of bools) {
      const v = obj[field.name];
      if (typeof v !== 'boolean' && v != null && v !== undefined) {
        const b = field.true;
        if (b == null || b === undefined) {
          // tslint:disable-next-line:triple-equals
          obj[field.name] = ('1' == v || 'T' == v || 'Y' == v || 'ON' == v);
        } else {
          // tslint:disable-next-line:triple-equals
          obj[field.name] = (v == b ? true : false);
        }
      }
    }
  }
  return objs;
}
export function map<T>(obj: T, m?: StringMap): any {
  if (!m) {
    return obj;
  }
  const mkeys = Object.keys(m);
  if (mkeys.length === 0) {
    return obj;
  }
  const obj2: any = {};
  const keys = Object.keys(obj);
  for (const key of keys) {
    let k0 = m[key];
    if (!k0) {
      k0 = key;
    }
    obj2[k0] = obj[key];
  }
  return obj2;
}
export function mapArray<T>(results: T[], m?: StringMap): T[] {
  if (!m) {
    return results;
  }
  const mkeys = Object.keys(m);
  if (mkeys.length === 0) {
    return results;
  }
  const objs = [];
  const length = results.length;
  for (let i = 0; i < length; i++) {
    const obj = results[i];
    const obj2: any = {};
    const keys = Object.keys(obj);
    for (const key of keys) {
      let k0 = m[key];
      if (!k0) {
        k0 = key;
      }
      obj2[k0] = (obj as any)[key];
    }
    objs.push(obj2);
  }
  return objs;
}
export function getFields(fields: string[], all?: string[]): string[] {
  if (!fields || fields.length === 0) {
    return undefined;
  }
  const ext: string[] = [];
  if (all) {
    for (const s of fields) {
      if (all.includes(s)) {
        ext.push(s);
      }
    }
    if (ext.length === 0) {
      return undefined;
    } else {
      return ext;
    }
  } else {
    return fields;
  }
}
export function buildFields(fields: string[], all?: string[]): string {
  const s = getFields(fields, all);
  if (!s || s.length === 0) {
    return '*';
  } else {
    return s.join(',');
  }
}
export function getMapField(name: string, mp?: StringMap): string {
  if (!mp) {
    return name;
  }
  const x = mp[name];
  if (!x) {
    return name;
  }
  if (typeof x === 'string') {
    return x;
  }
  return name;
}
export function isEmpty(s: string): boolean {
  return !(s && s.length > 0);
}
export function version(attrs: Attributes): Attribute {
  const ks = Object.keys(attrs);
  for (const k of ks) {
    const attr = attrs[k];
    if (attr.version) {
      attr.name = k;
      return attr;
    }
  }
  return undefined;
}
// tslint:disable-next-line:max-classes-per-file
export class SQLWriter<T> {
  db?: sql.ConnectionPool;
  exec?: (sql: string, args?: any[]) => Promise<number>;
  map?: (v: T) => T;
  param?: (i: number) => string;
  version?: string;
  constructor(db: sql.ConnectionPool | ((sql: string, args?: any[]) => Promise<number>), public table: string, public attributes: Attributes, toDB?: (v: T) => T, buildParam?: (i: number) => string, ver?: string) {
    this.write = this.write.bind(this);
    if (typeof db === 'function') {
      this.exec = db;
    } else {
      this.db = db;
    }
    this.param = buildParam;
    this.map = toDB;
    if (ver && ver.length > 0) {
      this.version = ver;
    } else {
      const x = version(this.attributes);
      if (x) {
        this.version = x.name;
      }
    }
  }
  write(obj: T): Promise<number> {
    if (!obj) {
      return Promise.resolve(0);
    }
    let obj2 = obj;
    if (this.map) {
      obj2 = this.map(obj);
    }
    const stmt = buildToSave(obj2, this.table, this.attributes, this.version, this.param);
    if (stmt) {
      if (this.exec) {
        return this.exec(stmt.query, stmt.params);
      } else {
        return exec(this.db, stmt.query, stmt.params);
      }
    } else {
      return Promise.resolve(0);
    }
  }
}
// tslint:disable-next-line:max-classes-per-file
export class SQLBatchWriter<T> {
  pool?: sql.ConnectionPool;
  version?: string;
  execute?: (statements: Statement[]) => Promise<number>;
  map?: (v: T) => T;
  param?: (i: number) => string;
  constructor(db: sql.ConnectionPool | ((statements: Statement[]) => Promise<number>), public table: string, public attributes: Attributes, toDB?: (v: T) => T, buildParam?: (i: number) => string, ver?: string) {
    this.write = this.write.bind(this);
    if (typeof db === 'function') {
      this.execute = db;
    } else {
      this.pool = db;
    }
    this.param = buildParam;
    this.map = toDB;
    if (ver && ver.length > 0) {
      this.version = ver;
    } else {
      const x = version(this.attributes);
      if (x) {
        this.version = x.name;
      }
    }
  }
  write(objs: T[]): Promise<number> {
    if (!objs || objs.length === 0) {
      return Promise.resolve(0);
    }
    let list = objs;
    if (this.map) {
      list = [];
      for (const obj of objs) {
        const obj2 = this.map(obj);
        list.push(obj2);
      }
    }
    const stmts = buildToSaveBatch(list, this.table, this.attributes, this.version, this.param);
    if (stmts && stmts.length > 0) {
      if (this.execute) {
        return this.execute(stmts);
      } else {
        return execBatch(this.pool, stmts);
      }
    } else {
      return Promise.resolve(0);
    }
  }
}

export interface AnyMap {
  [key: string]: any;
}
// tslint:disable-next-line:max-classes-per-file
export class SQLChecker {
  constructor(private db: sql.ConnectionPool, private service?: string, private timeout?: number) {
    if (!this.timeout) {
      this.timeout = 4200;
    }
    if (!this.service) {
      this.service = 'sqlite';
    }
    this.check = this.check.bind(this);
    this.name = this.name.bind(this);
    this.build = this.build.bind(this);
  }
  check(): Promise<AnyMap> {
    const obj = {} as AnyMap;
    const request = this.db.request();
    const promise = request.query('select getdate();')
      .then(results => results.recordset);
    if (this.timeout > 0) {
      return promiseTimeOut(this.timeout, promise);
    } else {
      return promise;
    }
  }
  name(): string {
    return this.service;
  }
  build(data: AnyMap, err: any): AnyMap {
    if (err) {
      if (!data) {
        data = {} as AnyMap;
      }
      data['error'] = err;
    }
    return data;
  }
}

function promiseTimeOut(timeoutInMilliseconds: number, promise: Promise<any>): Promise<any> {
  return Promise.race([
    promise,
    new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(`Timed out in: ${timeoutInMilliseconds} milliseconds!`);
      }, timeoutInMilliseconds);
    })
  ]);
}
