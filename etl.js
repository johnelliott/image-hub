const debug = require('debug')('hub:etl')
const path = require('path')
const Sqlite3 = require('sqlite3').verbose()
const exiftool = require('node-exiftool')
const watch4jpegs = require('./lib/watch.js')

require('dotenv').config()

const STORAGE_PATH = process.env.STORAGE_PATH
if (!STORAGE_PATH) {
  console.error(new Error('no STORAGE_PATH'))
  process.exit(1)
}
const EXIFTOOL_PATH = process.env.EXIFTOOL_PATH
if (!EXIFTOOL_PATH) {
  console.error(new Error('no EXIFTOOL_PATH'))
  process.exit(1)
}

const ep = new exiftool.ExiftoolProcess(process.env.EXIFTOOL_PATH)

const createImages = `CREATE TABLE image (
  id INTEGER PRIMARY KEY,
  file_name NOT NULL DEFAULT '',
  date_time_created datetime NOT NULL,
  full_path NOT NULL DEFAULT '',
  thumbnail TEXT
);`

function exifDateTimeToSQLite3Time (time) {
  return [time.split(' ')[0].split(':').join('-'), time.split(' ')[1]].join(' ')
}

function getDatabase (path) {
  return new Promise((resolve, reject) => {
    const db = new Sqlite3
      .Database(path, (err, result) => {
        if (err) {
          return debug('db open error', err)
        }
        debug('db open')
        return db.run(createImages, (err, result) => {
          if (err && err.message.match(/table image already exists/)) {
            return resolve(db)
          } else if (err) {
            return debug('createImages error', err)
          }
          debug('createImages')
          resolve(db)
        })
      })
  })
}

function addImageToDatabase ({ fileName, dateTimeOriginal, fullPath, thumbnail }) {
  return getDatabase(path.join(__dirname, 'cam.db'))
    .then(db => {
      db.run(`INSERT INTO image (
      'file_name',
      'date_time_created',
      'full_path',
      'thumbnail'
    ) values (
      '${fileName}',
      '${dateTimeOriginal}',
      '${fullPath}',
      '${thumbnail}'
    );`)
    })
}

function getImgData (path) {
  ep
    .open()
    .then(pid => debug('Started exiftool process %s', pid))
    .then(() => ep.readMetadata(path, ['b', 'FileName', 'ThumbnailImage', 'DateTimeOriginal']))
    .then(result => {
      // create db entry
      debug(result.data)
      const model = {
        fileName: result.data[0].FileName,
        dateTimeOriginal: exifDateTimeToSQLite3Time(result.data[0].DateTimeOriginal),
        fullPath: path,
        thumbnail: result.data[0].ThumbnailImage
      }
      debug('model to add', model)
      return addImageToDatabase(model)
    })
    .then(() => ep.close())
    .catch(debug)
}

// *******************************
// RUN RUN RUN RUN RUN RUN RUN RUN
// *******************************

if (require.main === module) {
  watch4jpegs(STORAGE_PATH, getImgData)
}

exports.addImageToDatabase = addImageToDatabase
