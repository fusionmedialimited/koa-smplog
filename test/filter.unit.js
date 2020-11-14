var { beforeEach, serial: test } = require('ava')
var st = require('supertest')
var koa = require('koa')
var fmt = require('util').format
var intercept = require('intercept-stdout')

var log = require('..')

beforeEach(function (t) {
  t.context.app = test_server()
})

test('the app should support filtering requests', function (t) {
  return st(t.context.app)
    .get('/filtered')
    .expect(200, { success: 'ok' })
    .then(() => {
      t.falsy(t.context.app.stdout)
    })
})

test('the app should not filter loggable requests', function (t) {
  return st(t.context.app)
    .get('/')
    .expect(200, { success: 'ok' })
    .then(() => {
      t.truthy(t.context.app.stdout)
    })
})

function test_server () {
  var app = koa()
  app.use(log({}, { filter: (ctx) => !~ctx.path.indexOf('/filtered') }))
  app.use(respond)
  var server = app.listen()
  var restore = intercept((msg) => {
    server.stdout += msg.replace(/\n$/, '')
    return ''
  })
  server.stdout = ''
  server.on('close', () => restore())
  return server
}

function * respond (next) {
  this.body = { success: 'ok' }
}
