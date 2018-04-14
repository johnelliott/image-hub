const debug = require('debug')('hub:db')
const { promisify } = require('util')
const { access, stat } = require('fs')
const Database = require('better-sqlite3')
const { createImages } = require('./schema.js')

const fsAccess = promisify(access)
const fsStat = promisify(stat)

const SQLITE_USE_WAL_MODE = process.env.SQLITE_USE_WAL_MODE === 'true'
const DB_PATH = process.env.DB_PATH

// Connect to a database file
const db = new Database(DB_PATH)
debug('created db', db.name)

process.on('exit', code => {
  debug(`process exit with code ${code}`)
  try {
    if (SQLITE_USE_WAL_MODE) {
      db.checkpoint()
    }
    if (db.open) {
      db.close()
    }
  } catch (err) {
    console.error(err)
  }
})

try {
  const result = db.prepare(createImages).run()
  debug('db create result', result)
  const pragma = db.pragma('journal_mode = WAL')
  debug('db WAL pragma result', pragma)
} catch (err) {
  if (err && err.message.match(/table image already exists/)) {
    debug('image table exists')
  } else if (err) {
    debug('db create image table error', err)
    console.error(err)
    process.exit(1)
  }
}

// Prepared DB statements
if (SQLITE_USE_WAL_MODE) {
  const WAL_PATH = `${DB_PATH}-wal`
  const SQLITE_WAL_CHECK_INTERVAL_SECONDS = parseInt(process.env.SQLITE_WAL_CHECK_INTERVAL_SECONDS, 10) || 10
  setInterval(async () => {
    const walFileExists = await fsAccess(WAL_PATH).then(() => true, () => false)
    debug('walFileExists', walFileExists)
    if (walFileExists) {
      const { size } = await fsStat(WAL_PATH)
      debug('size', size)
      if (size >= 1000) {
        debug('checkpointing')
        db.checkpoint()
      }
    }
  }, SQLITE_WAL_CHECK_INTERVAL_SECONDS * 1000 /* this may need to be tweaked, depending on your usage rate */)
}

const deleteFromImage = db.prepare('delete from image;')
const get36Images = db.prepare('select file_name, date_time_created from image order by date_time_created desc limit 36;')
const get36ImagesSince = db.prepare('select file_name, date_time_created, (select date_time_created from image where file_name = @since) as sinceDateTime from image where date_time_created < sinceDateTime order by date_time_created desc limit 36;')
const insertImage = db.prepare('INSERT OR REPLACE INTO image (\'id\', \'file_name\', \'date_time_created\', \'full_path\') values ((SELECT id FROM image WHERE full_path = @fullPath), @fileName, @dateTimeOriginal, @fullPath);')

module.exports = {
  deleteFromImage,
  get36Images,
  get36ImagesSince,
  insertImage
}
