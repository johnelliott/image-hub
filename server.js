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

app.use('/posts/:image', function (req, res, next) {
  const imagePath = path.join('/media/rated', req.params.image)
  const imageMattPath = '/media/crops'
  const redirectFileName = path.join('/media/crops', req.params.image)
  // call function
  matt(imagePath, imageMattPath).then(() => {
    // redirect
    res.end(redirectFileName)
  })
})
app.use('/posts', function (req, res, next) {
  const list = fs.readdirSync(path.join(__dirname, 'public'))
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
