// database.config.js
import pg from 'pg'
const { Pool } = pg

const credentials = {
  user: "postgres",
  host: "localhost",
  database: "jwt-auth-sample",
  password: process.env.PG_PASSWORD,
  port: 5432,
};

const pool = new Pool(credentials);