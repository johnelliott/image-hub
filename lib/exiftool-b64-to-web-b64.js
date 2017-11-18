module.exports = function convertBase64Formats (exiftoolBase64Format) {
  return `data:image/jpg;base64,${exiftoolBase64Format.slice(7)}` // Slice off weird exiftool base64 crap
}
