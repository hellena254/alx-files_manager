import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const databse = process.env.DB_DATABSE || 'files_manager';
    this.url = `mongodb://${host}:${port}`;
    this.dbName = databse;
    this.client = new MongoClient(this.url, { useNewUrlParser: true,useUnifiedTopology: true });
    this.client.connect()
      .then(() => console.log('Connected to MongoDB'))
      .catch(err => console.error('Failed to connect to MongoDB', err));
  }

  /**
   * Check if the connection to MongoDB is alive
   * @returns {boolean} true if the connection is alive, otherwise false
   */
  isAlive() {
    return this.client.isConnected();
  }

  /**
   * Get the number of documents in the 'users' collection
   * @returns {Promise<number>} The number of documents in the 'users' collection
   */
  async nbUsers() {
    try {
      const db = this.client.db(this.dbName);
      const count = await db.collection('users').countDocuments();
      return count;
    } catch (err) {
      console.error('Error fetching number of users', err);
      return 0;
    }
  }

  /**
   * Get the number of documents in the 'files' collection
   * @returns {Promise<number>} The number of documents in the 'files' collection
   */
  async nbFiles() {
    try {
      const db = this.client.db(this.dbName);
      const count = await db.collection('files').countDocuments();
      return count;
    } catch (err) {
      console.error('Error fetching number of files', err);
      return 0;
    }
  }
}

// Export an instance of DBClient
const dbClient = new DBClient();
export default dbClient;
  
