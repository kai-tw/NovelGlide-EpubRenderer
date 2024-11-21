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
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'index.js',
        environment: {
            arrowFunction: false,
            bigIntLiteral: false,
            const: false,
            destructuring: false,
            dynamicImport: false,
            forOf: false,
            module: false,
        },
    },
    target: ['web', 'es5'],
    module: {
        rules: [
            {
                test: /\.(s[ac])|(c)ss$/i,
                use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"]
            },
            {
                test: /\.ts$/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                [
                                    '@babel/preset-env',
                                    {
                                        useBuiltIns: 'usage',
                                        modules: false,
                                        corejs: 3,
                                    },
                                ],
                                [
                                    '@babel/preset-typescript',
                                    {
                                        useBuiltIns: 'usage',
                                        modules: false,
                                        corejs: 3,
                                    },
                                ],
                            ],
                            include: [
                                path.resolve('src/'),
                            ],
                        },
                    }
                ]
            },
            {
                test: /\.js$/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                [
                                    '@babel/preset-env',
                                    {
                                        useBuiltIns: 'usage',
                                        modules: false,
                                        corejs: 3,
                                    },
                                ],
                            ],
                            include: [
                                path.resolve('src/'),
                                // path.resolve('node_modules/epubjs/'),
                            ],
                        },
                    }
                ]
            }
        ],
    },
    plugins: [
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
    node: {
        global: true,
    }
};