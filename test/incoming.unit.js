var { beforeEach, serial: test } = require('ava')
var st = require('supertest')
var koa = require('koa')
var fmt = require('util').format
var strip_ansi = require('strip-ansi')
var intercept = require('intercept-stdout')

var log = require('..')

beforeEach(function (t) {
  t.context.app = test_server()
})

test('the app should log incoming requests if incoming=true', function (t) {
  return st(t.context.app)
    .get('/')
    .expect(200, { success: 'ok' })
    .then(() => {
      var expected = [
        /\[info]  >┐  GET \/ (.*)/,
        /\[info]  <┘  GET \/ 200 (.*)/
      ]
      t.context.app.stdout
        .split('\n')
        .filter(Boolean)
        .filter((s) => !s.match(/DeprecationWarning/))
        .map(strip_ansi)
        .forEach((line, i) => {
          t.regex(line, expected[i])
        })
    })
})

function test_server () {
  var app = koa()
  app.use(log({}, { incoming: true }))
  app.use(respond)
  var server = app.listen()
  var restore = intercept((msg) => {
    server.stdout += msg
    return ''
  })
  server.stdout = ''
  server.on('close', () => restore())
  return server
}

function * respond (next) {
  this.body = { success: 'ok' }
}
