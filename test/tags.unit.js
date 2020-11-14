var { beforeEach, serial: test } = require('ava')
var st = require('supertest')
var koa = require('koa')
var fmt = require('util').format
var intercept = require('intercept-stdout')

var log = require('..')

beforeEach(function (t) {
  t.context.app = test_server()
})

test('the app should add tags set in previous middleware to the request-end log message', function (t) {
  return st(t.context.app)
    .get('/200')
    .expect(200, '200')
    .then(() => {
      var expected = /"tag":"tag"/
      t.regex(t.context.app.stdout.split('\n')[0], expected)
    })
})

function test_server () {
  var app = koa()
  app.use(log({}))
  app.use(add_tag)
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

function * add_tag (next) {
  this.log.tag({ tag: 'tag' })
  yield next
}

function * echo_status (next) {
  var status = this.originalUrl.slice(1)
  this.status = +status
  if (status) this.body = status
  else yield next
}
