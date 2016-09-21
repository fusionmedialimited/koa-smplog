require('chai').should()
var test = require('ava').test

var log = require('..')

test('format_time should format times less than 10s as ms', function (t) {
  var start = Date.now() - 1000
  var time = log.format_time(start)
  time.should.contain('ms')
})

test('format_time should format times greater than 10s as s', function (t) {
  var start = Date.now() - 30000
  var time = log.format_time(start)
  time.should.contain('s')
  time.should.not.contain('ms')
})

test('format_length should return an empty string for statuses 204, 205, 304', function (t) {
  [ 204, 205, 304 ].forEach((status) => {
    log.format_length(10, status).should.equal('')
  })
})

test('format_length should return - for an empty length', function (t) {
  log.format_length(null, 500).should.equal('-')
})

test('format_length should format lengths as human-readable bytes', function (t) {
  log.format_length(1380542, 200).should.equal('1.32MB')
})

test('format_error should format errors as JSON objects', function (t) {
  var err = new Error('error test')
  err.name = 'TypedError'
  err.sub = 'value'

  var formatted = log.format_error(err)
  formatted.name.should.equal('TypedError')
  formatted.sub.should.equal('value')
  formatted.message.should.equal('error test')
})

test('format_error should resolve absolute paths in error stacks', function (t) {
  try {
    var err = new Error('error test')
    throw err
  } catch (e) {
    err = e
  }

  var formatted = log.format_error(err)
  formatted.stack.should.contain(`Error: error test
    at Test.fn (./test/format.unit.js:46:15)`)
})
