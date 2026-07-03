import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

dotenv.config();

export const createPool = () => {
  const poolConfig: any = {
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    database: process.env.SQL_DB_NAME,
    connectionTimeoutMillis: 15000,
  };

  if (process.env.SQL_PASSWORD) {
    poolConfig.password = process.env.SQL_PASSWORD;
  }

  if (process.env.SQL_PORT) {
    poolConfig.port = Number(process.env.SQL_PORT);
  }

  return new Pool(poolConfig);
};

const pool = createPool();

pool.on('error', (err) => {
  console.error('Unexpected error on idle SQL pool client:', err);
});

export const db = drizzle(pool, { schema });
