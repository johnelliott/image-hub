const debug = require('debug')('hub:watch')
const watch = require('node-watch')

module.exports = function watch4jpegs (dir, cb) {
  watch(dir, {
    filter: new RegExp(/.JPG$/, 'i'),
    recursive: true
  }, (evt, name) => {
    if (evt === 'update') {
      debug('Saw new image', name)
      cb(name)
    }
  })
}
