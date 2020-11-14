var test = require('ava')

var log = require('..')

test('format_time should format times less than 10s as ms', function (t) {
  var start = Date.now() - 1000
  var time = log.format_time(start)
  t.regex(time, /ms/)
})

test('format_time should format times greater than 10s as s', function (t) {
  var start = Date.now() - 30000
  var time = log.format_time(start)
  t.regex(time, /s/)
  t.notRegex(time, /ms/)
})

test('format_length should return an empty string for statuses 204, 205, 304', function (t) {
  [ 204, 205, 304 ].forEach((status) => {
    t.is(log.format_length(10, status), '')
  })
})

test('format_length should return - for an empty length', function (t) {
  t.is(log.format_length(null, 500), '-')
})

test('format_length should format lengths as human-readable bytes', function (t) {
  t.is(log.format_length(1380542, 200), '1.32MB')
})

test('format_error should format errors as JSON objects', function (t) {
  var err = new Error('error test')
  err.name = 'TypedError'
  err.sub = 'value'

  var formatted = log.format_error(err)
  t.is(formatted.name, 'TypedError')
  t.is(formatted.sub, 'value')
  t.is(formatted.message, 'error test')
})

test('format_error should resolve absolute paths in error stacks', function (t) {
  try {
    var err = new Error('error test')
    throw err
  } catch (e) {
    err = e
  }

  var formatted = log.format_error(err)
  t.regex(formatted.stack, /Error: error test\n    at \.\/test\/format\.unit\.js:45:15/gm)
})
