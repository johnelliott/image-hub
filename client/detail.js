const html = require('choo/html')
const image = require('./image.js')
const debug = require('debug')('hub:views:detail')

if (global.window) {
  debug('we client side')
}
module.exports = function main (state, emit) {
  debug('state.images.length', state.images.length)
  // debug('detail view for %s', state.params.image)
  const currentImageIndex = state.images.findIndex(i => i.name === state.params.image)
  debug('currentImageIndex', currentImageIndex)
  const currentImage = state.images[currentImageIndex]
  const close = () => {
    debug('close called')
    emit('pushState', '/')
  }
  const nextImageLink = currentImageIndex + 1 < state.images.length
    ? html`<a next class="lightbox__icon" href=/view/${state.images[currentImageIndex + 1].name}>➡️</a>`
    : html`<span class="lightbox__icon"></span>`
  const previousImageLink = currentImageIndex > 0
    ? html`<a prev class="lightbox__icon" href=/view/${state.images[currentImageIndex - 1].name}>⬅️</a>`
    : html`<span class="lightbox__icon">🏠</span>`

  return html`<body>
    <nav><h1><a href="/" title="share"><span>📷 ${state.images ? state.images.length : 0}</span></a></h1></nav>
    <div class="lightbox" onclick=${close}>
      <div class="lightbox-content" >
        <a alt="small size" href="/small/${currentImage.name}">
          <img class="lightbox-image" src="/small/${currentImage.name}"/>
        </a>
        <div class="lightbox__icons">
          <a class="lightbox__icon" alt="home" href="/">🏠</a>
          <a class="lightbox__icon" alt="full size" href="/storage/${currentImage.name}">💯</a>
          <a class="lightbox__icon" alt="small size" href="/small/${currentImage.name}">🖼</a>
          <a class="lightbox__icon" alt="instagram story" href="/stories/${currentImage.name}">↕️</a>
          ${previousImageLink}
          ${nextImageLink}
        </div>
      </div>
    </div>
    <div class="image-container">
      <ul>${state.images.map(i => image(i, emit))}</ul>
    </div>
  </body>`
}
