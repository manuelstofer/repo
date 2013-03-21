'use strict';
var _ = require('underscore');

module.exports = function storage (options) {

    var backend         = options.backend,
        io              = options.io,

        // sockets subscribed to an object
        subscriptions   = {},

        // sockets subscribed to a query
        querySubscriptions = {};


    io.sockets.on('connection', function (socket) {

        var subscribe = function (_id) {
                subscriptions[_id] = subscriptions[_id] || [];
                subscriptions[_id].push(socket);
                subscriptions[_id] = _.uniq(subscriptions[_id]);
            },

            notify = function (_id, notification) {
                console.log(notification);
                _.each(subscriptions[_id] || [], function (socket) {
                    console.log('notify', notification);
                    socket.emit('notify', _id, notification);
                });
            };

        socket.on('put', function (obj, fn) {
            var action = obj._id ? 'change' : 'create';
            backend.put(obj, function (err, obj) {
                var notification = {
                    action: err? 'error': action,
                    data: obj
                };
                if (fn) { fn(notification); }
                notify(obj._id, notification);
                subscribe(obj._id);
            });
        });

        socket.on('get', function (_id, fn) {
            subscribe(_id);
            backend.get(_id, function (err, obj) {
                var notification = {
                    action: err? 'error': 'get',
                    data: obj
                };
                if (fn) {
                    fn(notification);
                }
            });
        });


        socket.on('del', function (_id, fn) {
            backend.del(_id, function (err) {
                var notification = {
                    action: err? 'error': 'del'
                };

                notify(_id, notification);
                delete subscriptions[_id];
                if (fn) {
                    fn(notification);
                }
            });
        });

        socket.on('unsub', function (_id) {
            subscriptions[_id] = _.without(subscriptions[_id], socket);
        });
    });
};

