const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');

module.exports = {
    mode: 'production',
    context: path.resolve(__dirname, 'src'),
    entry: './index.js',
    resolve: {
        alias: {
            '@src': path.resolve(__dirname, 'src'),
        },
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'index.js',
    },
    module: {
        rules: [
            {
                test: /\.(s[ac])|(c)ss$/i,
                use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"]
            }
        ],
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                { from: 'book.epub', to: 'book.epub' }
            ]
        }),
        new HtmlWebpackPlugin({
            title: 'NovelGlide',
            filename: 'index.html',
            template: 'index.html',
            viewport: 'width=device-width, initial-scale=1.0',
            minify: true,
        }),
        new MiniCssExtractPlugin()
    ],
    performance: {
        maxEntrypointSize: 1024000,
        maxAssetSize: 1024000,
    },
};