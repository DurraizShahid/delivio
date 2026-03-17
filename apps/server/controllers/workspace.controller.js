'use strict';

const { select, insert, update, supabaseFetch } = require('../lib/supabase');
const { createError } = require('../middleware/error.middleware');

async function getWorkspace(req, res, next) {
  try {
    const rows = await select('workspaces', { filters: { project_ref: req.projectRef } });
    const workspace = rows?.[0];
    if (!workspace) return next(createError('Workspace not found', 404));
    return res.json({ workspace });
  } catch (err) {
    next(err);
  }
}

async function updateWorkspace(req, res, next) {
  try {
    const rows = await update('workspaces', req.body, { project_ref: req.projectRef });
    return res.json({ workspace: Array.isArray(rows) ? rows[0] : rows });
  } catch (err) {
    next(err);
  }
}

async function getBlockContent(req, res, next) {
  try {
    const rows = await select('block_content', { filters: { project_ref: req.projectRef } });
    return res.json({ blocks: rows || [] });
  } catch (err) {
    next(err);
  }
}

async function saveBlockContent(req, res, next) {
  try {
    const { blocks } = req.body;
    if (!Array.isArray(blocks)) {
      return next(createError('blocks must be an array', 400));
    }

    // Upsert each block
    const results = await Promise.all(
      blocks.map(async (block) => {
        const existing = await select('block_content', {
          filters: { project_ref: req.projectRef, block_id: block.blockId },
        });
        if (existing?.[0]) {
          return update('block_content', block, {
            project_ref: req.projectRef,
            block_id: block.blockId,
          });
        }
        const { v4: uuidv4 } = require('uuid');
        return insert('block_content', {
          id: uuidv4(),
          project_ref: req.projectRef,
          block_id: block.blockId,
          ...block,
          created_at: new Date().toISOString(),
        });
      })
    );

    return res.json({ ok: true, count: results.length });
  } catch (err) {
    next(err);
  }
}

module.exports = { getWorkspace, updateWorkspace, getBlockContent, saveBlockContent };
