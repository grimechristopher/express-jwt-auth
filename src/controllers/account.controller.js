// account.controller.js
import jwt from 'jsonwebtoken'; // to sign and verify tokens 
import bcrypt from 'bcrypt'; // to hash passwords

import Account from '../models/account.model.js';

class AccountController {
  constructor() {
    // Create a new model object to perform operations on the database table
    this.account = new Account();
  }
  // Sign up for an account 
  async signUp(request, response, next) {
    console.log(request);
    try {
      // Require email in the request body
      if (!request.body.email) {
        return response.status(400).send('Missing email');
      }

      // Require password in the request body
      if (!request.body.password) {
        return response.status(400).send('Missing password');
      }

      // Create the account with the data in the request
      await this.account.createAccount({
        email: request.body.email,
        password: await bcrypt.hash(request.body.password,10), // Hash the password
      })
      
      console.log(request.body)
      return response.status(201).send('Account created successfully');
    }
    catch (error) {
      next(error);
    };
  }

  // Sign in to the account
  async signIn(request, response) {
    // Respond with an error if body is missing required fields
    // Require email in the request body
    if (!request.body.email) {
      return response.status(400).send('Missing email'); 
    }

    // Require password in the request body
    if (!request.body.password) {
      return response.status(400).send('Missing password');
    }

    // Get the relevant account from the database and compare that password to the password in the request body
    let records = await this.account.findByEmail(request.body.email);
    // Usue bcrypt to compare plain text to the hashed password
    let isValidPassword = await bcrypt.compare(request.body.password, records[0].password);

    // Invalid passwords respond with an error 
    if (!isValidPassword) {
      return response.status(403).send('Incorrect password');
    }

    // Password is verified. Create a JWT with the account data
    let token = jwt.sign(records[0], process.env.JWT_SECRET, {expiresIn: 3600 * 24});
    // Store the JWT in a cookie
    let cookieOptions = {expires: new Date(Date.now() + 3600 * 24), secure: process.env.ENVIRONMENT == "Local" ? false : true, httpOnly: true, sameSite: "Lax"}

    // respond with success and add the cookie
    return response.status(200).cookie('jwt-auth', token, cookieOptions).send('Account logged in');
  }

  // test a unprotected route
  async testPublicRequest(request, response) {
    return response.status(200).send('Success');
  }

  // test a protected route
  async testPrivateRequest(request, response) {
    return response.status(200).send('Success with access token');
  }

}

export default AccountController;
