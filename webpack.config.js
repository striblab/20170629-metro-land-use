/**
 * Webpack config for building project
 * https://webpack.js.org/
 */
const path = require('path');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
  devtool: 'source-map',
  entry: {
    app: './app/index.js',
    'pym-wrapper': './app/pym-wrapper.js'
  },
  output: {
    path: path.resolve(__dirname, './build'),
    filename: '[name].bundle.js'
  },
  module: {
    rules: [
      {
        test: /app\/.*\.js$/,
        loader: 'babel-loader',
        options: {
          cacheDirectory: true
        }
      }
    ]
  },
  plugins: [
    new UglifyJSPlugin({
      sourceMap: true
    })
  ]
};
