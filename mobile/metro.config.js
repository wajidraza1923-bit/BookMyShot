const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Keep Metro scoped to the mobile directory only
config.projectRoot = __dirname;
config.watchFolders = [__dirname];

// Only resolve modules from mobile/node_modules
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

// Block server and public directories from being bundled
// Use path.join for cross-platform compatibility (no manual regex escaping)
const parentDir = path.resolve(__dirname, '..');

function blockPath(relPath) {
  // Escape all path separators and dots for use in RegExp
  const full = path.join(parentDir, relPath);
  const escaped = full.replace(/[\\]/g, '\\\\').replace(/\./g, '\\.').replace(/\//g, '\\/');
  return new RegExp('^' + escaped);
}

config.resolver.blockList = [
  blockPath('server'),
  blockPath('public'),
  // Block parent package.json specifically
  new RegExp('^' + parentDir.replace(/[\\]/g, '\\\\').replace(/\./g, '\\.').replace(/\//g, '\\/') + '[/\\\\]package\\.json$'),
];

module.exports = config;
