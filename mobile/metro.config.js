const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ensure Metro ONLY resolves within the mobile directory
config.projectRoot = __dirname;
config.watchFolders = [__dirname];

// Force module resolution to ONLY look in mobile/node_modules
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

// Block parent directory content from being bundled (cross-platform)
const parentDir = path.resolve(__dirname, '..');
// Use a platform-aware separator for regex
const sep = path.sep === '\\' ? '\\\\' : '/';
const escParent = parentDir.replace(/[\\/]/g, sep);

config.resolver.blockList = [
  new RegExp(escParent + sep + 'server' + sep + '.*'),
  new RegExp(escParent + sep + 'public' + sep + '.*'),
  new RegExp(escParent + sep + 'node_modules' + sep + '.*'),
  new RegExp(escParent + sep + 'package\\.json$'),
  /node_modules\/.*\/node_modules/,
];

module.exports = config;
