import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'AGT_SMART_SY',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// ถ้าใช้ Windows Auth (ไม่มี user/pass)
if (process.env.DB_USER && process.env.DB_PASSWORD) {
  config.user = process.env.DB_USER;
  config.password = process.env.DB_PASSWORD;
  config.options!.trustedConnection = false;
} else {
  // Windows Authentication
  config.options!.trustedConnection = true;
}

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) {
    return pool;
  }
  try {
    pool = await sql.connect(config);
    console.log('✅ Connected to SQL Server:', process.env.DB_DATABASE);
    return pool;
  } catch (err) {
    console.error('❌ SQL Server connection failed:', err);
    throw err;
  }
}

export { sql };
