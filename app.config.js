/** Keeps app.json. The lockup already says Iris, so the loading screen does not print the name again. */
module.exports = ({ config }) => {
  const plugins = (config.plugins ?? []).map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === 'expo-splash-screen') {
      return [
        'expo-splash-screen',
        {
          ...plugin[1],
          backgroundColor: '#f6f6f2',
          image: './assets/images/iris-lockup-light.png',
          resizeMode: 'contain',
          imageWidth: 280,
        },
      ];
    }
    return plugin;
  });

  return {
    ...config,
    name: '\u200b',
    icon: './assets/images/iris-lockup-light.png',
    plugins,
    web: {
      ...config.web,
      favicon: './assets/images/iris-lockup-light.png',
    },
  };
};
