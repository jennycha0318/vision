// Vercel 서버 함수: Expo가 만든 서버 빌드(dist/server)로 페이지와 API 라우트를 처리한다
const { createRequestHandler } = require('expo-server/adapter/vercel');

module.exports = createRequestHandler({
  build: require('path').join(__dirname, '../dist/server'),
});
