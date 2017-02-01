require('chai').should()
var test = require('ava').test
var st = require('supertest')
var koa = require('koa')
var fmt = require('util').format
var strip_ansi = require('strip-ansi')

var log = require('..')

test.beforeEach(function (t) {
  t.context.app = test_server()
})

test('the app should not log incoming requests if incoming=false', function (t) {
  return st(t.context.app.listen(0))
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
        .map(strip_ansi)
        .forEach((line, i) => {
          line.should.match(expected[i])
        })
    })
})

function test_server () {
  var app = koa()
  app.stdout = ''
  var logfn = function () { app.stdout += (fmt.apply(null, arguments) + '\n') }
  app.use(log({}, { log: logfn, incoming: true }))
  app.use(respond)
  return app
}

function * respond (next) {
  this.body = { success: 'ok' }
}
