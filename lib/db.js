const debug = require('debug')('hub:db')
// const path = require('path')
const sqlite3 = require('sqlite3').verbose()

// Make a promise for the open db as soon as we load the file
// then in the db function, wait for it

function getDatabase (path) {
  debug('db path', path)
  return new Promise((resolve, reject) => {
    const db = new sqlite3
      .Database(path, sqlite3.OPEN_READONLY, (err, result) => {
        if (err) {
          return debug('db open error', err)
        }
        debug('db open')
        resolve(db)
      })
  })
}

module.exports = getDatabase
