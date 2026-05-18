/**
 * Security routes
 */

import express from 'express';
import * as securityController from '../controllers/security.controller.js';

const router = express.Router();

router.post('/scan', securityController.runSecurityScan);
router.get('/report/:repoId', securityController.getSecurityReport);

export default router;
