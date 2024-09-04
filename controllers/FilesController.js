import { tmpdir } from 'os';
import { promisify } from 'util';
import Queue from 'bull/lib/queue';
import { v4 as uuidv4 } from 'uuid';
import { mkdir, writeFile, stat, existsSync, realpath } from 'fs';
import { join as joinPath } from 'path';
import { Request, Response } from 'express';
import { contentType } from 'mime-types';
import mongoDBCore from 'mongodb/lib/core';
import dbClient from '../utils/db';
import { getUserFromXToken } from '../utils/auth';

const VALID_FILE_TYPES = {
  FOLDER: 'folder',
  FILE: 'file',
  IMAGE: 'image',
};

const ROOT_FOLDER_ID = 0;
const DEFAULT_ROOT_FOLDER = 'files_manager';
const MAX_FILES_PER_PAGE = 20;

const mkDirAsync = promisify(mkdir);
const writeFileAsync = promisify(writeFile);
const statAsync = promisify(stat);
const realpathAsync = promisify(realpath);
const fileQueue = new Queue('thumbnail generation');
const NULL_ID = Buffer.alloc(24, '0').toString('utf-8');

/**
 * Validates if the provided ID is a valid MongoDB ObjectId.
 * @param {string} id The ID to validate.
 * @returns {boolean} True if the ID is valid, false otherwise.
 */
const isValidId = (id) => /^[a-fA-F0-9]{24}$/.test(id);

export default class FilesController {
  /**
   * Handles file upload.
   * @param {Request} req The Express request object.
   * @param {Response} res The Express response object.
   */
  static async postUpload(req, res) {
    const { user } = req;
    const { name, type, parentId = ROOT_FOLDER_ID, isPublic = false, data = '' } = req.body || {};

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    if (!type || !Object.values(VALID_FILE_TYPES).includes(type)) {
      return res.status(400).json({ error: 'Invalid type' });
    }

    if (type !== VALID_FILE_TYPES.FOLDER && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    if (parentId !== ROOT_FOLDER_ID && !isValidId(parentId)) {
      return res.status(400).json({ error: 'Invalid parentId' });
    }

    const parentFile = parentId !== ROOT_FOLDER_ID ? await dbClient.filesCollection().findOne({ _id: new mongoDBCore.BSON.ObjectId(parentId) }) : null;

    if (parentFile && parentFile.type !== VALID_FILE_TYPES.FOLDER) {
      return res.status(400).json({ error: 'Parent is not a folder' });
    }

    const userId = user._id.toString();
    const baseDir = process.env.FOLDER_PATH?.trim() || joinPath(tmpdir(), DEFAULT_ROOT_FOLDER);

    const newFile = {
      userId: new mongoDBCore.BSON.ObjectId(userId),
      name,
      type,
      isPublic,
      parentId: parentId === ROOT_FOLDER_ID ? '0' : new mongoDBCore.BSON.ObjectId(parentId),
    };

    await mkDirAsync(baseDir, { recursive: true });

    if (type !== VALID_FILE_TYPES.FOLDER) {
      const localPath = joinPath(baseDir, uuidv4());
      await writeFileAsync(localPath, Buffer.from(data, 'base64'));
      newFile.localPath = localPath;
    }

    const insertionInfo = await dbClient.filesCollection().insertOne(newFile);
    const fileId = insertionInfo.insertedId.toString();

    if (type === VALID_FILE_TYPES.IMAGE) {
      const jobName = `Image thumbnail [${userId}-${fileId}]`;
      fileQueue.add({ userId, fileId, name: jobName });
    }

    res.status(201).json({
      id: fileId,
      userId,
      name,
      type,
      isPublic,
      parentId: parentId === ROOT_FOLDER_ID ? 0 : parentId,
    });
  }

  /**
   * Retrieves file details.
   * @param {Request} req The Express request object.
   * @param {Response} res The Express response object.
   */
  static async getShow(req, res) {
    const { user } = req;
    const id = req.params.id || NULL_ID;
    const userId = user._id.toString();

    const file = await dbClient.filesCollection().findOne({
      _id: new mongoDBCore.BSON.ObjectId(isValidId(id) ? id : NULL_ID),
      userId: new mongoDBCore.BSON.ObjectId(isValidId(userId) ? userId : NULL_ID),
    });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.status(200).json({
      id,
      userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId === ROOT_FOLDER_ID.toString() ? 0 : file.parentId.toString(),
    });
  }

  /**
   * Retrieves files for the current user.
   * @param {Request} req The Express request object.
   * @param {Response} res The Express response object.
   */
  static async getIndex(req, res) {
    const { user } = req;
    const parentId = req.query.parentId || ROOT_FOLDER_ID.toString();
    const page = Number.parseInt(req.query.page || '0', 10) || 0;

    const filesFilter = {
      userId: user._id,
      parentId: parentId === ROOT_FOLDER_ID.toString() ? parentId : new mongoDBCore.BSON.ObjectId(isValidId(parentId) ? parentId : NULL_ID),
    };

    const files = await dbClient.filesCollection().aggregate([
      { $match: filesFilter },
      { $sort: { _id: -1 } },
      { $skip: page * MAX_FILES_PER_PAGE },
      { $limit: MAX_FILES_PER_PAGE },
      {
        $project: {
          _id: 0,
          id: '$_id',
          userId: '$userId',
          name: '$name',
          type: '$type',
          isPublic: '$isPublic',
          parentId: {
            $cond: { if: { $eq: ['$parentId', '0'] }, then: 0, else: '$parentId' },
          },
        },
      },
    ]).toArray();

    res.status(200).json(files);
  }

  /**
   * Publishes a file.
   * @param {Request} req The Express request object.
   * @param {Response} res The Express response object.
   */
  static async putPublish(req, res) {
    const { user } = req;
    const { id } = req.params;
    const userId = user._id.toString();

    const fileFilter = {
      _id: new mongoDBCore.BSON.ObjectId(isValidId(id) ? id : NULL_ID),
      userId: new mongoDBCore.BSON.ObjectId(isValidId(userId) ? userId : NULL_ID),
    };

    const file = await dbClient.filesCollection().findOne(fileFilter);

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    await dbClient.filesCollection().updateOne(fileFilter, { $set: { isPublic: true } });

    res.status(200).json({
      id,
      userId,
      name: file.name,
      type: file.type,
      isPublic: true,
      parentId: file.parentId === ROOT_FOLDER_ID.toString() ? 0 : file.parentId.toString(),
    });
  }

  /**
   * Unpublishes a file.
   * @param {Request} req The Express request object.
   * @param {Response} res The Express response object.
   */
  static async putUnpublish(req, res) {
    const { user } = req;
    const { id } = req.params;
    const userId = user._id.toString();

    const fileFilter = {
      _id: new mongoDBCore.BSON.ObjectId(isValidId(id) ? id : NULL_ID),
      userId: new mongoDBCore.BSON.ObjectId(isValidId(userId) ? userId : NULL_ID),
    };

    const file = await dbClient.filesCollection().findOne(fileFilter);

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    await dbClient.filesCollection().updateOne(fileFilter, { $set: { isPublic: false } });

    res.status(200).json({
      id,
      userId,
      name: file.name,
      type: file.type,
      isPublic: false,
      parentId: file.parentId === ROOT_FOLDER_ID.toString() ? 0 : file.parentId.toString(),
    });
  }

  /**
   * Retrieves the content of a file.
   * @param {Request} req The Express request object.
   * @param {Response} res The Express response object.
   */
  static async getFile(req, res) {
    const user = await getUserFromXToken(req);
    const { id } = req.params;
    const size = req.query.size || null;
    const userId = user._id.toString();

    const file = await dbClient.filesCollection().findOne({
      _id: new mongoDBCore.BSON.ObjectId(isValidId(id) ? id : NULL_ID),
      userId: new mongoDBCore.BSON.ObjectId(isValidId(userId) ? userId : NULL_ID),
    });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (file.type === VALID_FILE_TYPES.FOLDER) {
      return res.status(400).json({ error: 'Cannot retrieve content for folders' });
    }

    if (size) {
      const statFile = await statAsync(file.localPath);
      const fileSize = statFile.size;

      if (size > fileSize) {
        return res.status(416).json({ error: 'Requested range not satisfiable' });
      }
    }

    const fileContent = await readFileAsync(file.localPath, { encoding: 'base64' });
    const mimeType = contentType(file.name) || 'application/octet-stream';

    res.setHeader('Content-Type', mimeType);
    res.status(200).send(fileContent);
  }
}

