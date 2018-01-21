const debug = require('debug')('hub:treatment:iw:matt-story') // eslint-disable-line no-unused-vars
const gm = require('gm')
const path = require('path')

// Assets
const iwNorthOverlayPngPath = path.join(__dirname, 'iw-north.png')

// 1080x1920 on colored matt
// add a png on top

function mattStory (img, destinationPath) {
  debug(img)
  return new Promise((resolve, reject) => {
    debug('destinationPath', destinationPath)

    gm(img)
      .autoOrient()
      .resize(1080, '>')
      .background('black')
      .gravity('Center')
      .extent(1080, 1920)
      .noProfile()
      .toBuffer((err, buf) => {
        if (err) {
          debug(err)
          throw err
        }
        return gm(buf, 'in.png')
          .composite(iwNorthOverlayPngPath)
          .compose('Atop')
          .gravity('North')
          .write(destinationPath, (err) => {
            if (err) reject(err)
            debug('image ok', destinationPath)
            resolve(destinationPath)
          })
      })
  })
    .catch(reason => {
      debug('problem matting with gm', reason)
    })
}

if (require.main === module) {
  const argv = process.argv.slice(2)
  debug(argv)
  mattStory(argv[0], argv[1])
}

module.exports = mattStory
