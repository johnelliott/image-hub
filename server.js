const debug = require('debug')('storycrop:server')
const fs = require('fs')
const path = require('path')
const express = require('express')
const matt = require('./treatments/matt-story.js')

require('dotenv').config()

var app = express()
app.disable('x-powered-by')
app.set('env', process.env.NODE_ENV)
app.set('views', path.join(__dirname, 'views')) // general config
app.set('view engine', 'pug')

// TODO use redis for this and not memory session store
// INFO httponly Note be careful when setting this to true, as compliant clients
// will not allow client-side JavaScript to see the cookie in document.cookie.
// INFO see https://github.com/expressjs/session#secure
// app.use(express.static(path.join('/media/crops')))

// TODO stick auth middleware in here?

app.use('/posts/:folder/:image', function (req, res, next) {
  const imagePath = path.join('/media/card/DCIM/', req.params.folder, req.params.image)
  const imageMattPath = path.join('/media/crops', req.params.image)
  debug('maattt path', imageMattPath)
  matt(imagePath, imageMattPath).then(() => {
    res.redirect(`http://photon.local/crops/${req.params.image}`)
  })
})
app.use('/posts', function (req, res, next) {
  const listFolders = fs.readdirSync(path.join('/media/card/DCIM/'))
  debug('flders', listFolders)
  const list = listFolders.map(f => {
    return fs.readdirSync(path.join(`/media/card/DCIM/${f}`))
      .map(photoname => `${f}/${photoname}`)
      .filter(fname => new RegExp(/jpg/, 'i').test(fname))
  })
    .reduce((prev, curr) => prev.concat(curr))
  debug('list', list)
  res.render('list', { list })
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
