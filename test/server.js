'use strict';
var express     = require('express'),
    app         = express(),
    path        = require('path'),
    http        = require('http'),
    server      = http.createServer(app),
    io          = require('socket.io').listen(server),
    storage     = require('../server/storage'),
    backend     = require('../server/backends/memory');

storage({
    io: io,
    backend: backend()
});

app.configure(function () {
    app.use(express.logger('dev'));
    app.use(express.static(path.dirname(__dirname)));
});

app.configure('development', function(){
    app.use(express.errorHandler());
});

server.listen(2014);
