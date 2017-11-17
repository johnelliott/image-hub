const debug = require('debug')('storycrop:server')
const fs = require('fs')
const path = require('path')
const express = require('express')
const matt = require('./treatments/matt-story.js')
const getJpegs = require('./lib/get-jpegs.js')

require('dotenv').config()

var app = express()
app.disable('x-powered-by')
app.set('env', process.env.NODE_ENV)
app.set('views', path.join(__dirname, 'views')) // general config
app.set('view engine', 'pug')

app.use('/:folder/:image', function (req, res, next) {
  debug('folder', req.params.folder)
  debug('image', req.params.image)
  const imagePath = path.join('/media/card/DCIM/', req.params.folder, req.params.image)
  const imageMattPath = path.join('/media/crops', req.params.image)
  debug('maattt path', imageMattPath)
  matt(imagePath, imageMattPath).then(() => {
    res.redirect(`http://photon.local/crops/${req.params.image}`)
  })
})
app.use('/', function (req, res, next) {
  getJpegs('/media/card/DCIM').then(list => {
    const newlist = list.map(l => l.split('/').slice(4).join('/'))
    debug(newlist instanceof Array)
    res.render('list', { list: newlist })
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
