const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Keep Metro scoped to the mobile directory only
config.projectRoot = __dirname;
config.watchFolders = [__dirname];

// Block server and public directories from being bundled
const parentDir = path.resolve(__dirname, '..');

function blockPath(relPath) {
  const full = path.join(parentDir, relPath);
  const escaped = full.replace(/[\\]/g, '\\\\').replace(/\./g, '\\.').replace(/\//g, '\\/');
  return new RegExp('^' + escaped);
}

config.resolver.blockList = [
  blockPath('server'),
  blockPath('public'),
  new RegExp('^' + parentDir.replace(/[\\]/g, '\\\\').replace(/\./g, '\\.').replace(/\//g, '\\/') + '[/\\\\]package\\.json$'),
];

module.exports = config;
