'use strict';
module.exports = function (options) {
    options = options || {};

    var emitter = require('emitter'),
        client  = require('./client'),
        backend = require('../backends/memory'),
        storage = require('../storage'),
        map     = require('mapr').map,
        socket = emitter({}),
        data;

    if (options.data) {
        data = map(options.data, function (obj, id) {
            obj._id = id;
            return obj;
        });
    }

    storage({
        backend: backend({data: data})
    }).addClient(socket);
    return client({socket: socket});
};

