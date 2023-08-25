// authRouter.routes.js
import express from 'express';

import verifyAuth from '../middleware/verifyAuth.middleware.js';
import AccountController from '../controllers/account.controller.js';

let authRouter = express.Router();
let accountController = new AccountController()

authRouter.post('/signin/', function(request, response, next){
  accountController.signIn(request, response, next)
});

authRouter.post('/signup/', function(request,response, next) {
  accountController.signUp(request, response, next)
});

authRouter.get('/test-public/' , function(request,response) {
  accountController.testPublicRequest(request, response)
});

authRouter.get('/test-private/', verifyAuth, function(request,response) {
  accountController.testPrivateRequest(request, response)
});




export default authRouter;