const debug = require('debug')('hub:etl')
const path = require('path')
const Sqlite3 = require('sqlite3').verbose()
const exiftool = require('node-exiftool')
const watch4jpegs = require('./lib/watch.js')

const ep = new exiftool.ExiftoolProcess('/usr/local/bin/exiftool')

// Environment variables
// DB_PATH
// SCAN_DIR

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
    .then(() => ep.readMetadata(path, ['b']))
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
  watch4jpegs(path.join(__dirname, 'data'), getImgData)
}

exports.addImageToDatabase = addImageToDatabase
