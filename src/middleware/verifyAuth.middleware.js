// verifyAuth.middleware.js
import jwt from 'jsonwebtoken';

// Middleware to lock protected routes
async function verifyAuth(request, response, next) { 
  // Use cookie-parser to retrieve the JWT from cookies
  let token = request.cookies['jwt-auth'];
  
  // if there was no token saved then the route cannot be accesed
  if (!token) {
    return response.status(403).send("No access token provided");
  }

  try {
    let decoded = jwt.verify(token, process.env.JWT_SECRET);
    // JWT looks good. Add the data from the token to the request. The api will then be able to use that data
    request.user = decoded;
  }
  catch (error) {
    // if the JWT couldn't be verified then the route cannot be accesed
    return response.status(403).send("Invalid access token");
  }

  // Move on to the next function in the chain
  next();
}

export default verifyAuth;