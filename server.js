const debug = require('debug')('hub:server')
const os = require('os')
const path = require('path')
const express = require('express')
const sqlite3 = require('sqlite3').verbose()
const { createImages } = require('./lib/schema.js')
const matt = require('./treatments/matt-story.js')
const formatBase64 = require('./lib/exiftool-b64-to-web-b64.js')
const { URL, URLSearchParams } = require('url')

require('dotenv').config()
const STORAGE_PATH = process.env.STORAGE_PATH
if (!STORAGE_PATH) {
  console.error(new Error('STORAGE_PATH'))
  process.exit(1)
}
debug('STORAGE_PATH', STORAGE_PATH)
const CROP_PATH = process.env.CROP_PATH
if (!CROP_PATH) {
  console.error(new Error('no CROP_PATH'))
  process.exit(1)
}
debug('CROP_PATH', CROP_PATH)

const HOSTNAME = os.hostname()

// Connect to a database file
const db = new sqlite3.cached.Database(path.join(__dirname, 'cam.db'), (err, result) => {
  if (err) {
    return debug('db open error', err)
  }
  debug('db open')
  return db.run(createImages, (err, result) => {
    if (err && err.message.match(/table image already exists/)) {
      debug('image table exists')
    } else if (err) {
      return debug('db create iamge table error', err)
    }
  })
})

var app = express()
app.disable('x-powered-by')
app.set('env', process.env.NODE_ENV)
app.set('views', path.join(__dirname, 'views')) // general config
app.set('view engine', 'pug')

app.use('/favicon.ico', function (req, res, next) {
  res.status(404).end()
})

/**
 * Redirect to an image in the database to get served by nginx
 */
app.use('/:image', function (req, res, next) {
  debug('image', req.params.image)
  db.get(`SELECT full_path, file_name FROM image WHERE file_name = "${req.params.image}"`, (err, result) => {
    if (err) {
      debug(err)
      return res.status(404).end(err)
    }
    debug('found image', result)

    if (req.query.t === 'story') {
      debug('story watned')
      const imageMattPath = path.join(CROP_PATH, result.file_name)
      debug('matt path', imageMattPath)
      return matt(result.full_path, imageMattPath).then(() => {
        const redirectUrl = `http://${path.join(HOSTNAME, path.relative(__dirname, imageMattPath))}`
        debug('matt redirectUrl', redirectUrl)
        res.redirect(redirectUrl)
      })
    }
    // Redirect to basic image
    const redirectUrl = `http://${path.join(HOSTNAME, path.relative(__dirname, result.full_path))}`
    debug('redirectUrl', redirectUrl)
    res.redirect(redirectUrl)
  })
})

/**
 * Get a gallery or JSON for gallery
 * query param is page
 * resolves with array of SELECT * from image table
 */
app.use('/', function (req, res, next) {
  // TODO add back paging
  const pageSize = (3 * 5)
  // debug('page', req.query.page)
  const offset = req.query.page ? ((parseInt(req.query.page, 10) - 1) * pageSize) : 0
  // debug('offset', offset)
  db.all(`SELECT * from image LIMIT ${pageSize} OFFSET ${offset}`, (err, result) => {
    if (err) {
      debug(err)
      return res.status(404).end(err)
    }
    debug('Found %s photos', result.length)
    // If we get no content
    if (result.length === 0) {
      return res.status(204).end()
    }
    const list = result.map(i => {
      const imagePath = path.relative(STORAGE_PATH, i.file_name)
      const imageLink = new URL(imagePath, `http://${HOSTNAME}:${process.env.PORT}`)
      imageLink.searchParams.append('t', 'story')
      return {
        name: i.file_name,
        dateTimeCreated: i.date_time_created,
        href: imageLink.href,
        b64i: formatBase64(i.thumbnail)
      }
    })
    return res.format({
      'text/html': function () {
        res.render('list', { list })
      },
      'text/plain': function () {
        res.render('list', { list })
      },
      'application/json': function () {
        res.json(list)
      },
      'default': function () {
        // log the request and respond with 406
        res.status(406).send('Not Acceptable')
      }
    })
  })
})

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found')
  err.status = 404
  next(err)
})

// Error handlers
// Development error handler, will print stacktrace
app.use(function (err, req, res, next) {
  debug('dev error handler', err)
  res.status(err.status || 500)
  res.render('error', {
    message: err.message,
    statusCode: err.status,
    err
  })
})

module.exports = app
