const debug = require('debug')('hub:watch')
const watch = require('node-watch')

module.exports = function watch4jpegs (dir, cb) {
  watch(dir, { recursive: true }, (evt, name) => {
    if (evt === 'update' && new RegExp(/jpg$/, 'i').test(name)) {
      debug('Saw new image', name)
      cb(name)
    }
  })
}
