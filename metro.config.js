// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add the PCP framework directory to watch folders
config.watchFolders = [path.resolve(__dirname, '../pcp')];

// Ensure resolver looks in the correct places
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../pcp/node_modules'),
];

module.exports = withNativeWind(config, { input: './global.css' });
