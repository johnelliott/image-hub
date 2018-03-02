require('dotenv').config()
const debug = require('debug')('hub:server')
const morgan = require('morgan')
const path = require('path')
const express = require('express')
const multer = require('multer')
const sharp = require('sharp')
const rimraf = require('rimraf')
const sqlite3 = require('sqlite3').verbose()
const { createImages } = require('./lib/schema.js')
const treatments = require('./lib/treatments/index.js')

const DISABLE_SERVER_RENDER = process.env.DISABLE_SERVER_RENDER === 'true'
debug('DISABLE_SERVER_RENDER', DISABLE_SERVER_RENDER)

const MEDIA_PATH = process.env.MEDIA_PATH
if (!MEDIA_PATH) {
  console.error(new Error('No MEDIA_PATH'))
  process.exit(1)
}
const SMALL = 'small'
const THUMB = 'thumb'
const STORAGE = 'storage'
const STORIES = 'stories'

const SMALL_PATH = path.join(MEDIA_PATH, SMALL)
const THUMB_PATH = path.join(MEDIA_PATH, THUMB)
const STORAGE_PATH = path.join(MEDIA_PATH, STORAGE)
const STORIES_PATH = path.join(MEDIA_PATH, STORIES)

const story = treatments[process.env.STORY_TREATMENT] || treatments.story

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

/**
 * Resize small images to disk
 */
const SIZE = 240
debug('DEFAULT RESIZE PX', SIZE)
function resize (from, to, size = SIZE) {
  return sharp(from)
    .resize(size, size)
    .max()
    .rotate()
    .withoutEnlargement()
    .toFile(to)
}

/**
 * Returns Promise for deleted directory
 */
function rimRafJpgDir (dir) {
  return new Promise((resolve, reject) => {
    const glob = path.join(dir, '*.JPG')
    rimraf(glob, (err, result) => {
      debug(err, result)
      if (err) {
        debug(err)
        return reject(err)
      }
      debug('rimraf result', result)
      resolve(result || `deleted ${glob}`)
    })
  })
}

/**
 * Returns Promise for deleted directories
 */
function rimRafMedia () {
  return Promise.all([
    rimRafJpgDir(SMALL_PATH),
    rimRafJpgDir(THUMB_PATH),
    rimRafJpgDir(STORIES_PATH),
    rimRafJpgDir(STORAGE_PATH)
  ]).then(arr => arr[0])
}
/**
 * Returns Promise for deleted directories
 */
function clearDB () {
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
}

const app = express()
app.set('env', process.env.NODE_ENV)
const morganLogPreset = app.get('env') === 'development' ? 'dev' : 'combined'
app.use(morgan(morganLogPreset))
app.set('views', path.join(__dirname, 'views')) // general config
app.set('view engine', 'pug')

app.get('/stories/:image', function (req, res, next) {
  debug('image', req.params.image)
  const sourceImagePath = path.join(STORAGE_PATH, req.params.image)
  const imageMattPath = path.join(STORIES_PATH, req.params.image)
  debug('matt path', imageMattPath)
  return story(sourceImagePath, imageMattPath)
    .then(result => {
      debug('story created', result)
      next()
    })
})

app.get('/thumb/:image', function (req, res, next) {
  debug('image', req.params.image)
  const name = req.params.image
  const sourceImagePath = path.join(STORAGE_PATH, name)
  const thumbImagePath = path.join(THUMB_PATH, name)
  debug('generate thumb', thumbImagePath)
  resize(sourceImagePath, thumbImagePath, 240)
    .then(result => {
      debug('thumb resize', result);
      next()
    })
    .catch(err => {
      if (err.message === 'Input file is missing or of an unsupported image format') {
        res.status(404).end()
      }
    })
})
app.get('/small/:image', function (req, res, next) {
  debug('image', req.params.image)
  const name = req.params.image
  const sourceImagePath = path.join(STORAGE_PATH, name)
  const destinationImagePath = path.join(SMALL_PATH, name)
  debug('generate preview', sourceImagePath)
  resize(sourceImagePath, destinationImagePath, 1280)
    .then(result => {
      debug('small resize', result);
      next()
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
app.use('/thumb/', express.static(THUMB_PATH))
const staticOptions = { index: false }
app.use(express.static(path.join(__dirname, 'dist'), staticOptions))
app.use(express.static(path.join(__dirname, 'public'), staticOptions))
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
  const since = req.query.since

  let selectSinceDateTimeClause = ''
  let whereClause = ''
  if (since) {
    debug('req.query.since', since)
    selectSinceDateTimeClause = `, (SELECT date_time_created FROM image WHERE file_name = '${since}') as sinceDateTime`
    whereClause = 'WHERE date_time_created < sinceDateTime'
  }

  db.all(`
    SELECT file_name, date_time_created
    ${selectSinceDateTimeClause}
    FROM image
    ${whereClause}
    ORDER BY date_time_created DESC
    LIMIT 36
  `, (err, result) => {
    if (err) {
      debug(err)
      next(err)
    }
    debug('found %s photos', result.length)
    const images = result.map(i => {
      return {
        name: i.file_name,
        date: new Date(i.date_time_created.replace(/-/g, '/')).valueOf()
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
  db.all(`SELECT file_name, date_time_created FROM image ORDER BY date_time_created DESC LIMIT 36`, (err, result) => {
    if (err) {
      next(err)
    }
    debug('found %s photos', result.length)
    const images = result.map(i => {
      return {
        name: i.file_name,
        date: new Date(i.date_time_created.replace(/-/g, '/')).valueOf()
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
    all: () => Promise.all([clearDB(), rimRafMedia()]).then(arr => 'deleted all'),
    db: clearDB,
    small: () => rimRafJpgDir(SMALL_PATH),
    stories: () => rimRafJpgDir(STORIES_PATH),
    storage: () => rimRafJpgDir(STORAGE_PATH),
    media: rimRafMedia
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
      // Use error template as the template for the admin page
      // even though it's not an error per se
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
      res.status(404).end()
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
