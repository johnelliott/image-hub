const debug = require('debug')('lib:exif')
const fs = require('fs')

const exiftool = require('exiftool.js')

function getDateTimeOriginal (path, cb) {
  exiftool.getExifFromLocalFileUsingNodeFs(fs, path, (err, exif) => {
    if (err) {
      debug(err)
      cb(err)
    }
    cb(null, exif['DateTimeOriginal'])
  })
}

module.exports = getDateTimeOriginal
