import express from 'express';
import AppController from '../controllers/AppController';

const router = express.Router();

// define endpoints
router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);

export default router;
