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

test('the app should add a trace id to all messages logged in a request context', function (t) {
  return st(t.context.app.listen(0))
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
          line.should.match(expected)
          if (trace) trace.should.equal(expected.exec(line)[1])
          trace = expected.exec(line)[1]
        })
    })
})

test('the app should reuse a trace id specified in x-smplog-trace header', function (t) {
  return st(t.context.app.listen(0))
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
          line.should.match(expected)
        })
    })
})

test('the app should reuse a trace id specified by previous middleware', function (t) {
  return st(t.context.app.listen(0))
    .get('/preset-trace')
    .expect(200)
    .then(() => {
      var expected = /"smplog_trace":"preset-trace"/
      t.context.app.stdout
        .split('\n')
        .filter(Boolean)
        .map(strip_ansi)
        .forEach((line, i) => {
          line.should.match(expected)
        })
    })
})

function test_server () {
  var app = koa()
  app.stdout = ''
  var logfn = function () { app.stdout += (fmt.apply(null, arguments) + '\n') }
  app.use(set_trace)
  app.use(log({}, { log: logfn }))
  app.use(log_message)
  app.use(echo_status)
  return app
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
