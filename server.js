#!/usr/bin/node

const express = require("express");
const router = require("./routes/index"); // Import the router for handling routes

const server = express(); // Create an Express application
const PORT = process.env.PORT ? process.env.PORT : 5000; // Set port, default to 5000 if not provided

// Middleware to parse JSON request bodies
server.use(express.json());

// Register the router to handle routes
server.use(router);

// Start the server and listen on the specified port
server.listen(PORT, () =>
  console.log(`The server is running on port: ${PORT}`) // Log message on successful start
);
