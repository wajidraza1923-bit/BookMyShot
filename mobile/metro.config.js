const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ensure Metro only resolves within the mobile directory
config.projectRoot = __dirname;
config.watchFolders = [__dirname];

// Block resolution to parent directories and server files
// Use platform-independent patterns that work on Windows and Unix
const parentDir = path.resolve(__dirname, '..');
config.resolver.blockList = [
  new RegExp(parentDir.replace(/[\\\/]/g, '[\\\\\\\/]') + '[\\\\\\\/]server[\\\\\\\/].*'),
  new RegExp(parentDir.replace(/[\\\/]/g, '[\\\\\\\/]') + '[\\\\\\\/]public[\\\\\\\/].*'),
  new RegExp(parentDir.replace(/[\\\/]/g, '[\\\\\\\/]') + '[\\\\\\\/]android[\\\\\\\/].*'),
  /node_modules\/.*\/node_modules/,
];

// Prevent Metro from following symlinks to parent
// Note: disableHierarchicalLookup breaks module resolution in some cases
// Instead rely on projectRoot + watchFolders + blockList

module.exports = config;
