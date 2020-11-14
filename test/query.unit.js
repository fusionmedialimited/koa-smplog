var { beforeEach, afterEach, serial: test } = require('ava')
var st = require('supertest')
var koa = require('koa')
var fmt = require('util').format
var strip_ansi = require('strip-ansi')
var intercept = require('intercept-stdout')

var log = require('..')

beforeEach(function (t) {
  t.context.app = test_server()
})

afterEach(function (t) {
  t.context.app.close()
})

test('the app should drop any query parameters from the log', function (t) {
  return st(t.context.app)
    .get('/query?query=hasaquery')
    .expect(200, { success: 'ok' })
    .then(() => {
      var expected = [
        /\[info]  <─  GET \/query 200 (.*)/
      ]
      t.is(t.context.app.stdout.indexOf('hasaquery'), -1)
      t.context.app.stdout
        .split('\n')
        .filter(Boolean)
        .map(strip_ansi)
        .forEach((line, i) => {
          t.regex(line, expected[i])
        })
    })
})

function test_server () {
  var app = koa()
  app.use(log({}))
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
