import { getPool } from './src/config/database';

async function check() {
  try {
    const pool = await getPool();
    const query = `
      SELECT 
        m.matrix_id, m.section_id, m.target_positions, m.matrix_name, m.approval_steps, 
        m.is_active, m.created_at, m.updated_at,
        s.name_section, s.name_fullsection
      FROM agt_approval_matrix m
      INNER JOIN agt_section  s ON s.id_section = m.section_id
      WHERE 1=1
    `;
    const result = await pool.request().query(query);
    console.log('Query result rows:', result.recordset.length);
    for (const row of result.recordset) {
      console.log('matrix_id:', row.matrix_id);
      console.log('target_positions:', row.target_positions);
      console.log('approval_steps:', row.approval_steps);
      JSON.parse(row.target_positions);
      JSON.parse(row.approval_steps);
    }
  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
}
check();
