// account.test.js

// supertest is a module that helps with testing http requests
import express from 'express';
import request from 'supertest';

// Body parser helps read json data from requests and responses
// Cookie parser helps handle cookies from requests and responses
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

// For Mocking the database responses
import { Pool } from 'pg';
// For handling hashing 
import bcrypt from 'bcrypt';
// allow files to load environment variables
import * as dotenv from 'dotenv';

// Import files being tested
import AccountModel from '../src/models/account.model';

// Initialize variables
let server = null;
let pool = null;

// use dotenv
dotenv.config();

// Set up Jest mock for postgresql connection
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
  }
  return {Pool: jest.fn(() => mPool)};
});

// function flushPromises() {
//   return new Promise(resolve => setImmediate(resolve));
// }

// Functions that need to run before any tests are ran 
beforeAll(() => {
  app = express();

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({extended: true}));
  app.use(cookieParser());
  // app.use('/auth', authRouter);

  server = app.listen();
  pool = new Pool();
});

// Functions that need to run after each test completes. 
afterEach(async () => {
  jest.clearAllMocks();
  server.close();
});

describe('Account Model', () => {

  const accountModel = new AccountModel();

  // Look up a user by email 
  // Ability to create a user
  describe('findByEmail()', () => {
    // Need to return the email if found
    // Need to make sure an empty array is returned if not found
    test("returns an empty array when results are not found", async () => {
      // First mock the database response
      pool.query.mockResolvedValue({
        rows: [],
      });
      
      // Call the function being tested
      const findingEmail = await accountModel.findByEmail('chris@chrisgrime.com');
  
      // The database should have been queried once
      expect(pool.query).toBeCalledTimes(1);
      expect(pool.query).toHaveBeenCalledWith("SELECT * FROM account WHERE email = 'chris@chrisgrime.com';");
      
      // findByEmail should return an empty array
      expect(findingEmail).toHaveLength(0);
    });
  
    test("returns the account when results are found", async () => {
      // Mock the database response
      pool.query.mockResolvedValue({
        rows: [
          {
            email: 'chris@chrisgrime.com',
          },
        ],
      });
  
      const email = 'chris@chrisgrime.com'
      
      const findingEmail = await accountModel.findByEmail(email);
  
      expect(pool.query).toBeCalledTimes(1);
      expect(pool.query).toHaveBeenCalledWith("SELECT * FROM account WHERE email = 'chris@chrisgrime.com';");
      
      expect(findingEmail).toHaveLength(1);
      expect(findingEmail).toEqual(
        expect.arrayContaining([expect.objectContaining({email: 'chris@chrisgrime.com'}),]
        )
      );
    });
  });

  describe('createAccount()', () => {
    // Cant create an account if email is already in use
    // Test that the account is created
    test("throws error if email used is already found in the database", async () => {

      pool.query.mockResolvedValue({
        rows: [
          {
            email: 'chris@chrisgrime.com',
            password: 'test',
          },
        ],
      });
      
      const createAccount = await accountModel.createAccount('chris@chrisgrime.com');
  
      expect(createAccount.message).toBe('Email already exists');
    });

    test("createAccount() successfully creates an account", async () => {

      pool.query.mockResolvedValue({
        rows: [],
      });
  
      let payload = {
        email: 'chris@chrisgrime.com',
        password: 'test',
      };
  
      await accountModel.createAccount(payload);
  
      // Database gets queried twice, once to check if the email exists and then to insert the new account
      expect(pool.query).toBeCalledTimes(2);
      expect(pool.query).toHaveBeenCalledWith("SELECT * FROM account WHERE email = 'chris@chrisgrime.com';");  
      expect(pool.query).toHaveBeenCalledWith("INSERT INTO account (email, password) VALUES ('chris@chrisgrime.com', 'test');");  
    });
  });
});