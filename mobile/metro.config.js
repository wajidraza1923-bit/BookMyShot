const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ensure Metro only resolves within the mobile directory
// and never picks up the root package.json (which has main: server/index.js)
config.projectRoot = __dirname;
config.watchFolders = [__dirname];

// Block resolution to parent directories
config.resolver.blockList = [
  /\.\.\/server\/.*/,
  /\.\.\/public\/.*/,
  /\.\.\/android\/.*/,
];

module.exports = config;
