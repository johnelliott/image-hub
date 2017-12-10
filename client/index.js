const debug = require('debug')('hub:views:app')
debug('initialState', global.window.initialState)
const choo = require('choo')
const html = require('choo/html')
const main = require('./main.js')
const detail = require('./detail.js')

// Choo app
const app = choo()
app.route('/view/:image', detail)
app.route('/:crop/:image', function (state, emit) {
  debug('href', state.href)
  debug('params', state.params)
  return html`<body><img src="${state.href}"></body>`
})
app.route('/', main)

app.use(function (state, emitter) {
  emitter.on('navigate', function () {
    debug('navigate')
  })
  emitter.on('fetch', function () {
    debug('add event')
    debug('about to fetch')
    global.fetch(`/`, {
      headers: {
        Accept: 'application/json'
      }
    })
      .then(res => res.ok ? res : new Error('wtf'))
      .then(res => res.json())
      .then(json => {
        state.images = [].concat(state.images).concat(json)
          .sort((p, c) => p.date > c.date)
        emitter.emit('render')
      })
      .catch(debug)
  })
  // TODO build cursor-based server endpoing then emit fetch with max_id
  //if (!state.images.lenght) {
  //  debug('no images, fetching from server')
  //  emitter.emit('fetch')
  //}
})

debug('mounting app')
app.mount('body')
