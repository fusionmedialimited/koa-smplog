require('chai').should()
var test = require('ava').test
var st = require('supertest-as-promised')
var koa = require('koa')
var fmt = require('util').format
var strip_ansi = require('strip-ansi')

var log = require('..')

test.beforeEach(function (t) {
  t.context.app = test_server()
})

test('the app should drop any query parameters from the log', function (t) {
  return st(t.context.app.listen(0))
    .get('/query?query=hasaquery')
    .expect(200, { success: 'ok' })
    .then(() => {
      var expected = [
        /\[info\] {3}--> GET \/query 200 (.*)/
      ]
      t.context.app.stdout.indexOf('hasaquery').should.equal(-1)
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
  app.use(log({}, { log: logfn }))
  app.use(respond)
  return app
}

function * respond (next) {
  this.body = { success: 'ok' }
}
