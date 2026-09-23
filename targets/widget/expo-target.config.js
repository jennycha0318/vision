/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'VisionWidget',
  displayName: '비전 보드',
  deploymentTarget: '17.0',
  colors: {
    $accent: '#E07A5F',
    $widgetBackground: '#FBF8F3',
  },
  entitlements: {
    'com.apple.security.application-groups': config.ios.entitlements['com.apple.security.application-groups'],
  },
});
