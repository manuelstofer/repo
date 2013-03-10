'use strict';
var _ = require('underscore');

module.exports = function storage (options) {

    var backend         = options.backend,
        io              = options.io,
        subscriptions   = {};

    io.sockets.on('connection', function (socket) {

        var subscribe = function (id, fn) {
                if (fn) {
                    subscriptions[id] = subscriptions[id] || [];
                    subscriptions[id].push(socket);
                    subscriptions[id] = _.uniq(subscriptions[id]);
                }
            },

            notify = function (obj) {
                _.each(subscriptions[obj.id] || [], function (socket) {
                    socket.emit('notify', obj);
                });
            };

        socket.on('put', function (obj, fn) {
            var action = obj.id ? 'change' : 'create';
            backend.put(obj, function (err, obj) {
                var notification = {
                    action: err? 'error': action,
                    id: obj.id,
                    data: obj
                };
                if (fn) { fn(notification); }
                notify(notification);
                subscribe(obj.id, fn);
            });
        });

        socket.on('get', function (id, fn) {
            subscribe(id);
            backend.get(id, function (err, obj) {
                var notification = {
                    action: err? 'error': 'get',
                    id: id,
                    data: obj
                };
                if (fn) {
                    fn(notification);
                }
            });
        });


        socket.on('del', function (id, fn) {
            console.log('del: ', id);
            backend.del(id, function (err) {
                console.log('callback called');
                var notification = {
                    action: err? 'error': 'del',
                    id: id
                };
                console.log('notification', notification);
                if (fn) {
                    fn(notification);
                }
                notify(notification);
                delete subscriptions[id];
            });
        });



        socket.on('unsub', function (id) {
            subscriptions[id] = _.without(subscriptions[id], socket);
        });
    });
};

