const debug = require('debug')('hub:server')
const path = require('path')
const express = require('express')
const matt = require('./treatments/matt-story.js')
const db = require('./lib/db.js')
const formatBase64 = require('./lib/exiftool-b64-to-web-b64.js')

require('dotenv').config()
const CARD_PATH = process.env.CARD_PATH
if (!CARD_PATH) {
  console.error(new Error('CARD_PATH'))
  process.exit(1)
}
const CROP_PATH = process.env.CROP_PATH
if (!CROP_PATH) {
  console.error(new Error('no CROP_PATH'))
  process.exit(1)
}

const dbPath = path.join(__dirname, 'cam.db')
debug('db path', dbPath)

var app = express()
app.disable('x-powered-by')
app.set('env', process.env.NODE_ENV)
app.set('views', path.join(__dirname, 'views')) // general config
app.set('view engine', 'pug')

app.use('/:folder/:image', function (req, res, next) {
  debug('folder', req.params.folder)
  debug('image', req.params.image)
  const imagePath = path.join(CARD_PATH, req.params.folder, req.params.image)
  const imageMattPath = path.join(CROP_PATH, req.params.image)
  debug('maattt path', imageMattPath)
  matt(imagePath, imageMattPath).then(() => {
    res.redirect(`http://photon.local/crops/${req.params.image}`)
  })
})

/**
 * Redirect to an image in the database to get served by nginx
 */
app.use('/:image', function (req, res, next) {
  debug('image', req.params.image)
  db(dbPath)
    .then(db => db.get(`SELECT full_path FROM image WHERE file_name = "${req.params.image}"`, (err, result) => {
      if (err) {
        debug(err)
        return res.status(404).end(err)
      }
      res.redirect(path.join('localhost:80', path.relative(CARD_PATH, result.full_path)))
    }))
})

/**
 * Get a gallery or JSON for gallery
 * page lenght is 5
 * query param is page
 * resolves with array of SELECT * from image table
 */
app.use('/', function (req, res, next) {
  debug('page', req.query.page)
  const pageSize = 5
  const offset = req.query.page ? ((parseInt(req.query.page, 10) - 1) * pageSize) : 0
  debug('offset', offset)
  db(dbPath)
    .then(db => db.all(`SELECT * from image LIMIT ${pageSize} OFFSET ${offset}`, (err, result) => {
      if (err) {
        debug(err)
        return res.status(404).end(err)
      }
      debug('db got', result)
      const list = result.map(i => {
        return {
          name: i.file_name,
          dateTimeCreated: i.date_time_created,
          href: path.relative(CARD_PATH, i.file_name),
          b64i: formatBase64(i.thumbnail)
        }
      })
      // TODO support status codes for no content when we page out...
      debug('WHAT MIME TYPE', req.headers)
      // res.json(result)
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
    }))
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
