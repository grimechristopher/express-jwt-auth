// app.js
import express from 'express';

// import routes
import authRouter from './src/routes/auth.routes.js'

const app = express();

// Use auth routes
app.use('/api/auth', authRouter);

console.info("Running... ")

app.get('/api/', (req, res) => {
  res.json({ message: "Welcome to the sample auth application." });
})

export default app;