const debug = require('debug')('storycrop:exif')
const exiftool = require('node-exiftool')

function getImages (dir) {
  const ep = new exiftool.ExiftoolProcess()
  debug('Getting jpegs in', dir)
  const run = ep.open()
  // .then(pid => debug('Started exiftool process %s', pid))
    .then(() => ep.readMetadata(dir, ['ThumbnailImage', 'Rating', 'b', 'ext JPG', 'r']).then(r => r.data))
    .catch(debug)

  run.then(() => ep.close().then(() => debug('Exiftool closed')))
  return run
}

if (require.main === module) {
  const argv = process.argv.slice(2)
  debug(argv)
  getImages(argv[0]).then(data => console.log('Found %s images', data.length))
}

module.exports = getImages
