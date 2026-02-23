const { migrate } = require('../server/db/migrate');
const { seed } = require('../server/db/seed');

async function setup() {
  try {
    await migrate();
    await seed();
    console.log('Setup complete.');
    process.exit(0);
  } catch (err) {
    console.error('Setup failed:', err);
    process.exit(1);
  }
}

setup();
