const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

const extractPlugin = new ExtractTextPlugin({filename: './app.css'});

const config = {
    context: path.resolve(__dirname, 'src'),
    entry: {
        app: ['./app.ts', './app.css']
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'app.js'
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/, loader: 'ts-loader'
            },
            {
                test: /\.css$/,
                use: extractPlugin.extract({
                    use: [
                        'css-loader'
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
        contentBase: path.resolve(__dirname, './dist/assets/media'),
        compress: true,
        port: 12000,
        stats: 'errors-only',
        open: false
    }
};

module.exports = config;
