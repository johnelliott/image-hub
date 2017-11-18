module.exports = function isCameraFile (path) {
  return new RegExp(/.(jpg|dng)$/, 'i').test(path)
}
