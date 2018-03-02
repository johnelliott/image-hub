const debug = require('debug')('hub:views:app')
debug('initialState', global.window.initialState)
const choo = require('choo')
const html = require('choo/html')
const grid = require('./grid.js')
const detail = require('./detail.js')

global.document.addEventListener('touchstart', () => true)

// Choo app
const app = choo()
app.route('/view/:image', detail)
app.route('/:crop/:image', function (state, emit) {
  debug('href', state.href)
  debug('params', state.params)
  return html`<body><img src="${state.href}"></body>`
})
app.route('/', grid)

app.use(function (state, emitter) {
  emitter.on('navigate', function () {
    debug('navigate')
  })
  emitter.on('fetch', function () {
    debug('add event')
    // TODO is such a check needed anymore?
    const sinceQuery = state && state.images && state.images.length > 0 ? `?since=${state.images[state.images.length - 1].name}` : ''
    debug('sinceQuery', sinceQuery)
    global.fetch(`/${sinceQuery}`, {
      headers: {
        Accept: 'application/json'
      }
    })
      .then(res => res.ok ? res : new Error('wtf'))
      .then(res => res.json())
      .then(json => {
        debug('fetched images', `${json[0].name} through ${json[json.length - 1].name}`)
        state.images = [].concat(state.images).concat(json)
        emitter.emit('render')
      })
      .catch(debug)
  })
})

debug('mounting app')
app.mount('body')
