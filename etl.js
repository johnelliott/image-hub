const debug = require('debug')('hub:etl')
const path = require('path')
const sqlite3 = require('sqlite3').verbose()
const exiftool = require('node-exiftool')
const createImages = require('./lib/schema.js').createImages
const watch4jpegs = require('./lib/watch.js')

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

function exifDateTimeToSQLite3Time (time) {
  return [time.split(' ')[0].split(':').join('-'), time.split(' ')[1]].join(' ')
}

function addImageToDatabase ({ fileName, dateTimeOriginal, fullPath, thumbnail }) {
  debug('Running insert', fileName)
  db.run(
    `INSERT OR REPLACE INTO image (
      'id',
      'file_name',
      'date_time_created',
      'full_path',
      'thumbnail'
    ) values (
      (SELECT id FROM image WHERE full_path = '${fullPath}'),
      '${fileName}',
      '${dateTimeOriginal}',
      '${fullPath}',
      '${thumbnail}'
    );`
  )
}

function getImgData (path) {
  const ep = new exiftool.ExiftoolProcess(EXIFTOOL_PATH)
  // Add close listener
  ep.on(exiftool.events.EXIT, () => {
    debug('exiftool process exited')
  })

  // Open an exiftool process
  const openExiftoolProcess = ep
    .open()
    .then(pid => {
      debug('Started exiftool process %s', pid)
      return ep
    })

  openExiftoolProcess.then(() => {
    return ep.readMetadata(path, ['b', 'fast2', 'FileName', 'ThumbnailImage', 'DateTimeOriginal', 'if \'-ThumbnailImage\''])
  })
    .then(result => {
      // create db entry
      // debug(result.data)
      const model = {
        fileName: result.data[0].FileName,
        dateTimeOriginal: exifDateTimeToSQLite3Time(result.data[0].DateTimeOriginal),
        fullPath: path,
        thumbnail: result.data[0].ThumbnailImage
      }
      debug('model path to add', model.fullPath)
      return addImageToDatabase(model)
    })
    .then(() => ep.close())
    .catch(debug)
}

if (require.main === module) {
  watch4jpegs(STORAGE_PATH, getImgData)
}

exports.addImageToDatabase = addImageToDatabase
