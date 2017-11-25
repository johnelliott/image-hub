const debug = require('debug')('hub:db')
// const path = require('path')
const sqlite3 = require('sqlite3').verbose()
const createImages = require('./lib/schema.js').createImages

// Make a promise for the open db as soon as we load the file
// then in the db function, wait for it

const db = new sqlite3.cached.Database(path.join(__dirname, 'cam.db'), (err, result) => {
  if (err) {
    return debug('db open error', err)
  }
  debug('db open')
  return db.run(createImages, (err, result) => {
    if (err && err.message.match(/table image already exists/)) {
      debug('image table exists')
    } else if (err) {
      return debug('db create iamge table error', err)
    }
  })
})

function getDatabase (path) {
  return db
}

module.exports = getDatabase
exports.createImages = createImages
