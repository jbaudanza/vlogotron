var WebpackNotifierPlugin = require('webpack-notifier');

module.exports = {
  entry: './js/demo.js',
  output: {
    filename: 'public/[name].js',
    path: __dirname
  },
  plugins: [
    new WebpackNotifierPlugin(),
  ],
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel-loader',
        query: {
          presets: [["es2015", { "modules": false }], "react"]
        }
      },
      {
        test: /\.scss$/,
        loaders: ["style-loader", "css-loader", "sass-loader"]
      },
      {
        test: /\.css$/,
        loaders: ["style-loader", "css-loader", "sass-loader"]
      },
    ]
  }
};