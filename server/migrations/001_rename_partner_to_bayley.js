const { getDb } = require('../db');

function runMigration() {
  const db = getDb();
  console.log('Running migration: Rename owner "Partner" to "Bayley"...');

  const tablesAndColumns = [
    { table: 'tasks', column: 'default_owner' },
    { table: 'subtasks', column: 'owner' },
    { table: 'activity_log', column: 'owner' },
    { table: 'weekly_plan_items', column: 'owner' },
    { table: 'reward_cashins', column: 'owner' },
  ];

  let totalChanges = 0;

  db.transaction(() => {
    for (const { table, column } of tablesAndColumns) {
      console.log(`- Updating ${table}...`);
      const stmt = db.prepare(`UPDATE ${table} SET ${column} = 'Bayley' WHERE ${column} = 'Partner'`);
      const result = stmt.run();
      console.log(`  ${result.changes} rows affected.`);
      totalChanges += result.changes;
    }
  })();

  console.log(`
Migration complete. Total changes: ${totalChanges}.`);
  console.log('NOTE: You may need to restart the application for changes to be fully reflected.');
}

// Run it
runMigration();
