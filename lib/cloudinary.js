const debug = require('debug')('hub-web:lib:cloudinary') // eslint-disable-line no-unused-vars
const util = require('util')
const path = require('path')
const cloudinary = require('cloudinary')

const DEFAULT_IMAGE_CONFIG = { height: 1024, width: 1024, crop: 'limit' }

const MEDIA_PATH = process.env.MEDIA_PATH
if (!MEDIA_PATH) {
  console.error(new Error('MEDIA_PATH'))
  process.exit(1)
}
const STORAGE = 'storage'
const STORAGE_PATH = path.join(MEDIA_PATH, STORAGE)

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

const upload = util.promisify(cloudinary.v2.uploader.upload)

function getImageUrl (publicId = 'sample', width = 1024) {
  const url = cloudinary.url(publicId, DEFAULT_IMAGE_CONFIG)
  debug('getImageUrl', url)
  return url
}

/**
 * takes file_name
 */
function uploadImage (file) {
  debug('uploading image', file)
  return upload(path.join(STORAGE_PATH, file), { public_id: file })
}

module.exports = { getImageUrl, uploadImage }
