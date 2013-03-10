'use strict';
var emitter = require('emitter');

module.exports = function (options) {

    var em = emitter({}),
        socket = options.socket,

        subscriptions = {},

        createCallback = function (fn) {
            return function (notification) {
                var subFn;
                subscriptions[notification.id] = (subscriptions[notification.id] || 0) + 1;
                if (fn ) {
                    subFn = fn(notification);
                    if (notification.action !== 'error' && typeof subFn === 'function') {
                        return em.on(notification.id, subFn);
                    }
                }
                api.unsub(notification.id);
            };
        },

        api = {

            get: function (obj, fn) {
                socket.emit('get', obj, createCallback(fn));
            },

            put: function (id, fn) {
                socket.emit('put', id, createCallback(fn));
            },

            del: function (id, fn) {
                socket.emit('del', id, fn);
            },

            unsub: function (id, fn) {
                if(fn) { em.off(id, fn); }
                subscriptions[id]--;
                if (subscriptions[id] === 0) {
                    socket.emit('unsub', id);
                }
            }
        };

    socket.on('notify', function (obj) {
        em.emit(obj.id, obj);
    });

    return api;
};
