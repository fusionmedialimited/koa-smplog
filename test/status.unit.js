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

test('the app should log successful responses at the info level', function (t) {
  return st(t.context.app)
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
          t.regex(line, expected[i])
        })
    })
})

test('the app should log 400 >= status < 500 responses at the warn level', function (t) {
  return st(t.context.app)
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
          t.regex(line, expected[i])
        })
    })
})

test('the app should log 500 >= status responses at the error level', function (t) {
  return st(t.context.app)
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
          t.regex(line, expected[i])
        })
    })
})

function test_server () {
  var app = koa()
  app.use(log({}))
  app.use(echo_status)
  var server = app.listen()
  var restore = intercept((msg) => {
    server.stdout += msg.replace(/\n$/, '')
    return ''
  })
  server.stdout = ''
  server.on('close', () => restore())
  return server
}

function * echo_status (next) {
  var status = this.originalUrl.slice(1)
  this.status = +status
  if (status) this.body = status
  else yield next
}
