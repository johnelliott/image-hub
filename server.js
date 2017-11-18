const debug = require('debug')('storycrops')
const path = require('path')
const express = require('express')
const matt = require('./treatments/matt-story.js')
const listThumbs = require('./lib/exifjson.js')

require('dotenv').config()
const CARD_PATH = process.env.CARD_PATH || '/Users/john/code/insta/fixtures/DCIM'
const CROP_PATH = process.env.CROP_PATH || '/Users/john/code/story-crops/crops'

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

app.use('/', function (req, res, next) {
  listThumbs(CARD_PATH)
    .then(list => {
      const filtered = list.filter(l => l).map(l => {
        return {
          href: path.relative(CARD_PATH, l.SourceFile),
          b64i: l.ThumbnailImage.slice(7)
        }
      })
      res.render('list', { list: filtered })
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
