module.exports = {
  expo: {
    name: 'mobile',
    slug: 'mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'mobile',
    userInterfaceStyle: 'automatic',
    ios: {
      icon: './assets/expo.icon',
      bundleIdentifier: 'com.billchon.runningplan',
    },
    android: {
      package: 'com.billchon.runningplan',
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#208AEF',
          image: './assets/images/splash-icon.png',
          imageWidth: 76,
        },
      ],
      [
        '@mj-studio/react-native-naver-map',
        {
          // Issue a Client ID at https://console.ncloud.com (Naver Cloud Platform > Maps).
          // Read from env (not EXPO_PUBLIC_-prefixed: this only needs to exist at prebuild time).
          client_id: process.env.NAVER_MAP_CLIENT_ID ?? '',
        },
      ],
      [
        'expo-build-properties',
        {
          android: {
            extraMavenRepos: ['https://repository.map.naver.com/archive/maven'],
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  },
};
