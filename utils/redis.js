import { createClient } from 'redis';

class RedisClient {
  constructor() {
    this.client = createClient();

    // handle errors
    this.client.on('error', (err) => console.error('Redis Client Error', err));
  }

  /**
   * Check if Redis client is alive
   * @returns {boolean} true if connection is successful,
   */
  isAlive() {
    return this.client.connected;
  }

  /**
   * Get the value for a given key
   * @param {string} key - The key to fetch from Redis
   * @returns {Promise<string | null>} The value associated with the key
   */
  async get(key) {
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, value) => {
        if (err) reject(err);
        resolve(value);
      });
    });
  }

  /**
   * Set a key-value pair with an exp
   * @param {string} key - the key to set
   * @param {string | number} value - the value to set
   * @param {number} duration - The duration in seconds
   * @returns {Promise<void>}
   */
  async set(key, value, duration) {
    return new Promis((resolve, reject) => {
      this.client.set(key, value, 'EX', duration, (err) => {
        if (err) reject(err)
        resolve();
      });
    });
  }

  /**
   * Delete a key from redis
   * @param {string} key - The key to delete
   * @returns {Promise<void>}
   */
  async del(key) {
    return new Promise((resolve, reject) => {
      this.client.del(key, (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  }
}

// Export an instance of RedisClient
const redisClient = new RedisClient();
export default redisClient;
