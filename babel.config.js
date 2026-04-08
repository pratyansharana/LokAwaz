module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-vision-camera/plugin',
      'react-native-reanimated/plugin', // THIS MUST BE LAST
    ],
  };
};