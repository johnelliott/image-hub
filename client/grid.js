const html = require('choo/html')
const image = require('./image.js')
const debug = require('debug')('hub:views:grid')

function list (images, emit) {
  const el = html`<ul>${images.map(i => image(i, emit))}</ul>`

  el.isSameNode = function (target) {
    debug('isSameNode target', target)
    const imagesArray = Array.from(global.document.querySelectorAll('.image-link'))
    if (!imagesArray || !imagesArray.length) {
      debug('found no images')
      return false
    }
    const lastChildImageSrc = imagesArray.pop().childNodes[0].src
    debug('lastChildImageSrc', lastChildImageSrc)
    if (!lastChildImageSrc || !lastChildImageSrc.length) {
      debug('found no image src')
      return false
    }
    const src = images[images.length - 1].name
    debug('src', src)
    return lastChildImageSrc.includes(src)
  }

  return el
}

module.exports = function grid (state, emit) {
  function loadMore () {
    emit('fetch')
  }
  debug('grid render')
  const el = html`<body>
      <nav><h1><a href="/" title="share"><span>Image Hub</span></a></h1></nav>
      <div class="image-container">
        ${list(state.images, emit)}
      </div>
      <footer class="footer">
        <button onclick="${loadMore}">LOAD MORE</button>
      </footer>
    </body>`
  return el
}
