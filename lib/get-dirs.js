const debug = require('debug')('storycrop:get-dirs')
const listdirs = require('listdirs')

function getDirs (dir) {
  debug('dir', dir)
  return new Promise((resolve, reject) => {
    listdirs(dir, (err, list) => {
      if (err) {
        console.error(err)
        return reject(err)
      }
      debug('card folders count:', list.length)
      // slice removes dir from the list, hack based off listdirs implementation
      return resolve(list.slice(1))
    })
  })
}

if (require.main === module) {
  const argv = process.argv.slice(2)
  getDirs(argv[0]).then(console.log)
}

module.exports = getDirs
