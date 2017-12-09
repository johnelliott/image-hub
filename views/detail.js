const html = require('choo/html')
const image = require('./image.js')
const debug = require('debug')('hub:views:detail')

module.exports = function main (state, emit) {
  debug('detail view for %s', state.params.image)
  // debug('images', state.images)
  const currentImageIndex = state.images.findIndex(i => i.name === state.params.image)
  debug('currentImageIndex', currentImageIndex)

  // hacks
  const i = state.images[currentImageIndex]
  const close = () => {
    debug('close called')
    emit('pushState', '/')
  }
  // end hacks
  const nextImage = currentImageIndex + 1 < state.images.length
    ? html`<a class="image-thumb__icon" href=/view/${state.images[currentImageIndex + 1].name}>➡️</a>`
    : html`<span class="image-thumb__icon">🤷‍♂️</span>`
  const previousImage = currentImageIndex > 0
    ? html`<a class="image-thumb__icon" href=/view/${state.images[currentImageIndex - 1].name}>⬅️</a>`
    : html`<span class="image-thumb__icon">🤷‍</span>`

  return html`<body>
    <nav><h1><a href="/" title="share"><span>📷 ${state.images ? state.images.length : 0}</span></a></h1></nav>
    <div class="lightbox" onclick=${close}>
      <div class="lightbox-content" >
        <a alt="small size" href="/small/${i.name}">
          <img class="lightbox-image" src="/small/${i.name}"/>
        </a>
        <div class="image-thumb__crops">
          ${previousImage}
          <a class="image-thumb__icon" alt="full size" href="/storage/${i.name}">💯</a>
          <a class="image-thumb__icon" alt="small size" href="/small/${i.name}">🖼</a>
          <a class="image-thumb__icon" alt="instagram story" href="/stories/${i.name}">↕️</a>
          ${nextImage}
        </div>
      </div>
    </div>
    <div class="image-container">
      <ul>${state.images.map(i => image(i, emit))}</ul>
    </div>
    <footer class="footer">
      <a href="/">🏠</a>
      <a href="#">🔝</a>
      <a href="/all">📅</a>
    </footer>
  </body>`
}
