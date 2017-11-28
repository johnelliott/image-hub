const debug = require('debug')('hub:server')
const path = require('path')
const express = require('express')
const sqlite3 = require('sqlite3').verbose()
const { createImages } = require('./lib/schema.js')
const matt = require('./treatments/matt-story.js')
const formatBase64 = require('./lib/exiftool-b64-to-web-b64.js')
const sharp = require('sharp')

require('dotenv').config()
const STORAGE_PATH = process.env.STORAGE_PATH
if (!STORAGE_PATH) {
  console.error(new Error('STORAGE_PATH'))
  process.exit(1)
}
debug('STORAGE_PATH', STORAGE_PATH)

const STORIES_PATH = process.env.STORIES_PATH
if (!STORIES_PATH) {
  console.error(new Error('no STORIES_PATH'))
  process.exit(1)
}
debug('STORIES_PATH', STORIES_PATH)

const SMALL_PATH = process.env.SMALL_PATH
if (!SMALL_PATH) {
  console.error(new Error('no SMALL_PATH'))
  process.exit(1)
}
debug('SMALL_PATH', SMALL_PATH)

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
app.set('env', process.env.NODE_ENV)
app.set('views', path.join(__dirname, 'views')) // general config
app.set('view engine', 'pug')

app.get('/stories/:image', function (req, res, next) {
  debug('image', req.params.image)
  const sourceImagePath = path.join(STORAGE_PATH, req.params.image)
  const imageMattPath = path.join(STORIES_PATH, req.params.image)
  debug('matt path', imageMattPath)
  return matt(sourceImagePath, imageMattPath).then(() => {
    debug('done creating image')
    next()
  })
})

app.get('/small/:image', function (req, res, next) {
  debug('image', req.params.image)
  const sourceImagePath = path.join(STORAGE_PATH, req.params.image)
  const SIZE = 1024
  const smallImagePath = path.join(SMALL_PATH, req.params.image)
  debug('creating image with sharp', smallImagePath)
  return sharp(sourceImagePath)
    .resize(SIZE, SIZE)
    .max()
    .withoutEnlargement()
    .toFile(smallImagePath)
    .then(() => {
      debug('done creating image')
      next()
    })
})
app.use('/stories/', express.static(STORIES_PATH))
app.use('/small/', express.static(SMALL_PATH))
app.use('/storage/', express.static(STORAGE_PATH))
/**
 * Get a gallery or JSON for gallery
 * query param is page
 * resolves with array of SELECT * from image table
 */
app.get('/', function (req, res, next) {
  // TODO add back paging
  // const pageSize = (3 * 5)
  // debug('page', req.query.page)
  // const offset = req.query.page ? ((parseInt(req.query.page, 10) - 1) * pageSize) : 0
  // debug('offset', offset)
  // db.all(`SELECT * from image LIMIT ${pageSize} OFFSET ${offset}`, (err, result) => {
  db.all(`SELECT file_name, thumbnail from image`, (err, result) => {
    if (err) {
      next(err)
    }
    debug('Found %s photos', result.length)
    // If we get no content
    if (result.length === 0) {
      return res.status(204).end()
    }
    const list = result.map(i => {
      return {
        name: i.file_name,
        fullHref: `/${path.basename(STORAGE_PATH)}/${i.file_name}`,
        smallHref: `/${path.basename(SMALL_PATH)}/${i.file_name}`,
        igStoryHref: `/${path.basename(STORIES_PATH)}/${i.file_name}`,
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
  return res.status(404).end()
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
