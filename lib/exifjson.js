const debug = require('debug')('storycrop:exif')
const exiftool = require('node-exiftool')
const getDirs = require('./get-dirs.js')
const ep = new exiftool.ExiftoolProcess()

// function getDirListing (dir) {
//   // const imgDir = path.join(__dirname, 'fixtures/DCIM/101LEICA/L1000001.JPG')

//   const run = ep.open()
//     .then(pid => debug('Started exiftool process %s', pid))
//     .then(() => ep.readMetadata(dir, ['ThumbnailImage', 'Rating', 'b']))
//     .then(result => result.data)
//     .catch(console.error)

//   run.then(() => ep.close())
//   return run
// }

function getImages (parentDir) {
  debug(parentDir)

  const run = ep.open()
    .then(pid => debug('Started exiftool process %s', pid))
    .then(() => getDirs(parentDir))
    .then(dirs => Promise.all(dirs.map(dir => ep.readMetadata(dir, ['ThumbnailImage', 'Rating', 'b', 'ext JPG']).then(r => r.data))))
    .then(dirMap => dirMap.reduce((p, c) => p.concat(c), []))
    .catch(debug)

  run.then(() => ep.close().then(() => debug('closed')))
  return run
}

if (require.main === module) {
  const argv = process.argv.slice(2)
  debug(argv)
  getImages(argv[0]).then(data => console.log(data.length))
}

module.exports = getImages
