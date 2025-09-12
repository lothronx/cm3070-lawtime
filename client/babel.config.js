module.exports = function (api) {
  const isTest = api.env('test');
  api.cache.using(() => isTest);

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module:react-native-dotenv",
        {
          moduleName: "@env",
          path: isTest ? ".env.test" : ".env.local",
          blacklist: null,
          whitelist: null,
          safe: false,
          allowUndefined: true,
        },
      ],
    ],
  };
};
