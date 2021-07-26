const fs = require('fs').promises
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const package = require('./package.json')
const express = require('express')

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  context: path.resolve(__dirname, 'src'),
  entry: './index.ts',
  output: {
    filename: '[hash].js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.ts$/i,
        loader: 'ts-loader',
      },
      {
        test: /\.s[ac]ss/i,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
      {
        test: /\.csv$/i,
        loader: 'csv-loader',
        options: {
          dynamicTyping: false,
          header: true,
          skipEmptyLines: true,
        },
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: package.name,
      scriptLoading: 'defer',
    }),
  ],
  devServer: {
    port: 3000,
    inline: true,
    hot: true,
    before: app => {
      app.use(
        express.raw({
          type: '*/*',
          limit: '2mb',
        })
      )
      app.post('/dest', async (req, res) => {
        const session = req.query.session
        const id = req.query.id

        if (!session) {
          res.status(400).send('Invalid session')
          return
        }

        if (!id) {
          res.status(400).send('Invalid id')
          return
        }

        if (!req.body) {
          res.status(400).send('Invalid body')
          return
        }

        console.log(id)

        const sessionDir = path.resolve(
          process.env[process.platform == 'win32' ? 'USERPROFILE' : 'HOME'],
          'Downloads',
          session
        )
        const outFile = path.resolve(sessionDir, id + '.png')

        try {
          await fs.mkdir(sessionDir, { recursive: true })
          await fs.writeFile(outFile, req.body)
          res.send(outFile)
        } catch (e) {
          console.error(e)
          res.status(500).send(e)
        }
      })
    },
  },
}
