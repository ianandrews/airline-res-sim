const { rollback } = require('../server/db/migrate');
const { migrate } = require('../server/db/migrate');
const { seed } = require('../server/db/seed');

async function reset() {
  try {
    await rollback();
    await migrate();
    await seed();
    console.log('Reset complete.');
    process.exit(0);
  } catch (err) {
    console.error('Reset failed:', err);
    process.exit(1);
  }
}

reset();
