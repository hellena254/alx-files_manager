import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppController {
  // GET /status
  static async getStatus(req, res) {
    res.status(200).json({
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    });
  }

// GET /stats
  static async getStats(req, res) {
    const usersCount = await dbClient.nbUsers();
    const filesCount = await dbClient.nbFiles();

    res.status(200).json({
      users: usersCount,
      files: filesCount,
    });
  }
}

module.exports =  AppController;
