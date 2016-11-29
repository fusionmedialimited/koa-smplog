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

test('the app should log successful responses at the info level', function (t) {
  return st(t.context.app.listen(0))
    .get('/200')
    .expect(200, '200')
    .then(() => {
      var expected = [
        /\[info]  <─  GET \/200 200 (.*)/
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

test('the app should log 400 >= status < 500 responses at the warn level', function (t) {
  return st(t.context.app.listen(0))
    .get('/403')
    .expect(403, '403')
    .then(() => {
      var expected = [
        /\[warn]  <─  GET \/403 403 (.*)/
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

test('the app should log 500 >= status responses at the error level', function (t) {
  return st(t.context.app.listen(0))
    .get('/500')
    .expect(500, '500')
    .then(() => {
      var expected = [
        /\[error] <─  GET \/500 500 (.*)/
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
  app.use(log({}, { log: logfn }))
  app.use(echo_status)
  return app
}

function * echo_status (next) {
  var status = this.originalUrl.slice(1)
  this.status = +status
  if (status) this.body = status
  else yield next
}
