# koa-smplog

#### Simple request logging for [koa](https://github.com/koajs/koa) using [finboxio/smplog](https://github.com/finboxio/smplog)

### Usage

```
var Koa = require('koa')
var Log = require('koa-smplog')

// These are default tags you want added to each log line
var defaults = { app: 'my-app' }

var app = Koa()
app.use(Log(defaults))
```

### Features

##### Logging
`koa-smplog` will generate a pair of log lines for each received request (one for the request, one for the response) in a similar format to [koajs/logger](https://github.com/koajs/logger), but extended to support [finboxio/smplog](https://github.com/finboxio/smplog) metadata and logging levels:

```
[info]   <-- GET /200 {"trace":"1474401843764ic0stbr8","event":"request-start"}
[info]   --> GET /200 200 10ms 3B {"trace":"1474401843764ic0stbr8","event":"request-end","method":"GET","url":"/200","status_code":200,"response_time_ms":10,"response_size_bytes":3}
```

Responses with status codes in the 4xx range will be logged at the `warn` level, while uncaught errors and responses with 5xx status codes will be logged at the `error` level.

Each logged response will include details about the response size, status, duration, path, and method.

If an error is thrown in the request context, a full JSON description of that error (including the stack trace) will be included in the metadata of the response log line.

##### Tracing
`koa-smplog` will also automatically generate a trace-id for every incoming request. Any log messages emitted within that request context will include this trace id, and is useful for filtering out individual request streams. If the `x-request-trace` header is included in the request, or `this.smplog_trace` is previously set on the context, koa-smplog will use this trace id instead of generating a new one. This is primarily to enable tracing individual requests across service boundaries.

##### Tagging
`koa-smplog` exposes a log instance to subsequent middleware as `this.log`. This can be used to log request details with the trace-id attached. It can also be tagged using `this.log.tag({ prop: 'val', ... })`. These tags will be added to the metadata of the final response message. Tags are accumulated, so you can tag multiple times from multiple middleware functions.


