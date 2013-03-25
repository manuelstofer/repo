'use strict';
var emitter = require('emitter'),
    each    = require('foreach'),
    map     = require('mapr').map,
    _       = require('underscore'),
    getQueryId = require('../query-id');

module.exports = function (options) {

    var em = emitter({}),

        socket = options.socket,

        doAsync = function (fn) {
            return function () {
                var args = arguments;
                return setTimeout(function () {
                    fn.apply(null, args);
                }, 0);
            }
        },

        unsubscribe = doAsync(function (_id, fn, send) {
            if (typeof _id === 'undefined') { throw new Error('_id is not defined'); }
            if (fn) { em.off(_id, fn); }

            if (send !== false) {
                socket.emit('unsub', _id);
            }
        }),

        createCallback = function (_id, fn) {
            return function (notification) {
                _id = _id || notification.data._id;

                var handler,

                    isSubscribed = true,

                    unsub = _.once(function () {
                        isSubscribed = false;
                        unsubscribe(_id, handleNotification);
                    }),

                    handleNotification = function (notification) {
                        if (isSubscribed) {
                            if (typeof handler === 'function') {
                                handler(notification);
                            } else {
                                var fn = handler[notification.event];
                                if (fn) {
                                    fn(notification);
                                }
                            }
                        }
                    };

                if (fn) {
                    handler = fn(notification, unsub);
                    if (handler && notification.event !== 'error') {
                        em.on(_id, handleNotification);
                    }
                }
                if (!handler) {
                    unsub();
                }
            };
        },

        api = map({

            get: function (_id, fn) {
                socket.emit('get', _id, createCallback(_id, fn));
            },

            put: function (obj, fn) {
                socket.emit('put', obj, createCallback(obj._id, fn));
            },

            del: function (_id, fn) {
                socket.emit('del', _id, fn);
            },

            query: function (query, callback) {
                socket.emit('query', query, createCallback(getQueryId(query), callback));
            }

        }, doAsync);

    socket.on('notify', function (_id, notification) {
        em.emit(_id, notification);
    });

    return api;
};
