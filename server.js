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
const SIZE = 1024
debug('SMALL SIZE', SIZE)

// Connect to a database file
const db = new sqlite3.cached.Database(path.join(__dirname, process.env.DB_NAME || 'cam.db'), (err, result) => {
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

function smallResize (from, to) {
  return sharp(from)
    .resize(SIZE, SIZE)
    .max()
    .rotate()
    .withoutEnlargement()
    .toFile(to)
}

function generateSmallImages (fileName) {
  const range = '10 second'
  db.all(`
    SELECT file_name
    FROM (select date_time_created FROM image WHERE file_name = '${fileName}') AS source, image
    WHERE image.date_time_created BETWEEN datetime(source.date_time_created, '-${range}') AND datetime(source.date_time_created, '+${range}') and image.date_time_created <> source.date_time_created
  `, (err, result) => {
    if (err) {
      debug(err)
    }
    debug('found %s photos around that one', result.length)

    // TODO add fs.access test before calling sharp
    if (result.length > 0) {
      result.map(i => i.file_name).forEach(i => {
        debug('optimistic resize %s', i)
        smallResize(path.join(STORAGE_PATH, i), path.join(SMALL_PATH, i)).catch(debug)
      })
    }
  })
}

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
  const name = req.params.image
  const sourceImagePath = path.join(STORAGE_PATH, name)
  const smallImagePath = path.join(SMALL_PATH, name)
  debug('creating image with sharp', smallImagePath)
  sharp(sourceImagePath)
    .resize(SIZE, SIZE)
    .max()
    .rotate()
    .withoutEnlargement()
    .toFile(smallImagePath)
    .then(() => {
      debug('done creating image')
      next()
      if (process.env.OPTIMISTIC_SMALL === 'true') {
        generateSmallImages(name)
      }
    })
    .catch(err => {
      if (err.message === 'Input file is missing or of an unsupported image format') {
        res.status(404).end()
      }
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
app.get('/:all?', function (req, res, next) {
  // TODO add back paging
  // const pageSize = (3 * 5)
  // debug('page', req.query.page)
  // const offset = req.query.page ? ((parseInt(req.query.page, 10) - 1) * pageSize) : 0
  // debug('offset', offset)
  // db.all(`SELECT file_name, thumbnail, date_time_created FROM image ${req.params.all === 'all' ? '' : dateRangeStatement} ORDER BY date_time_created DESC LIMIT ${pageSize} OFFSET ${offset}`, (err, result) => {
  const dateRangeStatement = `where date_time_created BETWEEN datetime('now', '-1 day') AND datetime('now') `
  db.all(`SELECT file_name, thumbnail, date_time_created FROM image ${req.params.all === 'all' ? '' : dateRangeStatement} ORDER BY date_time_created DESC`, (err, result) => {
    if (err) {
      next(err)
    }
    debug('found %s photos', result.length)
    const list = result.map(i => {
      return {
        name: i.file_name,
        date: new Date(i.date_time_created.replace(/-/g, '/')).valueOf(),
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
