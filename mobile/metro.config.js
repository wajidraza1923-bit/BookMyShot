const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// CRITICAL: Ensure Metro ONLY resolves within the mobile directory
// This prevents it from finding the root package.json which has "main": "server/index.js"
config.projectRoot = __dirname;
config.watchFolders = [__dirname];

// Force module resolution to ONLY look in mobile/node_modules
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

// Block all parent directory content from being bundled
const parentDir = path.resolve(__dirname, '..');
const escParent = parentDir.replace(/[\\\/]/g, '[\\\\\\\/]');
config.resolver.blockList = [
  new RegExp(escParent + '[\\\\\\\/]server[\\\\\\\/].*'),
  new RegExp(escParent + '[\\\\\\\/]public[\\\\\\\/].*'),
  new RegExp(escParent + '[\\\\\\\/]android[\\\\\\\/].*'),
  new RegExp(escParent + '[\\\\\\\/]node_modules[\\\\\\\/].*'),
  new RegExp(escParent + '[\\\\\\\/]package\\.json$'),
  /node_modules\/.*\/node_modules/,
];

// Prevent Metro from resolving to parent package.json
// Note: disableHierarchicalLookup can break some module resolution
// Instead, nodeModulesPaths + blockList handles it

module.exports = config;
