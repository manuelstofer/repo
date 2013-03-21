'use strict';
var emitter = require('emitter'),
    each    = require('foreach');

module.exports = function (options) {

    var em = emitter({}),
        socket = options.socket,

        // tracks the number of subscriptions by object _id
        subscriptionCount = {},

        createCallback = function (_id, fn) {
            return function (notification) {
                var subFn;
                _id = _id || notification.data._id;
                subscriptionCount[_id] = (subscriptionCount[_id] || 0) + 1;
                if (fn) {
                    subFn = fn(notification);
                    if (notification.action !== 'error' && typeof subFn === 'function') {

                        em.on(_id, subFn);
                        return;
                    }
                }
                api.unsub(_id);
            };
        },

        doAsync = function (fn) {
            return function () {
                var args = arguments;
                return setTimeout(function () {
                    fn.apply(null, args);
                }, 0);
            }
        },

        api = {

            get: doAsync(function (_id, fn) {
                socket.emit('get', _id, createCallback(_id, fn));
            }),

            put: doAsync(function (obj, fn) {
                socket.emit('put', obj, createCallback(obj._id, fn));
            }),

            del: doAsync(function (_id, fn) {
                socket.emit('del', _id, fn);
            }),

            unsub: doAsync(function (_id, fn) {
                if (fn) { em.off(_id, fn); }
                if (--subscriptionCount[_id] === 0) {
                    socket.emit('unsub', _id);
                }
            })
        };

    socket.on('notify', function (_id, obj) {
        em.emit(_id, obj);
    });

    return api;
};
