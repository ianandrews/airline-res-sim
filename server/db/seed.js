const pool = require('../config/database');
const airlines = require('./seedData/airlines.json');
const airports = require('./seedData/airports.json');
const flights = require('./seedData/flights.json');
const fareClassConfig = require('./seedData/fareClasses.json');
const pnrs = require('./seedData/pnrs.json');

async function seed() {
  console.log('Seeding database...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if already seeded
    const { rows } = await client.query('SELECT COUNT(*) FROM airlines');
    if (parseInt(rows[0].count) > 0) {
      console.log('Database already seeded, skipping.');
      await client.query('COMMIT');
      return;
    }

    // Airlines
    for (const a of airlines) {
      await client.query('INSERT INTO airlines (code, name) VALUES ($1, $2)', [a.code, a.name]);
    }
    console.log(`  Seeded ${airlines.length} airlines`);

    // Airports
    for (const a of airports) {
      await client.query('INSERT INTO airports (code, name, city) VALUES ($1, $2, $3)', [a.code, a.name, a.city]);
    }
    console.log(`  Seeded ${airports.length} airports`);

    // Flights
    const flightIdMap = {};
    for (const f of flights) {
      const res = await client.query(
        `INSERT INTO flights (airline_code, flight_number, origin, destination, depart_time, arrive_time, equipment, duration_mins)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [f.airline_code, f.flight_number, f.origin, f.destination, f.depart_time, f.arrive_time, f.equipment, f.duration_mins]
      );
      flightIdMap[f.flight_number] = res.rows[0].id;
    }
    console.log(`  Seeded ${flights.length} flights`);

    // Fare classes
    let fareCount = 0;
    for (const f of flights) {
      const fid = flightIdMap[f.flight_number];
      const overrides = fareClassConfig.overrides[f.flight_number] || {};

      for (const cls of fareClassConfig.classes) {
        const defaults = fareClassConfig.defaults[cls];
        const ov = overrides[cls] || {};
        const totalSeats = ov.total_seats || defaults.total_seats;
        const soldSeats = ov.sold_seats !== undefined ? ov.sold_seats : defaults.sold_seats;

        await client.query(
          'INSERT INTO fare_classes (flight_id, class_code, total_seats, sold_seats) VALUES ($1, $2, $3, $4)',
          [fid, cls, totalSeats, soldSeats]
        );
        fareCount++;
      }
    }
    console.log(`  Seeded ${fareCount} fare classes`);

    // PNRs
    for (const p of pnrs) {
      const pnrRes = await client.query(
        `INSERT INTO pnrs (record_locator, received_from, ticketing) VALUES ($1, $2, $3) RETURNING id`,
        [p.record_locator, p.received_from, p.ticketing]
      );
      const pnrId = pnrRes.rows[0].id;

      for (const pax of p.passengers) {
        await client.query(
          'INSERT INTO passengers (pnr_id, seq_number, last_name, first_name, title) VALUES ($1, $2, $3, $4, $5)',
          [pnrId, pax.seq_number, pax.last_name, pax.first_name, pax.title]
        );
      }

      for (const ph of p.phones) {
        await client.query(
          'INSERT INTO phones (pnr_id, phone_type, number) VALUES ($1, $2, $3)',
          [pnrId, ph.phone_type, ph.number]
        );
      }

      for (const seg of p.segments) {
        const fid = flightIdMap[seg.flight_number];
        if (!fid) {
          console.warn(`  Warning: flight ${seg.flight_number} not found for PNR ${p.record_locator}`);
          continue;
        }
        await client.query(
          `INSERT INTO segments (pnr_id, flight_id, seg_number, travel_date, class_code, status, num_passengers)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [pnrId, fid, seg.seg_number, seg.travel_date, seg.class_code, seg.status, p.passengers.length]
        );
      }

      // Add creation history
      await client.query(
        'INSERT INTO pnr_history (pnr_id, action) VALUES ($1, $2)',
        [pnrId, 'PNR CREATED']
      );
    }
    console.log(`  Seeded ${pnrs.length} PNRs`);

    await client.query('COMMIT');
    console.log('Seeding complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { seed };
