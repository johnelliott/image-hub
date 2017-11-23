const path = require('path')
const recursiveReaddir = require('recursive-readdir')

function getJpegs (dir) {
  return new Promise((resolve, reject) => {
    recursiveReaddir(path.join(__dirname, dir), (err, files) => {
      if (err) {
        console.error(err)
        return reject(err)
      }
      return resolve(files.filter(fname => new RegExp(/jpg$/, 'i').test(fname)))
    })
  })
}

if (require.main === module) {
  const argv = process.argv.slice(2)
  getJpegs(argv[0]).then(console.log)
}

module.exports = getJpegs
