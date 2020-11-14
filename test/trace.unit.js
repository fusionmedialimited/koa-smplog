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

test('the app should add a trace id to all messages logged in a request context', function (t) {
  return st(t.context.app)
    .get('/200')
    .expect(200, '200')
    .then(() => {
      var trace
      var expected = /"smplog_trace":"([0-9A-Za-z]+)"/
      t.context.app.stdout
        .split('\n')
        .filter(Boolean)
        .map(strip_ansi)
        .forEach((line, i) => {
          t.regex(line, expected)
          if (trace) t.is(trace, expected.exec(line)[1])
          trace = expected.exec(line)[1]
        })
    })
})

test('the app should reuse a trace id specified in x-smplog-trace header', function (t) {
  return st(t.context.app)
    .get('/200')
    .set('X-Smplog-Trace', 'request1')
    .expect(200, '200')
    .then(() => {
      var expected = /"smplog_trace":"request1"/
      t.context.app.stdout
        .split('\n')
        .filter(Boolean)
        .map(strip_ansi)
        .forEach((line, i) => {
          t.regex(line, expected)
        })
    })
})

test('the app should reuse a trace id specified by previous middleware', function (t) {
  return st(t.context.app)
    .get('/preset-trace')
    .expect(200)
    .then(() => {
      var expected = /"smplog_trace":"preset-trace"/
      t.context.app.stdout
        .split('\n')
        .filter(Boolean)
        .map(strip_ansi)
        .forEach((line, i) => {
          t.regex(line, expected)
        })
    })
})

function test_server () {
  var app = koa()
  app.use(set_trace)
  app.use(log({}))
  app.use(log_message)
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

function * set_trace (next) {
  if (this.originalUrl === '/preset-trace') this.smplog_trace = 'preset-trace'
  yield next
}

function * log_message (next) {
  this.log.info('test message', { test: 1 })
  yield next
}

function * echo_status (next) {
  var status = this.originalUrl.slice(1)
  this.status = +status || 200
  this.body = status
}
