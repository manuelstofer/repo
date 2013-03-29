'use strict';
var express     = require('express'),
    app         = express(),
    path        = require('path'),
    http        = require('http'),
    mongodb     = require('mongodb'),
    server      = http.createServer(app),
    io          = require('socket.io').listen(server),
    storage     = require('../src/storage'),

    mongo       = require('../src/backends/mongo'),
    mongoServer = new mongodb.Server('localhost', mongodb.Connection.DEFAULT_PORT),
    connector   = new mongodb.Db(
        'test',
        mongoServer,
        {
            safe: true
        }
    );

io.set('log level', 1);

connector.open(function (error, client) {
    var collection = new mongodb.Collection(client, 'test');
    console.log('connected to mongodb');

    collection.remove({}, function () {
        var storageApi = storage({
            backend: mongo({
                collection: collection,
                sequential: true
            }),
            debug: true
        });

        io.sockets.on(
            'connection',
            storageApi.addClient
        );
    });
});


app.configure(function () {
    app.use(express.logger('dev'));
    app.use(express.static(path.dirname(__dirname)));
});

app.configure('development', function(){
    app.use(express.errorHandler());
});

server.listen(2014);
