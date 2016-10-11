require('chai').should()
var test = require('ava').test
var st = require('supertest-as-promised')
var koa = require('koa')
var mount = require('koa-mount')
var fmt = require('util').format
var strip_ansi = require('strip-ansi')

var log = require('..')

test.beforeEach(function (t) {
  t.context.app = test_server()
})

test('the app should not log duplicate lines when a logging apps are mounted', function (t) {
  return st(t.context.app.listen(0))
    .get('/mount')
    .expect(200, { success: 'ok' })
    .then(() => {
      var expected = [
        /\[info\] {3}--> GET \/mount 200 (.*)"mount":"mounted"(.*)/
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
  var mounted = koa()
  app.stdout = ''
  var logfn = function () { app.stdout += (fmt.apply(null, arguments) + '\n') }
  mounted.use(log({ mount: 'mounted' }, { log: logfn }))
  mounted.use(respond)
  app.use(log({}, { log: logfn }))
  app.use(mount('/mount', mounted))
  return app
}

function * respond (next) {
  this.body = { success: 'ok' }
}
