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
import AccountController from '../src/controllers/account.controller';

import authRouter from '../src/routes/auth.routes.js';

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

const req = {
  body: {
    email: "test@example.com",
    password: "Test",
  }
};
const res = {
  send: jest.fn()
}
const next = jest.fn();

// Functions that need to run before any tests are ran 
beforeAll(() => {
  app = express();

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({extended: true}));
  app.use(cookieParser());
  app.use('/auth', authRouter);

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
      const findingEmail = await accountModel.findByEmail('test@example.com');
  
      // The database should have been queried once
      expect(pool.query).toBeCalledTimes(1);
      expect(pool.query).toHaveBeenCalledWith("SELECT * FROM account WHERE email = $1;", ['test@example.com']);
      
      // findByEmail should return an empty array
      expect(findingEmail).toHaveLength(0);
    });
  
    test("returns the account when results are found", async () => {
      // Mock the database response
      pool.query.mockResolvedValue({
        rows: [
          {
            email: 'test@example.com',
          },
        ],
      });
  
      const email = 'test@example.com'
      const findingEmail = await accountModel.findByEmail(email);
      expect(pool.query).toBeCalledTimes(1);
      expect(pool.query).toHaveBeenCalledWith("SELECT * FROM account WHERE email = $1;", ['test@example.com']);
      expect(findingEmail).toHaveLength(1);
      expect(findingEmail).toEqual(
        expect.arrayContaining([expect.objectContaining({email: 'test@example.com'}),]
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
            email: 'test@example.com',
            password: 'test',
          },
        ],
      });
      
      const createAccount = await accountModel.createAccount('test@example.com');
  
      expect(createAccount.message).toBe('Email already exists');
    });

    test("createAccount() successfully creates an account", async () => {

      pool.query.mockResolvedValue({
        rows: [],
      });
  
      let payload = {
        email: 'test@example.com',
        password: 'test',
      };
  
      await accountModel.createAccount(payload);
  
      // Database gets queried twice, once to check if the email exists and then to insert the new account
      expect(pool.query).toBeCalledTimes(2);
      expect(pool.query).toHaveBeenCalledWith("SELECT * FROM account WHERE email = $1;", ['test@example.com']);  
      expect(pool.query).toHaveBeenCalledWith("INSERT INTO account (email, password) VALUES ($1, $2);", ['test@example.com', 'test']);  
    });
  });
});
describe("Account Controller", () => {
  describe("signup()", () => {
    test("rejects missing email", async () => {
      let body = {
        password: 'test',
      };
  
      // Response should be a 400 Bad Request error with a message explaining why
      const response = await request(app).post('/auth/signup').send(body); 
      expect(response.header['content-type']).toBe('text/html; charset=utf-8');
      expect(response.statusCode).toBe(400);
      expect(response.text).toEqual('Missing email');
    });
  
    test("rejects missing password", async () => {
      let body = {
        email: 'test@example.com',
      };
  
      const response = await request(app).post('/auth/signup').send(body); 
      expect(response.header['content-type']).toBe('text/html; charset=utf-8');
      expect(response.statusCode).toBe(400);
      expect(response.text).toEqual('Missing password');
    });
  
    test("creates query for account and returns success", async () => {
      let body = {
        email: 'test@example.com',
        password: 'test',
      };
  
      const response = await request(app).post('/auth/signup').send(body); 
  
      expect(pool.query).toBeCalledTimes(2);
      expect(pool.query).toHaveBeenCalledWith("SELECT * FROM account WHERE email = $1;", ['test@example.com']);  
      expect(pool.query).toHaveBeenCalledWith("INSERT INTO account (email, password) VALUES ($1, $2);", ['test@example.com', expect.anything()]);
  
      expect(response.header['content-type']).toBe('text/html; charset=utf-8');
      expect(response.statusCode).toBe(201);
      expect(response.text).toEqual('Account created successfully');
    });

    test("does not call database with same password value as passed in", async () => {
      let body = {
        email: 'test@example.com',
        password: 'test',
      };
  
      const response = await request(app).post('/auth/signup').send(body); 
  
      expect(pool.query).toBeCalledTimes(2);
      expect(pool.query).toHaveBeenCalledWith("SELECT * FROM account WHERE email = $1;", ['test@example.com']);  
      expect(pool.query).not.toHaveBeenCalledWith("INSERT INTO account (email, password) VALUES ('test@example.com', 'test');");
  
      expect(response.header['content-type']).toBe('text/html; charset=utf-8');
      expect(response.statusCode).toBe(201);
      expect(response.text).toEqual('Account created successfully');
    });
    
    
    test("The password is hashed before being inserted into the database", async () => {
      const accountController = new AccountController();
      jest.spyOn(accountController.account, 'createAccount');
      await accountController.signUp(req, res, next);
      expect(accountController.account.createAccount).toHaveBeenCalled();
      expect(accountController.account.createAccount).toHaveBeenCalledWith(
        {"email": "test@example.com", "password":expect.stringMatching(/^\$2b\$10\$.{53}$/)}
      );
    });
    
  });
  describe("signin()", () => {
    test("rejects missing email", async () => {
      let body = {
        password: 'test',
      };
  
      const response = await request(app).post('/auth/signin').send(body); 
      expect(response.header['content-type']).toBe('text/html; charset=utf-8');
      expect(response.statusCode).toBe(400);
      expect(response.text).toEqual('Missing email');
    });
  
    test("signin() rejects missing password", async () => {
      let body = {
        email: 'test@example.com',
      };
  
      const response = await request(app).post('/auth/signin').send(body); 
      expect(response.header['content-type']).toBe('text/html; charset=utf-8');
      expect(response.statusCode).toBe(400);
      expect(response.text).toEqual('Missing password');
    });
  
  
    test('signin() returns error if password is incorrect', async () => {
      let body = {
        email: 'test@example.com',
        password: 'test',
      };
  
      pool.query.mockResolvedValue({
        rows: [
          {
            email: 'test@example.com',
            password: 'test',
          },
        ],
      });
  
      const response = await request(app).post('/auth/signin').send(body); 
      expect(response.header['content-type']).toBe('text/html; charset=utf-8');
      expect(response.statusCode).toBe(403);
      expect(response.text).toEqual('Incorrect password');
    });
  
    test('signin() successfully authenticates user', async () => {
      let body = {
        email: 'test@example.com',
        password: 'test',
      };
  
      pool.query.mockResolvedValue({
        rows: [
          {
            email: 'test@example.com',
            password: await bcrypt.hash('test',10),
          },
        ],
      });
  
      const response = await request(app).post('/auth/signin').send(body); 
      expect(response.header['content-type']).toBe('text/html; charset=utf-8');
      expect(response.header['set-cookie'][0]).toEqual(expect.stringMatching(/jwt-auth=[^']+HttpOnly; Secure; SameSite=Lax/));
      expect(response.statusCode).toBe(200);
      expect(response.text).toEqual('Account logged in');      
    });
  });
  describe("testPublicRequest()", () => {
    test('response success', async () => {
      const response = await request(app).get('/auth/test-public'); 
  
      expect(response.header['content-type']).toBe('text/html; charset=utf-8');
      expect(response.statusCode).toBe(200);
      expect(response.text).toEqual('Success');      });
  });
  describe("testPrivateRequest()", () => {
    test('returns error without token', async () => {
      const response = await request(app).get('/auth/test-private');
  
      expect(response.header['content-type']).toBe('text/html; charset=utf-8');
      expect(response.statusCode).toBe(403);
      expect(response.text).toEqual('No access token provided');      });
  
    test('returns error with incorrect token', async () => {    
      const response = await request(app).get('/auth/test-private').set('Cookie', ["jwt-auth=wrong"]); 
  
      expect(response.header['content-type']).toBe('text/html; charset=utf-8');
      expect(response.statusCode).toBe(403);
      expect(response.text).toEqual('Invalid access token');
    });
  
    test('returns response succesfully', async () => {
      let body = {
        email: 'test@example.com',
        password: 'test',
      };
  
      pool.query.mockResolvedValue({
        rows: [
          {
            email: 'test@example.com',
            password: await bcrypt.hash('test',10),
          },
        ],
      });
  
      const signInResponse = await request(app).post('/auth/signin').send(body); 
      let cookie = signInResponse.get('Set-Cookie')
  
      const response = await request(app).get('/auth/test-private').set('Cookie', [...cookie]); 
  
      expect(response.header['content-type']).toBe('text/html; charset=utf-8');
      expect(response.statusCode).toBe(200);
      expect(response.text).toEqual('Success with access token');
    });
  });
});