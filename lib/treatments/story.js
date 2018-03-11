const debug = require('debug')('hub:treatment:matt-story') // eslint-disable-line no-unused-vars
const gm = require('gm')

// 1080x1920 on colored matt

function mattStory (img, destinationPath, color = '#050B12') {
  debug(img)
  return new Promise((resolve, reject) => {
    debug('destinationPath', destinationPath)

    gm(img)
      .autoOrient()
      .resize(1080, '>')
      .background(color) // Deep non-black blue
      .gravity('Center')
      .extent(1080, 1920)
      .noProfile()
      .write(destinationPath, (err) => {
        if (err) reject(err)
        debug('image ok', destinationPath)
        resolve(destinationPath)
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
