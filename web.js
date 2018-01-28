require('dotenv').config()
const debug = require('debug')('hub-aws:server')
const morgan = require('morgan')
const path = require('path')
const express = require('express')
// const multer = require('multer')
const sqlite3 = require('sqlite3').verbose()
const { createUploadTable } = require('./lib/schema.js')
const { getImage } = require('./lib/cloudinary.js')

// Connect to a database file
const db = new sqlite3.cached.Database(path.join(__dirname, process.env.WEB_DB || 'upload.db'), (err, result) => {
  if (err) {
    return debug('db open error', err)
  }
  debug('db open')
  return db.run(createUploadTable, (err, result) => {
    if (err && err.message.match(/table upload already exists/)) {
      debug('upload table exists')
    } else if (err) {
      return debug('db create web table error', err)
    }
  })
})

var app = express()
app.set('env', process.env.NODE_ENV)
const morganLogPreset = app.get('env') === 'development' ? 'dev' : 'combined'
app.use(morgan(morganLogPreset))
app.set('views', path.join(__dirname, 'views')) // general config
app.set('view engine', 'pug')

/**
 * Get publicId from database given fileName
 */
function getPublicId (fileName) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT public_id FROM upload WHERE file_name = '${fileName}'`, (err, result) => {
      if (err) {
        debug(err)
        reject(err)
      }
      debug('found publicId', result)
      resolve(result)
    })
  })
}

app.get('/:image', function (req, res) {
  debug('image', req.params.image)
  getPublicId(req.params.image)
    .then(publicId => {
      res.type('text')
      res.send(getImage(publicId))
    })
})

/**
 * CHOO ROUTE
 */
const choo = require('choo')
const grid = require('./client/grid.js')
const detail = require('./client/detail.js')
const chooApp = choo()
chooApp.route('/', grid)
chooApp.route('/view/:image', detail)

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  return res.format({
    'text/html': function () {
      debug('rendering text/html')
      res.status(404)
      res.render('error', {
        status: res.statusCode,
        statusText: 'Not found'
      })
    },
    'application/json': function () {
      debug('rendering application/json error')
      res.status(404).json({ Error: { status: 404, statusText: 'Not found' } })
      debug('command', res.body.command)
    },
    'default': function () {
      res.sendStatus(404)
    }
  })
})

// Error handlers
// Development error handler, will print stacktrace
app.use(function (err, req, res, next) {
  debug('dev error handler', err)
  res.status(err.status || 500)
  res.render('error', {
    status: err.statusCode,
    statusText: err.message,
    err
  })
})

module.exports = app
