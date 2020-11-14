var { beforeEach, serial: test } = require('ava')
var st = require('supertest')
var koa = require('koa')
var mount = require('koa-mount')
var fmt = require('util').format
var strip_ansi = require('strip-ansi')
var intercept = require('intercept-stdout')

var log = require('..')

beforeEach(function (t) {
  t.context.app = test_server()
})

test('the app should not log duplicate lines when a logging apps are mounted', function (t) {
  return st(t.context.app)
    .get('/mount')
    .expect(200, { success: 'ok' })
    .then(() => {
      var expected = [
        /\[info]  <─  GET \/mount 200 (.*)"mount":"mounted"(.*)/
      ]
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
  var mounted = koa()
  mounted.use(log({ mount: 'mounted' }))
  mounted.use(respond)

  var app = koa()
  app.use(log({}))
  app.use(mount('/mount', mounted))
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
