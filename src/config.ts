import sql from 'mssql';

export const db = new sql.ConnectionPool({
  user: 'sa',
  password: '123456',
  server: '100.114.203.235',
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


