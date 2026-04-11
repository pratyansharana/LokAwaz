module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', {
        alias: {
          'react-native-worklets': 'react-native-worklets-core',
        },
      }],
      'react-native-worklets-core/plugin',
      'react-native-reanimated/plugin', // Must be last
    ],
  };
};