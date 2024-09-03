const express = require('express');
const AppController = require('../controllers/AppController');
const UsersController = require('../controllers/UsersController');  // Import UsersController
const AuthController = require('../controllers/AuthController');    // Import AuthController
const UserController = require('../controllers/UserController');    // Import UserController
const FilesController = require('../controllers/FilesController');  // Import FilesController

const router = express.Router();

// define endpoints
router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);
router.post('/users', UsersController.postNew);
router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisconnect);
router.get('/users/me', UserController.getMe);
router.post('/files', FilesController.postUpload);
router.get('/files/:id', FilesController.getShow);
router.get('/files', FilesController.getIndex);
router.put('/files/:id/publish', FilesController.putPublish);
router.put('/files/:id/publish', FilesController.putUnpublish);
router.get('/files/:id/data', FilesController.getFile);

export default router;
