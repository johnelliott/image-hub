const debug = require('debug')('hub:getImageDataWorker')
const exiftool = require('node-exiftool')

const EXIFTOOL_PATH = process.env.EXIFTOOL_PATH
if (!EXIFTOOL_PATH) {
  console.error(new Error('no EXIFTOOL_PATH'))
  process.exit(1)
}
debug('EXIFTOOL_PATH', EXIFTOOL_PATH)

function exifDateTimeToSQLite3Time (time) {
  return [time.split(' ')[0].split(':').join('-'), time.split(' ')[1]].join(' ')
}

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

function getImgData (path, callback) {
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
      return callback(null, model)
    })
    .then(() => ep.close())
    .catch(err => {
      callback(err)
      debug('error in image worker', err)
      ep.close()
    })
}

module.exports = getImgData
