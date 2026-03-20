'use strict';

const { v4: uuidv4 } = require('uuid');
const BaseModel = require('./base.model');
const { select, insert, update } = require('../lib/supabase');

const VALID_TARGETS = [
  'global',
  'customer_web', 'rider_web', 'vendor_web', 'superadmin_web',
  'customer_mobile', 'rider_mobile', 'vendor_mobile',
];

/** Keys merged from theme JSON but exposed as top-level in /api/public/theme (not CSS variables). */
const BRANDING_KEYS = ['appName', 'logoUrl'];

function pickBranding(mergedLight, mergedDark) {
  const fromLight = {};
  const fromDark = {};
  for (const k of BRANDING_KEYS) {
    if (mergedLight && mergedLight[k] != null && mergedLight[k] !== '') {
      fromLight[k] = mergedLight[k];
    }
    if (mergedDark && mergedDark[k] != null && mergedDark[k] !== '') {
      fromDark[k] = mergedDark[k];
    }
  }
  return {
    appName: fromLight.appName || fromDark.appName || undefined,
    logoUrl: fromLight.logoUrl || fromDark.logoUrl || undefined,
  };
}

function stripBrandingKeys(obj) {
  if (!obj || typeof obj !== 'object') return {};
  const next = { ...obj };
  for (const k of BRANDING_KEYS) delete next[k];
  return next;
}

class PlatformThemeModel extends BaseModel {
  constructor() {
    super('platform_themes');
  }

  async list(workspaceId) {
    const filters = {};
    if (workspaceId) filters.workspace_id = workspaceId;
    return select(this.table, { filters, order: 'app_target.asc' });
  }

  async listPlatformLevel() {
    return select(this.table, {
      filters: { workspace_id: null },
      order: 'app_target.asc',
    });
  }

  async findByTarget(appTarget, workspaceId) {
    const filters = { app_target: appTarget };
    if (workspaceId) {
      filters.workspace_id = workspaceId;
    } else {
      filters.workspace_id = null;
    }
    const rows = await select(this.table, { filters, limit: 1 });
    return rows?.[0] || null;
  }

  async upsert(appTarget, workspaceId, lightTheme, darkTheme) {
    if (!VALID_TARGETS.includes(appTarget)) {
      throw new Error(`Invalid app_target: ${appTarget}`);
    }
    const now = new Date().toISOString();
    const existing = await this.findByTarget(appTarget, workspaceId);

    if (existing) {
      const rows = await update(this.table, {
        light_theme: lightTheme,
        dark_theme: darkTheme,
        updated_at: now,
      }, { id: existing.id });
      return Array.isArray(rows) ? rows[0] : rows;
    }

    return super.create({
      id: uuidv4(),
      app_target: appTarget,
      workspace_id: workspaceId || null,
      light_theme: lightTheme,
      dark_theme: darkTheme,
      created_at: now,
      updated_at: now,
    });
  }

  /**
   * Resolve the effective theme for a given app and optional workspace.
   * Priority: workspace+app > workspace+global > platform+app > platform+global.
   */
  async resolve(appTarget, workspaceId) {
    const layers = [];

    const platformGlobal = await this.findByTarget('global', null);
    if (platformGlobal) layers.push(platformGlobal);

    if (appTarget !== 'global') {
      const platformApp = await this.findByTarget(appTarget, null);
      if (platformApp) layers.push(platformApp);
    }

    if (workspaceId) {
      const wsGlobal = await this.findByTarget('global', workspaceId);
      if (wsGlobal) layers.push(wsGlobal);

      if (appTarget !== 'global') {
        const wsApp = await this.findByTarget(appTarget, workspaceId);
        if (wsApp) layers.push(wsApp);
      }
    }

    if (layers.length === 0) return null;

    const mergedLight = {};
    const mergedDark = {};
    for (const layer of layers) {
      const lt = typeof layer.light_theme === 'string' ? JSON.parse(layer.light_theme) : layer.light_theme;
      const dt = typeof layer.dark_theme === 'string' ? JSON.parse(layer.dark_theme) : layer.dark_theme;
      Object.assign(mergedLight, lt);
      Object.assign(mergedDark, dt);
    }

    const { appName, logoUrl } = pickBranding(mergedLight, mergedDark);
    const light = stripBrandingKeys(mergedLight);
    const dark = stripBrandingKeys(mergedDark);

    const out = { light, dark };
    if (appName) out.appName = appName;
    if (logoUrl) out.logoUrl = logoUrl;
    return out;
  }
}

module.exports = new PlatformThemeModel();
