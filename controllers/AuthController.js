#!/usr/bin/node

const { v4 } = require('uuid');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');
const { getAuthzHeader, getToken, pwdHashed } = require('../utils/utils');
const { decodeToken, getCredentials } = require('../utils/utils');

class AuthController {
  /**
   * Handles user login and token issuance.
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   */
  static async getConnect(req, res) {
    const authzHeader = getAuthzHeader(req);
    if (!authzHeader) {
      return res.status(401).json({ error: 'Unauthorized' }).end();
    }

    const token = getToken(authzHeader);
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' }).end();
    }

    const decodedToken = decodeToken(token);
    if (!decodedToken) {
      return res.status(401).json({ error: 'Unauthorized' }).end();
    }

    const { email, password } = getCredentials(decodedToken);
    const user = await dbClient.getUser(email);
    if (!user || user.password !== pwdHashed(password)) {
      return res.status(401).json({ error: 'Unauthorized' }).end();
    }

    const accessToken = v4();
    await redisClient.set(`auth_${accessToken}`, user._id.toString('utf8'), 60 * 60 * 24);
    return res.json({ token: accessToken }).end();
  }

  /**
   * Handles user logout and token invalidation.
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   */
  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' }).end();
    }

    const id = await redisClient.get(`auth_${token}`);
    if (!id) {
      return res.status(401).json({ error: 'Unauthorized' }).end();
    }

    const user = await dbClient.getUserById(id);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' }).end();
    }

    await redisClient.del(`auth_${token}`);
    return res.status(204).end();
  }

  /**
   * Handles retrieving the current user's information.
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   */
  static async getMe(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' }).end();
    }

    const id = await redisClient.get(`auth_${token}`);
    if (!id) {
      return res.status(401).json({ error: 'Unauthorized' }).end();
    }

    const user = await dbClient.getUserById(id);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' }).end();
    }

    return res.json({ id: user._id, email: user.email }).end();
  }
}

module.exports = AuthController;
