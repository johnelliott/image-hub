const debug = require('debug')('hub-web:lib:cloudinary') // eslint-disable-line no-unused-vars
const cloudinary = require('cloudinary')

const DEFAULT_IMAGE_CONFIG = { height: 1024, width: 1024, crop: 'limit' }

cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME })

function getImage (publicId, width = 1024) {
  const url = cloudinary.url('sample', DEFAULT_IMAGE_CONFIG)
  debug(url)
  return url
}

module.exports = { getImage }
