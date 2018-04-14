require('dotenv').config()
const debug = require('debug')('hub:etl')
const path = require('path')
const watch = require('node-watch')
const { insertImage } = require('./lib/db.js')
const getDTO = require('./lib/exif.js')

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

function addImageToDatabase ({ fileName, dateTimeOriginal, fullPath }) {
  debug('insert', fileName)
  const inserted = insertImage.run({ fileName, dateTimeOriginal, fullPath })
  debug('inserted', inserted)
}

if (require.main === module) {
  debug('watching')
  watch(STORAGE_PATH, {
    filter: new RegExp(/.JPG$/, 'i'),
    recursive: true
  }, (evt, name) => {
    if (evt === 'update') {
      getDTO(name, (err, DTO) => {
        if (err) {
          return debug('error in worker callback', err)
        }
        const model = { dateTimeOriginal: DTO, fullPath: name, fileName: path.basename(name) }
        addImageToDatabase(model)
      })
    }
  })
}
