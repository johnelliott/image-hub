require('dotenv').config()
const debug = require('debug')('hub:server')
const path = require('path')
const express = require('express')
const multer = require('multer')
const sqlite3 = require('sqlite3').verbose()
const { createImages } = require('./lib/schema.js')
const matt = require('./lib/treatments/matt-story.js')
const formatBase64 = require('./lib/exiftool-b64-to-web-b64.js')
const sharp = require('sharp')
const rimraf = require('rimraf')

const DISABLE_SERVER_RENDER = process.env.DISABLE_SERVER_RENDER === 'true'
debug('DISABLE_SERVER_RENDER', DISABLE_SERVER_RENDER)
const OPTIMISTIC_SMALL = process.env.OPTIMISTIC_SMALL === 'true'
debug('OPTIMISTIC_SMALL', OPTIMISTIC_SMALL)

const MEDIA_PATH = process.env.MEDIA_PATH
if (!MEDIA_PATH) {
  console.error(new Error('MEDIA_PATH'))
  process.exit(1)
}
const SMALL = 'small'
const STORAGE = 'storage'
const STORIES = 'stories'
const SMALL_PATH = path.join(MEDIA_PATH, SMALL)
const STORAGE_PATH = path.join(MEDIA_PATH, STORAGE)
const STORIES_PATH = path.join(MEDIA_PATH, STORIES)

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
      if (OPTIMISTIC_SMALL) {
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

// This is just for style.css
app.use('/', express.static(path.join(__dirname, 'views')))
// This is just for bundle.js
app.use('/', express.static(path.join(__dirname, 'dist')))
app.use('/', express.static(path.join(__dirname, 'public')))

/**
 * CHOO ROUTE
 */
const choo = require('choo')
const grid = require('./client/grid.js')
const detail = require('./client/detail.js')
const chooApp = choo()
chooApp.route('/', grid)
chooApp.route('/view/:image', detail)

app.get('/', function (req, res, next) {
  // const dateRangeStatement = `where date_time_created BETWEEN datetime('now', '-1 day') AND datetime('now') `
  db.all(`SELECT file_name, thumbnail, date_time_created FROM image ORDER BY date_time_created DESC`, (err, result) => {
    if (err) {
      debug(err)
      next(err)
    }
    debug('found %s photos', result.length)
    const images = result.map(i => {
      return {
        name: i.file_name,
        date: new Date(i.date_time_created.replace(/-/g, '/')).valueOf(),
        fullHref: `/${STORAGE}/${i.file_name}`,
        smallHref: `/${SMALL_PATH}/${i.file_name}`,
        igStoryHref: `/${STORIES_PATH}/${i.file_name}`,
        b64i: formatBase64(i.thumbnail)
      }
    })
    return res.format({
      'text/html': function () {
        debug('rendering text/html')
        const state = {
          images,
          params: req.params,
          href: req.originalUrl
        }
        const chooRenderedString = chooApp.toString('/', state)
        res.render('index', {
          state,
          chooRenderedString: DISABLE_SERVER_RENDER ? '<body>👁</body>' : chooRenderedString
        })
      },
      'application/json': function () {
        debug('rendering application/json')
        res.json(images)
      },
      'default': function () {
        // log the request and respond with 406
        res.status(406).send('Not Acceptable')
      }
    })
  })
})

app.get('/view/:image', function (req, res, next) {
  debug('hit view route for %s', req.params.image)
  db.all(`SELECT file_name, thumbnail, date_time_created FROM image ORDER BY date_time_created DESC`, (err, result) => {
    if (err) {
      next(err)
    }
    debug('found %s photos', result.length)
    const images = result.map(i => {
      return {
        name: i.file_name,
        date: new Date(i.date_time_created.replace(/-/g, '/')).valueOf(),
        fullHref: `/${STORAGE}/${i.file_name}`,
        smallHref: `/${SMALL}/${i.file_name}`,
        igStoryHref: `/${STORIES}/${i.file_name}`,
        b64i: formatBase64(i.thumbnail)
      }
    })
    return res.format({
      'text/html': function () {
        debug('rendering text/html')
        const state = {
          images,
          params: req.params,
          href: req.originalUrl
        }
        const chooRenderedString = chooApp.toString(`/view/${req.params.image}`, state)
        res.render('index', {
          state,
          chooRenderedString: DISABLE_SERVER_RENDER ? '<body>👁</body>' : chooRenderedString
        })
      },
      'application/json': function () {
        debug('rendering application/json')
        res.json(images)
      },
      'default': function () {
        // log the request and respond with 406
        res.status(406).send('Not Acceptable')
      }
    })
  })
})

const getFormData = multer().single()
app.get('/admin', function (req, res, next) {
  res.render('admin')
})
app.post('/admin', getFormData, function handleFormData (req, res, next) {
  debug('command', req.body.command)

  const commands = {
    all: () => null,
    db: () => {
      debug('running db command')
      // TODO
      return new Promise((resolve, reject) => {
        db.run('delete FROM image', (err, result) => {
          debug(err, result)
          if (err) {
            debug(err)
            return reject(err)
          }
          debug('result', result)
          resolve(result || 'deleted')
        })
      })
    },
    small: () => {
      return new Promise((resolve, reject) => {
        rimraf(path.join(SMALL_PATH, '*.JPG'), (err, result) => {
          debug(err, result)
          if (err) {
            debug(err)
            return reject(err)
          }
          debug('rimraf result', result)
          resolve(result)
        })
      })
    },
    stories: () => {
      return new Promise((resolve, reject) => {
        rimraf(path.join(STORIES_PATH, '*.JPG'), (err, result) => {
          debug(err, result)
          if (err) {
            debug(err)
            return reject(err)
          }
          debug('rimraf result', result)
          resolve(result)
        })
      })
    },
    storage: () => {
      return new Promise((resolve, reject) => {
        rimraf(path.join(STORAGE_PATH, '*.JPG'), (err, result) => {
          debug(err, result)
          if (err) {
            debug(err)
            return reject(err)
          }
          debug('rimraf result', result)
          resolve(result)
        })
      })
    },
    media: () => {
      return null
    }
  }

  if (commands[req.body.command]) {
    // Do async commmand, then set info after
    commands[req.body.command]().then(result => {
      debug('result', result)
      res.locals.statusText = result
      res.status(200)
      next()
    }).catch(reason => {
      res.status(406)
      res.locals.statusText = 'Not acceptable' + reason
      next()
    })
  } else {
    res.status(406)
    res.locals.statusText = 'Not acceptable'
    next()
  }
}, function renderFormResponse (req, res, next) {
  debug('running send middleware')
  return res.format({
    'text/html': function () {
      // Not necessarily an erorr page per se.
      res.render('error', {
        status: res.statusCode,
        statusText: res.locals.statusText
      })
    },
    'application/json': function () {
      res.json({ status: res.statusCode, statusText: res.locals.statusText })
    },
    'default': function () {
      res.send(res.locals.statusText)
    }
  })
})

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
