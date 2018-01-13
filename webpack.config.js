const {resolve, join} = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const autoprefixer = require('autoprefixer');

const extractPlugin = new ExtractTextPlugin({filename: './app.css'});

const config = {
  context: resolve(__dirname, 'src'),
  devtool: 'source-map',
  entry: {
    app: ['./app.ts'],
    vendor: [
      'preact',
      'preact-compat',
      'material-ui',
      'mobx',
      'mobx-preact'
    ]
  },
  output: {
    path: resolve(__dirname, 'dist'),
    filename: '[name].[hash].js',
    chunkFilename: '[name].[hash].js'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    alias: {
      react: 'preact-compat',
      'react-dom': 'preact-compat'
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/, loader: 'ts-loader'
      },
      {
        test: /\.(css|styl)$/,
        use: extractPlugin.extract({
          use: [
            {
              loader: 'css-loader'
            }, {
              loader: 'postcss-loader',
              options: {
                modules: true,
                sourceMap: true,
                plugins: [
                  autoprefixer({
                    browsers: ['last 3 version']
                  })
                ]
              }
            }, {
              loader: 'stylus-loader',
              options: {
                includePaths: [
                  join(__dirname, 'src')
                ]
              }
            }
          ],
          fallback: 'style-loader'
        })
      }, {
        test: /\.(jpg|png|gif|svg)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: './assets/media/'
            }
          }
        ]
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: './assets/fonts/'
              //publicPath: './assets/fonts/'
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({template: 'app.html'}),
    extractPlugin,
    new CleanWebpackPlugin(['dist'])
  ],
  devServer: {
    contentBase: resolve(__dirname, './dist/assets/media'),
    compress: true,
    port: 12000,
    stats: 'errors-only',
    open: false
  }
};

module.exports = config;
