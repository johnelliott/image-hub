const debug = require('debug')('storycrop:get-dirs')
const listdirs = require('listdirs')

function getDirs (dir) {
  return new Promise((resolve, reject) => {
    listdirs(dir, (err, list) => {
      if (err) {
        console.error(err)
        return reject(err)
      }
      debug('card folders', list.length)
      return resolve(list)
    })
  })
}

if (require.main === module) {
  const argv = process.argv.slice(2)
  getDirs(argv[0]).then(console.log)
}

module.exports = getDirs
