import dotenv from 'dotenv';
import { createPool } from '../src/db/index.ts';

dotenv.config();

async function run() {
  const pool = createPool();
  try {
    // Patterns matching seeded account names
    const patterns = ['%Bigstop%', '%Herrera Property%', '%HHC Franchise Hub%', '%Blesscent%', '%Scentimo%'];
    const res = await pool.query(`DELETE FROM cash_accounts WHERE account_name ILIKE ANY($1::text[]) RETURNING id, account_name`, [patterns]);
    console.log(`Deleted ${res.rowCount} seeded cash account(s).`);
    if (res.rowCount > 0) {
      for (const r of res.rows) {
        console.log(`- ${r.id} : ${r.account_name}`);
      }
    }
  } catch (err) {
    console.error('Failed to delete seeded cash accounts:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
