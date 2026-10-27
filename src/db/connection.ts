import pg from 'pg';
import { config } from '../config/index.js';

const { Pool, Client } = pg;

let poolInstance: pg.Pool | null = null;

function createPoolConfig(): pg.PoolConfig {
  if (config.databaseUrl) {
    return { connectionString: config.databaseUrl };
  }
  return {
    host: config.dbHost,
    port: config.dbPort,
    user: config.dbUser,
    password: config.dbPassword,
    database: config.dbName,
  };
}

export function getPool(): pg.Pool {
  if (!poolInstance) {
    poolInstance = new Pool(createPoolConfig());
    poolInstance.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });
  }
  return poolInstance;
}

/**
 * Attempts to ensure target database exists.
 * If target database does not exist, connects to the default 'postgres' db and creates it.
 */
async function ensureDatabaseExists(): Promise<void> {
  const targetDbName = config.databaseUrl
    ? new URL(config.databaseUrl).pathname.replace(/^\//, '')
    : config.dbName;

  if (!targetDbName) return;

  const testPool = new Pool(createPoolConfig());
  try {
    const client = await testPool.connect();
    client.release();
    await testPool.end();
  } catch (err: unknown) {
    await testPool.end().catch(() => {});
    const pgErr = err as { code?: string; message?: string };
    // 3D000: database does not exist
    if (pgErr.code === '3D000') {
      console.log(`Database '${targetDbName}' not found. Creating database...`);
      const adminClient = new Client(
        config.databaseUrl
          ? {
              connectionString: config.databaseUrl.replace(
                new RegExp(`/${targetDbName}(\\?.*)?$`),
                '/postgres$1'
              ),
            }
          : {
              host: config.dbHost,
              port: config.dbPort,
              user: config.dbUser,
              password: config.dbPassword,
              database: 'postgres',
            }
      );
      await adminClient.connect();
      try {
        // Sanitize database name identifier
        const safeDbName = targetDbName.replace(/[^a-zA-Z0-9_]/g, '');
        await adminClient.query(`CREATE DATABASE "${safeDbName}"`);
        console.log(`Database '${safeDbName}' created successfully.`);
      } finally {
        await adminClient.end();
      }
    } else {
      throw err;
    }
  }
}

export async function initDatabase(): Promise<pg.Pool> {
  if (poolInstance) {
    try {
      await poolInstance.end();
    } catch {
      // Ignore
    }
    poolInstance = null;
  }

  // Ensure database exists
  await ensureDatabaseExists();

  const pool = getPool();
  const client = await pool.connect();

  try {
    // Create tables, constraints, and indexes
    await client.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name VARCHAR(255) NOT NULL CHECK(length(trim(name)) > 0),
        balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK(balance >= 0.00),
        created_at TIMESTAMPTZ NOT NULL
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        type VARCHAR(10) NOT NULL CHECK(type IN ('credit', 'debit')),
        amount NUMERIC(15, 2) NOT NULL CHECK(amount > 0.00),
        description TEXT NOT NULL DEFAULT '',
        reference_id TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
        UNIQUE(account_id, reference_id)
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_account_created
      ON transactions(account_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS transfers (
        id TEXT PRIMARY KEY,
        source_account_id TEXT NOT NULL,
        destination_account_id TEXT NOT NULL,
        amount NUMERIC(15, 2) NOT NULL CHECK(amount > 0.00),
        reference_id TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL DEFAULT '',
        source_transaction_id TEXT NOT NULL,
        destination_transaction_id TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        FOREIGN KEY (source_account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
        FOREIGN KEY (destination_account_id) REFERENCES accounts(id) ON DELETE RESTRICT
      );
    `);
  } finally {
    client.release();
  }

  return pool;
}

export async function closeDatabase(): Promise<void> {
  if (poolInstance) {
    try {
      await poolInstance.end();
    } catch {
      // Ignore
    }
    poolInstance = null;
  }
}

/**
 * Execute a unit of work inside an ACID atomic transaction with BEGIN / COMMIT / ROLLBACK.
 * Automatically releases the client back to the pool.
 */
export async function runTransaction<T>(work: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback failure if already aborted
    }
    throw error;
  } finally {
    client.release();
  }
}
