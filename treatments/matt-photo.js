const debug = require('debug')('storycrop:template:matt-photo-portrait') // eslint-disable-line no-unused-vars
const gm = require('gm')

// Key differences are 5x4 size and white matting
function mattPhotoPortrait (img, destinationPath) {
  debug(img)
  return new Promise((resolve, reject) => {
    debug('destinationPath', destinationPath)

    gm(img)
      .autoOrient()
      .resize(1536, '>')
      .background('white')
      .gravity('Center')
      .extent(1536, 1920)
      .write(destinationPath, (err) => {
        if (err) reject(err)
        debug('image  ok', destinationPath)
        resolve(destinationPath)
      })
  })
    .catch(reason => {
      debug('problem matting with gm', reason)
    })
}

module.exports = mattPhotoPortrait
