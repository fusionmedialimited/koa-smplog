require('chai').should()
var test = require('ava').test
var st = require('supertest-as-promised')
var koa = require('koa')
var fmt = require('util').format

var log = require('..')

test.beforeEach(function (t) {
  t.context.app = test_server()
})

test('the app should add tags set in previous middleware to the request-end log message', function (t) {
  return st(t.context.app.listen(0))
    .get('/200')
    .expect(200, '200')
    .then(() => {
      var expected = /"tag":"tag"/
      t.context.app.stdout.split('\n')[0].should.match(expected)
    })
})

function test_server () {
  var app = koa()
  app.stdout = ''
  var logfn = function () { app.stdout += (fmt.apply(null, arguments) + '\n') }
  app.use(log({}, { log: logfn }))
  app.use(add_tag)
  app.use(echo_status)
  return app
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
