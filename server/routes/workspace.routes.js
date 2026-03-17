'use strict';

const { Router } = require('express');
const workspaceController = require('../controllers/workspace.controller');
const { parseSession, requireAdmin } = require('../middleware/auth.middleware');
const { attachProjectRef, requireProjectRef } = require('../middleware/project-ref.middleware');

const router = Router();

router.use(parseSession, requireAdmin, attachProjectRef, requireProjectRef);

router.get('/:projectRef',          workspaceController.getWorkspace);
router.patch('/:projectRef',        workspaceController.updateWorkspace);
router.get('/:projectRef/blocks',   workspaceController.getBlockContent);
router.post('/:projectRef/blocks',  workspaceController.saveBlockContent);

module.exports = router;
