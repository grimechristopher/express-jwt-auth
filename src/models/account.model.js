// account.model.js
import pool from "../config/database.config.js";

class Account{
  async findByEmail(email) {
    // return array of accounts matching an email
    let { rows } = await pool.query(`SELECT * FROM account WHERE email = $1;`, [email]);
    return rows
  }
  async createAccount(payload) {
    // Check to make sure an account with the same email doesnt exist
    let emails = await pool.query(`SELECT * FROM account WHERE email = $1;`, [payload.email]);
    if (emails.rows.length) {
      return new Error('Email already exists')
    }

    // insert new account into the database
    return await pool.query(`INSERT INTO account (email, password) VALUES ($1, $2);`, [payload.email, payload.password])
  }
}

// export the Account class
export default Account;