require('dotenv').config()
const debug = require('debug')('hub:server')
const morgan = require('morgan')
const path = require('path')
const express = require('express')
const multer = require('multer')
const sharp = require('sharp')
const rimraf = require('rimraf')
const story = require('./lib/treatments/story.js')
const isGmColor = require('./lib/isGmColor')
const choo = require('choo')
const grid = require('./client/grid.js')
const detail = require('./client/detail.js')
const {
  deleteFromImage,
  get36Images,
  get36ImagesSince
} = require('./lib/db.js')

const DISABLE_SERVER_RENDER = process.env.DISABLE_SERVER_RENDER === 'true'
const INITIAL_STATIC_SERVER = process.env.INITIAL_STATIC_SERVER === 'true'
debug('DISABLE_SERVER_RENDER', DISABLE_SERVER_RENDER)
debug('INITIAL_STATIC_SERVER', INITIAL_STATIC_SERVER)

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
  return new Promise((resolve, reject) => {
    try {
      deleteFromImage.run()
    } catch (err) {
      debug(err)
      return reject(err)
    }
    resolve('deleted')
  })
}

const app = express()
app.set('env', process.env.NODE_ENV)
const morganLogPreset = app.get('env') === 'development' ? 'dev' : 'combined'
app.use(morgan(morganLogPreset))
app.set('views', path.join(__dirname, 'views')) // general config
app.set('view engine', 'pug')

const expressStaticOptions = {
  index: false,
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : '2m'
}
// Simulate Nginx reverse-proxy, eliminate re-resizing static assets
if (INITIAL_STATIC_SERVER) {
  app.use('/', express.static(MEDIA_PATH, {
    ...expressStaticOptions,
    fallthrough: true
  }))
}

app.get('/stories/:image', function (req, res, next) {
  debug('image', req.params.image)
  const sourceImagePath = path.join(STORAGE_PATH, req.params.image)
  const imageMattPath = path.join(STORIES_PATH, req.params.image)
  debug('matt path', imageMattPath)
  return story(sourceImagePath, imageMattPath, app.locals.storyColor)
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
      debug('thumb resize', result)
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
      debug('small resize', result)
      next()
    })
    .catch(err => {
      if (err.message === 'Input file is missing or of an unsupported image format') {
        res.status(404).end()
      }
    })
})

app.use(express.static(path.join(__dirname, 'dist'), expressStaticOptions))
app.use(express.static(path.join(__dirname, 'public'), expressStaticOptions))
app.use(express.static(MEDIA_PATH))
/**
 * CHOO ROUTE
 */
const chooApp = choo()
chooApp.route('/', grid)
chooApp.route('/view/:image', detail)

app.get('/', function (req, res, next) {
  const since = req.query.since
  let rows
  try {
    if (since) {
      debug('req.query.since', since)
      rows = get36ImagesSince.all({ since })
    } else {
      rows = get36Images.all()
    }
    debug('found %s photos', rows.length)
    const images = rows.map(i => {
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
  } catch (err) {
    debug(err)
    next(err)
  }
})

app.get('/view/:image', function (req, res, next) {
  debug('hit view route for %s', req.params.image)
  try {
    const rows = get36Images.all()
    debug('found %s photos', rows.length)
    const images = rows.map(i => {
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
  } catch (err) {
    debug(err)
    next(err)
  }
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
    thumb: () => rimRafJpgDir(THUMB_PATH),
    stories: () => rimRafJpgDir(STORIES_PATH),
    storage: () => rimRafJpgDir(STORAGE_PATH),
    media: rimRafMedia
  }

  const command = req.body.command.toLowerCase()
  let commandResult
  if (isGmColor(command)) {
    app.locals.storyColor = command
    commandResult = Promise.resolve(`ig story color set to ${command}`)
  } else if (commands[command]) {
    debug('doing command', req.body.command)
    // Do async commmand, then set info after
    commandResult = commands[command]()
  } else {
    debug('failed command', req.body.command)
    res.status(406)
    res.locals.statusText = 'Not acceptable'
    return next()
  }

  commandResult.then(result => {
    debug('result', result)
    res.locals.statusText = result
    res.status(200)
    next()
  }).catch(reason => {
    res.status(406)
    res.locals.statusText = 'Not acceptable' + reason
    next()
  })
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
