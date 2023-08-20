// app.js
import express from 'express';

const app = express();

console.info("Running... ")

app.get('/api/', (req, res) => {
  res.json({ message: "Welcome to the sample auth application." });
})

export default app;