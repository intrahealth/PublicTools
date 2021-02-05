module.exports = {
  publicPath: "/",
  outputDir: "../server/gui",
  transpileDependencies: ["vuetify"],
  devServer: {
    host: "localhost",
    proxy: {
      "/": {
        target: "http://localhost:3004",
        secure: false,
        changeOrigin: true
      }
    }
  }
}
