#!/usr/bin/node

const { createClient } = require('redis');
const { promisify } = require('util');

class RedisClient {
  constructor() {
    this.client = createClient();
    this.client.on('error', (err) => console.error('Redis error:', err));
    this.client.on('connect', () => {
      this.connected = true;
      console.log('Redis client connected.');
    });
    this.connected = false;
  }

  isAlive() {
    return this.connected;
  }

  async get(key) {
    if (!this.connected) throw new Error('Redis client is not connected');
    const getAsync = promisify(this.client.get).bind(this.client);
    const value = await getAsync(key);
    return value;
  }

  async set(key, value, duration) {
    if (!this.connected) throw new Error('Redis client is not connected');
    const setAsync = promisify(this.client.set).bind(this.client);
    await setAsync(key, value, 'EX', duration);
  }

  async del(key) {
    if (!this.connected) throw new Error('Redis client is not connected');
    const delAsync = promisify(this.client.del).bind(this.client);
    await delAsync(key);
  }
}

const redisClient = new RedisClient();
module.exports = redisClient;
