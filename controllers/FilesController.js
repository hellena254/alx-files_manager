const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

// Helper function to check if the user is authenticated
async function getUserFromToken(token) {
  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) {
    return null;
  }

  const user = await dbClient.users.findOne({ _id: dbClient.getObjectId(userId) });
  return user;
}

class FilesController {
  // Endpoint to upload a file
  static async postUpload(req, res) {
    const token = req.header('X-Token');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, type, parentId = '0', isPublic = false, data } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    if (!['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type' });
    }

    if ((type === 'file' || type === 'image') && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    let parentFile;
    if (parentId !== '0') {
      parentFile = await dbClient.files.findOne({ _id: dbClient.getObjectId(parentId) });
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const fileDocument = {
      userId: user._id,
      name,
      type,
      isPublic,
      parentId,
    };

    if (type === 'folder') {
      const result = await dbClient.files.insertOne(fileDocument);
      return res.status(201).json({
        id: result.insertedId,
        userId: fileDocument.userId,
        name: fileDocument.name,
        type: fileDocument.type,
        isPublic: fileDocument.isPublic,
        parentId: fileDocument.parentId,
      });
    }

    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    const localPath = path.join(folderPath, uuidv4());

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    try {
      const fileBuffer = Buffer.from(data, 'base64');
      fs.writeFileSync(localPath, fileBuffer);

      fileDocument.localPath = localPath;

      const result = await dbClient.files.insertOne(fileDocument);

      return res.status(201).json({
        id: result.insertedId,
        userId: fileDocument.userId,
        name: fileDocument.name,
        type: fileDocument.type,
        isPublic: fileDocument.isPublic,
        parentId: fileDocument.parentId,
      });

    } catch (err) {
      return res.status(500).json({ error: 'Unable to save the file' });
    }
  }

  // Endpoint to get file by ID
  static async getShow(req, res) {
    const token = req.header('X-Token');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const file = await dbClient.files.findOne({ _id: dbClient.getObjectId(id), userId: user._id });
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.json(file);
  }

  // Endpoint to get all files for a user
  static async getIndex(req, res) {
    const token = req.header('X-Token');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { parentId = '0', page = 0 } = req.query;
    const limit = 20;
    const skip = parseInt(page, 10) * limit;

    const files = await dbClient.files
      .aggregate([
        { $match: { parentId, userId: user._id } },
        { $skip: skip },
        { $limit: limit },
      ])
      .toArray();

    return res.json(files);
  }

  // Endpoint to publish a file
  static async putPublish(req, res) {
    const token = req.header('X-Token');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const file = await dbClient.files.findOne({ _id: dbClient.getObjectId(id), userId: user._id });
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    const result = await dbClient.files.updateOne(
      { _id: dbClient.getObjectId(id), userId: user._id },
      { $set: { isPublic: true } }
    );

    if (result.modifiedCount === 0) {
      return res.status(500).json({ error: 'Unable to update the file' });
    }

    const updatedFile = await dbClient.files.findOne({ _id: dbClient.getObjectId(id) });
    return res.status(200).json(updatedFile);
  }

  // Endpoint to unpublish a file
  static async putUnpublish(req, res) {
    const token = req.header('X-Token');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const file = await dbClient.files.findOne({ _id: dbClient.getObjectId(id), userId: user._id });
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    const result = await dbClient.files.updateOne(
      { _id: dbClient.getObjectId(id), userId: user._id },
      { $set: { isPublic: false } }
    );

    if (result.modifiedCount === 0) {
      return res.status(500).json({ error: 'Unable to update the file' });
    }

    const updatedFile = await dbClient.files.findOne({ _id: dbClient.getObjectId(id) });
    return res.status(200).json(updatedFile);
  }

  // Endpoint to get file content
  static async getFile(req, res) {
    const token = req.header('X-Token');
    const { id } = req.params;
    const file = await dbClient.files.findOne({ _id: dbClient.getObjectId(id) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    if (!file.isPublic) {
      const user = await getUserFromToken(token);
      if (!user || file.userId.toString() !== user._id.toString()) {
        return res.status(404).json({ error: 'Not found' });
      }
    }

    if (!fs.existsSync(file.localPath)) {
      return res.status(404).json({ error: 'Not found' });
    }

    const mimeType = mime.lookup(file.name) || 'application/octet-stream';

    res.setHeader('Content-Type', mimeType);
    const fileStream = fs.createReadStream(file.localPath);

    fileStream.pipe(res);
  }
}

module.exports = FilesController;
