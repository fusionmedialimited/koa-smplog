require('chai').should()
var test = require('ava').test
var st = require('supertest-as-promised')
var koa = require('koa')
var fmt = require('util').format

var log = require('..')

test.beforeEach(function (t) {
  t.context.app = test_server()
})

test('the app should log uncaught errors', function (t) {
  return st(t.context.app.listen(0))
    .get('/throw')
    .expect(500)
    .then(() => {
      var lines = t.context.app.stdout
        .split('\n')
        .filter(Boolean)
        .map(parse_line)
      lines[1].meta.error.message.should.equal('this is an error')
      lines[1].meta.error.name.should.equal('Error')
      lines[1].meta.error.prop1.should.equal('error-prop')
    })
})

function test_server () {
  var app = koa()
  app.stdout = ''
  var logfn = function () { app.stdout += (fmt.apply(null, arguments) + '\n') }
  app.use(log({}, { log: logfn }))
  app.use(throw_err)
  app.on('error', () => {})
  return app
}

function * throw_err (next) {
  var err = new Error('this is an error')
  err.prop1 = 'error-prop'
  throw err
}

function parse_line (line) {
  var format = /\[([^\]]*)\] ([^{]*)([\s\S]*)/gm
  var match = format.exec(line)
  return {
    level: match[1],
    message: match[2].trim(),
    meta: JSON.parse(match[3].trim())
  }
}
