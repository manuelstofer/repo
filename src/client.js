'use strict';
var emitter = require('emitter'),
    each    = require('foreach'),
    map     = require('mapr').map;

module.exports = function (options) {

    var em = emitter({}),
        socket = options.socket,

        addObjectNotificationCallBack = function (_id, subFn) {
            em.on(_id, subFn);
        },

        createObjectCallback = function (_id, fn) {
            return function (notification) {
                var subFn;
                _id = _id || notification.data._id;
                if (fn) {
                    subFn = fn(notification);
                    if (notification.action !== 'error' && typeof subFn === 'function') {
                        addObjectNotificationCallBack(_id, subFn);
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

        api = map({

            get: function (_id, fn) {
                socket.emit('get', _id, createObjectCallback(_id, fn));
            },

            put: function (obj, fn) {
                socket.emit('put', obj, createObjectCallback(obj._id, fn));
            },

            del: function (_id, fn) {
                socket.emit('del', _id, fn);
            },

            query: function (query, fn) {
                socket.emit('query', query, function (notification) {
                    var objs = notification.data,
                        notificationFns = fn(notification);

                    each(notificationFns, function (fn, index) {
                        var _id = objs[index]._id;
                        addObjectNotificationCallBack(_id, fn);
                    });

                    each(objs, function (obj, index) {
                        if (!notificationFns || !notificationFns[index]) {
                            api.unsub(obj._id);
                        }
                    });
                });
            },

            unsub: function (_id, fn) {
                if (fn) { em.off(_id, fn); }
                socket.emit('unsub', _id);
            }
        }, doAsync);

    socket.on('notify', function (_id, obj) {
        em.emit(_id, obj);
    });

    return api;
};
