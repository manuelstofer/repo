'use strict';
module.exports = function (options) {
    options = options || {};

    var emitter = require('emitter'),
        client  = require('./client'),
        backend = require('../backends/memory'),
        storage = require('../storage'),
        map     = require('mapr').map,
        socket = emitter({}),
        docs;

    if (options.docs) {
        docs = map(options.docs, function (obj, id) {
            obj._id = id;
            return obj;
        });
    }

    storage({
        backend: backend({docs: docs})
    }).addClient(socket);
    return client({socket: socket});
};

