require('dotenv').config()
const debug = require('debug')('hub:etl')
const path = require('path')
const workerFarm = require('worker-farm')
const watch = require('node-watch')
const sqlite3 = require('sqlite3').verbose()
const createImages = require('./lib/schema.js').createImages

require('dotenv').config()

const MEDIA_PATH = process.env.MEDIA_PATH
if (!MEDIA_PATH) {
  console.error(new Error('MEDIA_PATH'))
  process.exit(1)
}
const STORAGE = 'storage'
const STORAGE_PATH = path.join(MEDIA_PATH, STORAGE)
debug('STORAGE_PATH', STORAGE_PATH)

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
  return db.run(createImages, (err, result) => {
    if (err && err.message.match(/table image already exists/)) {
      debug('image table exists')
    } else if (err) {
      return debug('db create iamge table error', err)
    }
  })
})

function addImageToDatabase ({ fileName, dateTimeOriginal, fullPath }) {
  debug('Running insert', fileName)
  db.run(
    `INSERT OR REPLACE INTO image (
      'id',
      'file_name',
      'date_time_created',
      'full_path'
    ) values (
      (SELECT id FROM image WHERE full_path = '${fullPath}'),
      '${fileName}',
      '${dateTimeOriginal}',
      '${fullPath}'
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
  watch(STORAGE_PATH, {
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
