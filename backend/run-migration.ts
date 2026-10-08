import fs from 'fs';
import path from 'path';
import { getPool } from './src/config/database';

async function run() {
  try {
    const pool = await getPool();
    const filePath = path.join(__dirname, 'database', 'migrations', '001_create_approval_matrix.sql');
    const sqlContent = fs.readFileSync(filePath, 'utf8');

    // Split by GO and remove empty blocks
    const chunks = sqlContent
      .split(/\bGO\b/i)
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    for (const chunk of chunks) {
      console.log('Executing chunk...');
      await pool.request().query(chunk);
    }
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
