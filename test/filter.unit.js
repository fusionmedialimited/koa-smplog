require('chai').should()
var test = require('ava').test
var st = require('supertest-as-promised')
var koa = require('koa')
var fmt = require('util').format

var log = require('..')

test.beforeEach(function (t) {
  t.context.app = test_server()
})

test('the app should support filtering requests', function (t) {
  return st(t.context.app.listen(0))
    .get('/filtered')
    .expect(200, { success: 'ok' })
    .then(() => {
      t.context.app.stdout.should.equal('')
    })
})

test('the app should not filter loggable requests', function (t) {
  return st(t.context.app.listen(0))
    .get('/')
    .expect(200, { success: 'ok' })
    .then(() => {
      t.context.app.stdout.should.not.equal('')
    })
})

function test_server () {
  var app = koa()
  app.stdout = ''
  var logfn = function () { app.stdout += (fmt.apply(null, arguments) + '\n') }
  app.use(log({}, { log: logfn, filter: (ctx) => !~ctx.path.indexOf('/filtered') }))
  app.use(respond)
  return app
}

function * respond (next) {
  this.body = { success: 'ok' }
}
