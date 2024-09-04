#!/usr/bin/node

const dbClient = require('../utils/db');

class UsersController {
  /**
   * Handles the creation of a new user.
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   */
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    try {
      const userExist = await dbClient.userExist(email);
      if (userExist) {
        return res.status(400).json({ error: 'Already exists' });
      }

      const user = await dbClient.createUser(email, password);
      const id = `${user.insertedId}`;
      return res.status(201).json({ id, email });
    } catch (error) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

module.exports = UsersController;

