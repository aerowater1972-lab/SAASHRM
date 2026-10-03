const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  database: 'flexy_hrms',
  password: 'postgres'
});

async function main() {
  try {
    // Add the column
    await pool.query(`ALTER TABLE "Grade" ADD COLUMN "maxOvertimeHoursPerMonth" INTEGER;`);
    console.log('Column added successfully');
    
    // Update all grades to have value 8
    await pool.query(`UPDATE "Grade" SET "maxOvertimeHoursPerMonth" = 8 WHERE "maxOvertimeHoursPerMonth" IS NULL;`);
    console.log('Grades updated successfully');
    
    // Verify
    const { rows } = await pool.query(`SELECT id, name, code, "maxOvertimeHoursPerMonth" FROM "Grade";`);
    console.log('Current grades:', rows);
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();