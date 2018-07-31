require('chai').should()
var test = require('ava').test
var st = require('supertest')
var koa = require('koa')
var fmt = require('util').format
var strip = require('chalk').stripColor

var log = require('..')

test('the app should log uncaught errors', function (t) {
  const app = test_server()
  return st(app.listen(0))
    .get('/throw')
    .expect(500)
    .then(() => {
      var lines = app.stdout
        .split('\n')
        .filter(Boolean)
        .map(parse_line)
      lines[0].meta.error.message.should.equal('this is an error')
      lines[0].meta.error.name.should.equal('Error')
      lines[0].meta.error.prop1.should.equal('error-prop')
      lines[0].meta.error.longline.length.should.equal(255)
      lines[0].meta.error.should.not.have.property('nested.n.n')
      lines[0].meta.error.should.not.have.property('toonested.n.n.n')
    })
})

test('the app should use custom error formatters', function (t) {
  const app = test_server({ format_error: (err) => ({ name: err.name }) })
  return st(app.listen(0))
    .get('/throw')
    .expect(500)
    .then(() => {
      var lines = app.stdout
        .split('\n')
        .filter(Boolean)
        .map(parse_line)
      lines[0].meta.error.should.deep.equal({ name: 'Error' })
    })
})

function test_server (opts = {}) {
  var app = koa()
  app.stdout = ''
  var logfn = function () { app.stdout += (fmt.apply(null, arguments) + '\n') }
  opts.log = logfn
  app.use(log({}, opts))
  app.use(throw_err)
  app.on('error', () => {})
  return app
}

function * throw_err (next) {
  var err = new Error('this is an error')
  err.prop1 = 'error-prop'
  err.nested = { n: { n: 1 } }
  err.toonested = { n: { n: { n: { n: 1 } } } }
  err.longline = '********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************'
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
