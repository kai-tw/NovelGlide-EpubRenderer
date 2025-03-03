const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');

module.exports = (evn, argv) => {
    let config = {
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
                                    ['@babel/preset-env', {
                                        useBuiltIns: false,
                                    }],
                                    ['@babel/preset-typescript', {
                                        useBuiltIns: false,
                                    }],
                                ],
                                include: [
                                    path.resolve('src/'),
                                ],
                                plugins: [
                                    ['@babel/plugin-transform-runtime', {
                                        corejs: {version: 3},
                                        helpers: true,
                                        regenerator: true,
                                    }],
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
                                    ['@babel/preset-env', {
                                        useBuiltIns: false,
                                    }],
                                ],
                                include: [
                                    path.resolve('src/'),
                                ],
                                plugins: [
                                    ['@babel/plugin-transform-runtime', {
                                        corejs: {version: 3},
                                        helpers: true,
                                        regenerator: true,
                                    }],
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

    if (argv.mode === "development") {
        config.plugins.unshift(new CopyWebpackPlugin({
            patterns: [
                {from: 'book.epub', to: 'book.epub'}
            ]
        }));
        config.entry = {
            'index.js': [
                path.resolve(__dirname, 'src/index.js'),
                path.resolve(__dirname, 'src/Debug.ts')
            ]
        };
    }

    return config;
};