// database.config.js
import pg from 'pg'
const { Pool } = pg

const credentials = {
  user: "postgres",
  host: "localhost",
  database: "jwt_auth_sample",
  password: process.env.PG_PASSWORD,
  port: 5432,
};

// Connect to the database
const pool = new Pool(credentials);

export default pool;