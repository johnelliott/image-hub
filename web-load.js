require('dotenv').config()
const debug = require('debug')('hub-web:web-loader')
const path = require('path')
const workerFarm = require('worker-farm')
const watch = require('node-watch')
const sqlite3 = require('sqlite3').verbose()
const createUploadTable = require('./lib/schema.js').createUploadTable

require('dotenv').config()

const MEDIA_PATH = process.env.MEDIA_PATH
if (!MEDIA_PATH) {
  console.error(new Error('MEDIA_PATH'))
  process.exit(1)
}
const STORAGE = 'storage'
const WEB_LOAD_PATH = path.join(MEDIA_PATH, STORAGE)
debug('WEB_LOAD_PATH', WEB_LOAD_PATH)

const EXIFTOOL_PATH = process.env.EXIFTOOL_PATH
if (!EXIFTOOL_PATH) {
  console.error(new Error('no EXIFTOOL_PATH'))
  process.exit(1)
}
debug('EXIFTOOL_PATH', EXIFTOOL_PATH)

const db = new sqlite3.cached.Database(path.join(__dirname, 'cam.db'), (err, result) => {
  if (err) {
    return debug('db open error', err)
  }
  debug('db open')
  return db.run(createUploadTable, (err, result) => {
    if (err && err.message.match(/table .* already exists/)) {
      debug('table exists')
    } else if (err) {
      return debug('db create table error', err)
    }
  })
})

function addImageToDatabase ({ fileName }) {
  debug('Running insert', fileName)
  db.run(
    `INSERT OR REPLACE INTO image (
      'id',
      'file_name',
      'public_id',
      'file_format'
    ) values (
      (SELECT id FROM image WHERE file_name = '${fileName}'),
      '${fileName}',
      '${dateTimeOriginal}',
      '${fullPath}',
      '${thumbnail}'
    );`
  )
}

const farmOptions = {
  maxCallsPerWorker: 1,
  maxConcurrentWorkers: require('os').cpus().length - 1,
  maxConcurrentCallsPerWorker: 1
  // maxConcurrentCalls: Infinity,
  // maxCallTime: Infinity,
  // maxRetries: Infinity,
  // autoStart: false
}
const workers = workerFarm(farmOptions, require.resolve('./lib/getImageDataWorker'))

if (require.main === module) {
  debug('watching')
  watch(WEB_LOAD_PATH, {
    filter: new RegExp(/.JPG$/, 'i'),
    recursive: true
  }, (evt, name) => {
    if (evt === 'update') {
      debug('Saw new image', name)
      workers(name, (err, model) => {
        if (err) {
          return debug('error in worker callback', err)
        }
        debug('got model from worker', model.fileName)
        addImageToDatabase(model)
      })
    }
  })
}
