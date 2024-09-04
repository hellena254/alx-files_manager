#!/usr/bin/node

const { MongoClient, ObjectId } = require('mongodb');
const { pwdHashed } = require('./utils');

class DBClient {
  constructor() {
    this.host = process.env.DB_HOST || 'localhost';
    this.port = process.env.DB_PORT || 27017;
    this.database = process.env.DB_DATABASE || 'files_manager';
    this.dbUrl = `mongodb://${this.host}:${this.port}`;
    this.client = new MongoClient(this.dbUrl, { useUnifiedTopology: true });
    this.connected = false;
    
    this.initialize();
  }

  async initialize() {
    try {
      await this.client.connect();
      this.connected = true;
      console.log('Database connected successfully.');
    } catch (err) {
      console.error('Database connection error:', err.message);
    }
  }

  isAlive() {
    return this.connected;
  }

  async nbUsers() {
    if (!this.connected) await this.initialize();
    const usersCount = await this.client.db(this.database).collection('users').countDocuments();
    return usersCount;
  }

  async nbFiles() {
    if (!this.connected) await this.initialize();
    const filesCount = await this.client.db(this.database).collection('files').countDocuments();
    return filesCount;
  }

  async createUser(email, password) {
    if (!this.connected) await this.initialize();
    const hashedPwd = pwdHashed(password);
    const result = await this.client.db(this.database).collection('users').insertOne({ email, password: hashedPwd });
    return result;
  }

  async getUser(email) {
    if (!this.connected) await this.initialize();
    const user = await this.client.db(this.database).collection('users').findOne({ email });
    return user || null;
  }

  async getUserById(id) {
    if (!this.connected) await this.initialize();
    const user = await this.client.db(this.database).collection('users').findOne({ _id: new ObjectId(id) });
    return user || null;
  }

  async userExist(email) {
    const user = await this.getUser(email);
    return !!user;
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
