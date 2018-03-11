const gmColors = require('./gm-colors.json')

module.exports = function isGmColor (color) {
  return gmColors.includes(color) || color.match(/^#[0-9a-fA-F]{6}$/)
}
