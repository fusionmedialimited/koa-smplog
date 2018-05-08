require('chai').should()
var test = require('ava').test
var st = require('supertest')
var koa = require('koa')
var fmt = require('util').format
var strip = require('chalk').stripColor

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
      lines[0].meta.error.message.should.equal('this is an error')
      lines[0].meta.error.name.should.equal('Error')
      lines[0].meta.error.prop1.should.equal('error-prop')
      lines[0].meta.error.should.not.have.property('nested.n.n')
      lines[0].meta.error.should.not.have.property('toonested.n.n.n')
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
  err.nested = { n: { n: 1 } }
  err.toonested = { n: { n: { n: { n: 1 } } } }
  throw err
}

function parse_line (line) {
  var format = /\[([^\]]*)]\s+([^{]*)([\s\S]*)/gm
  var match = format.exec(strip(line))
  return {
    level: match[1],
    message: match[2].trim(),
    meta: JSON.parse(match[3].trim())
  }
}
