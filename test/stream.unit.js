require('chai').should()
var test = require('ava').test
var st = require('supertest-as-promised')
var koa = require('koa')
var fmt = require('util').format
var fs = require('fs')
var path = require('path')

var log = require('..')

test.beforeEach(function (t) {
  t.context.app = test_server()
})

test('the app should log the response size of streamed data', function (t) {
  return st(t.context.app.listen(0))
    .get('/')
    .expect(200, '200\n')
    .then(() => {
      var expected = /"response_size_bytes":4/
      t.context.app.stdout.split('\n')[0].should.match(expected)
    })
})

function test_server () {
  var app = koa()
  app.stdout = ''
  var logfn = function () { app.stdout += (fmt.apply(null, arguments) + '\n') }
  app.use(log({}, { log: logfn }))
  app.use(send_stream)
  return app
}

function * send_stream (next) {
  this.body = fs.createReadStream(path.join(__dirname, 'stream.txt'))
}
