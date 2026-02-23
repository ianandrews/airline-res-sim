const pool = require('../config/database');

const UP = `
CREATE TABLE IF NOT EXISTS airlines (
  code    CHAR(2) PRIMARY KEY,
  name    VARCHAR(60) NOT NULL
);

CREATE TABLE IF NOT EXISTS airports (
  code    CHAR(3) PRIMARY KEY,
  name    VARCHAR(80) NOT NULL,
  city    VARCHAR(60) NOT NULL
);

CREATE TABLE IF NOT EXISTS flights (
  id              SERIAL PRIMARY KEY,
  airline_code    CHAR(2) NOT NULL REFERENCES airlines(code),
  flight_number   VARCHAR(6) NOT NULL,
  origin          CHAR(3) NOT NULL REFERENCES airports(code),
  destination     CHAR(3) NOT NULL REFERENCES airports(code),
  depart_time     TIME NOT NULL,
  arrive_time     TIME NOT NULL,
  equipment       VARCHAR(10) DEFAULT 'Boeing 737',
  duration_mins   INT NOT NULL,
  UNIQUE(airline_code, flight_number)
);

CREATE TABLE IF NOT EXISTS fare_classes (
  id          SERIAL PRIMARY KEY,
  flight_id   INT NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
  class_code  CHAR(1) NOT NULL,
  total_seats INT NOT NULL,
  sold_seats  INT NOT NULL DEFAULT 0,
  UNIQUE(flight_id, class_code)
);

CREATE TABLE IF NOT EXISTS pnrs (
  id              SERIAL PRIMARY KEY,
  record_locator  CHAR(6) NOT NULL UNIQUE,
  status          VARCHAR(10) DEFAULT 'ACTIVE',
  received_from   VARCHAR(40),
  ticketing       VARCHAR(40),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS passengers (
  id          SERIAL PRIMARY KEY,
  pnr_id      INT NOT NULL REFERENCES pnrs(id) ON DELETE CASCADE,
  seq_number  VARCHAR(5) NOT NULL,
  last_name   VARCHAR(40) NOT NULL,
  first_name  VARCHAR(40) NOT NULL,
  title       VARCHAR(10),
  UNIQUE(pnr_id, seq_number)
);

CREATE TABLE IF NOT EXISTS segments (
  id              SERIAL PRIMARY KEY,
  pnr_id          INT NOT NULL REFERENCES pnrs(id) ON DELETE CASCADE,
  flight_id       INT NOT NULL REFERENCES flights(id),
  seg_number      INT NOT NULL,
  travel_date     DATE NOT NULL,
  class_code      CHAR(1) NOT NULL,
  status          CHAR(2) NOT NULL DEFAULT 'HK',
  num_passengers  INT NOT NULL DEFAULT 1,
  UNIQUE(pnr_id, seg_number)
);

CREATE TABLE IF NOT EXISTS phones (
  id          SERIAL PRIMARY KEY,
  pnr_id      INT NOT NULL REFERENCES pnrs(id) ON DELETE CASCADE,
  phone_type  CHAR(1) NOT NULL DEFAULT 'H',
  number      VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS pnr_history (
  id          SERIAL PRIMARY KEY,
  pnr_id      INT NOT NULL REFERENCES pnrs(id) ON DELETE CASCADE,
  action      VARCHAR(120) NOT NULL,
  agent       VARCHAR(20) DEFAULT 'GTR001',
  created_at  TIMESTAMP DEFAULT NOW()
);
`;

const DOWN = `
DROP TABLE IF EXISTS pnr_history CASCADE;
DROP TABLE IF EXISTS phones CASCADE;
DROP TABLE IF EXISTS segments CASCADE;
DROP TABLE IF EXISTS passengers CASCADE;
DROP TABLE IF EXISTS pnrs CASCADE;
DROP TABLE IF EXISTS fare_classes CASCADE;
DROP TABLE IF EXISTS flights CASCADE;
DROP TABLE IF EXISTS airports CASCADE;
DROP TABLE IF EXISTS airlines CASCADE;
`;

async function migrate() {
  console.log('Running migrations...');
  await pool.query(UP);
  console.log('Migrations complete.');
}

async function rollback() {
  console.log('Rolling back...');
  await pool.query(DOWN);
  console.log('Rollback complete.');
}

module.exports = { migrate, rollback };
