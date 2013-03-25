'use strict';
module.exports = function () {

    var emitter = require('emitter'),
        client  = require('./client'),
        backend = require('../backends/memory'),
        storage = require('../storage'),
        socket = emitter({});

    storage({ backend: backend() }).addClient(socket);
    return client({socket: socket});
};

