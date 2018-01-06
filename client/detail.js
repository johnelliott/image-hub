const debug = require('debug')('hub:views:detail')
const html = require('choo/html')
const image = require('./image.js')

module.exports = function detail (state, emit) {
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
    ? html`<a next class="lightbox__tap-area" href=/view/${state.images[currentImageIndex + 1].name}></a>`
    : html`<a class="lightbox__tap-area" href=""></a>`
  const previousImageLink = currentImageIndex > 0
    ? html`<a prev class="lightbox__tap-area" href=/view/${state.images[currentImageIndex - 1].name}></a>`
    : html`<a class="lightbox__tap-area" href=""></a>`

  return html`<body>
    <nav><h1 class="heading-light"><a href="/" title="share"><span>Image Hub</span></a></h1></nav>
    <div class="lightbox" onclick=${close}>
      <div class="lightbox__content" >
        <div class="lightbox__menu">
          <a class="lightbox__text" alt="instagram story" href="/stories/${currentImage.name}">ig-story</a>
          <a class="lightbox__text" alt="full size" href="/storage/${currentImage.name}">100%</a>
          <a class="lightbox__text" alt="web size" href="/small/${currentImage.name}">web size</a>
          <a class="lightbox__text" alt="home" href="/">close</a>
        </div>
        <div class="lightbox__slide">
          <a alt="small size" href="/small/${currentImage.name}">
            <img class="lightbox-image" src="/small/${currentImage.name}"/>
          </a>
        </div>
          <a alt="small size" href="/small/${currentImage.name}">
        <div class="lightbox__buttons">
          ${previousImageLink}
          ${nextImageLink}
        </div>
          </a>
        <div class="lightbox__menu lightbox__menu--centered">
          <span class="lightbox__text">${currentImageIndex + 1} of ${state.images.length}</span>
        </div>
      </div>
    </div>
    <div class="image-container">
      <ul>${state.images.map(i => image(i, emit))}</ul>
    </div>
  </body>`
}
